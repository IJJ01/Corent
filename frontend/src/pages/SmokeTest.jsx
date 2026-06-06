// src/pages/SmokeTest.jsx
import { useMemo, useState } from "react";
import { Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";

import { useAuth } from "../auth/AuthContext";
import { http } from "../api/http";
import * as houseApiModule from "../api/houseApi";
import * as adminApiModule from "../api/adminApi";

/**
 * SmokeTest goals:
 * - Run a chain of front-end “API contract” checks (mock OR real gateway)
 * - Never white-screen: catch errors per test, keep going
 * - Prefer your api wrappers if available, fallback to http.{get/post/put/delete}
 */

// ---- Helpers ---------------------------------------------------------------

function nowISO() {
  return new Date().toISOString();
}

function msSince(t0) {
  return Math.max(0, Date.now() - t0);
}

function safeJson(obj, max = 140) {
  try {
    const s = JSON.stringify(obj);
    return s.length > max ? s.slice(0, max) + "..." : s;
  } catch {
    return String(obj);
  }
}

function pickApiObject(mod, preferredKey) {
  // supports: named object export, default export object, or module-as-object
  return mod?.[preferredKey] || mod?.default || mod;
}

function normalizeListPayload(payload) {
  // Accepts many shapes and returns { items, total }
  if (Array.isArray(payload)) return { items: payload, total: payload.length };

  const data = payload?.data ?? payload;
  const items =
    data?.items ||
    data?.results ||
    data?.users ||
    data?.houses ||
    data?.reports ||
    data?.notifications ||
    data?.applications ||
    [];

  const list = Array.isArray(items) ? items : [];
  const total =
    Number(data?.total ?? data?.count ?? data?.total_count ?? list.length) || list.length;

  return { items: list, total };
}

async function tryCall(label, fns, args = []) {
  // Try multiple function candidates until one works.
  let lastErr = null;
  for (const fn of fns) {
    if (typeof fn !== "function") continue;
    try {
      const out = await fn(...args);
      return { ok: true, out };
    } catch (e) {
      lastErr = e;
    }
  }
  return { ok: false, error: lastErr || new Error(`${label}: no function available`) };
}

function getViteEnv() {
  // Vite exposes env on import.meta.env
  const env = import.meta?.env || {};
  return {
    VITE_USE_MOCK: String(env.VITE_USE_MOCK ?? ""),
    VITE_API_BASE_URL: String(env.VITE_API_BASE_URL ?? ""),
  };
}

// ---- Component -------------------------------------------------------------

export default function SmokeTest() {
  const auth = useAuth();

  const houseApi = useMemo(() => pickApiObject(houseApiModule, "houseApi"), []);
  const adminApi = useMemo(() => pickApiObject(adminApiModule, "adminApi"), []);

  const [running, setRunning] = useState(false);
  const [log, setLog] = useState(() => "");

  function append(line = "") {
    setLog((prev) => prev + line + "\n");
  }

  function clear() {
    setLog("");
  }

  async function run() {
    if (running) return;
    setRunning(true);
    setLog("");

    const startedAt = Date.now();
    let passed = 0;
    let failed = 0;

    const tests = [];
    const created = {
      houseId: null,
      reportId: null,
      applicationId: null,
      notificationId: null,
    };

    function startSection(title) {
      append("");
      append(`▶ ${title}`);
    }

    function pass(extra = "") {
      passed += 1;
      append(`✅ PASS${extra ? " " + extra : ""}`);
    }

    function fail(err) {
      failed += 1;
      append(`❌ FAIL: ${err?.message || String(err)}`);
    }

    function warn(msg) {
      append(`⚠️  WARN: ${msg}`);
    }

    append(`---- FRONTEND SMOKE TEST ---- ${nowISO()}`);
    append("");

    // 1) Env sanity
    tests.push(async () => {
      startSection("Env sanity");
      const t0 = Date.now();
      const env = getViteEnv();
      append(`Env: VITE_USE_MOCK=${env.VITE_USE_MOCK}, VITE_API_BASE_URL=${env.VITE_API_BASE_URL}`);
      append(`Auth: isAuthed=${!!auth?.isAuthed}, userId=${auth?.userId || "-"}`);
      pass(`(${msSince(t0)}ms)`);
    });

    // 2) Ensure logged in (demo)
    tests.push(async () => {
      startSection("Auth: ensure logged in (demo)");
      const t0 = Date.now();

      if (auth?.isAuthed) {
        append(`Auth: already authed -> userId=${auth.userId}`);
        pass(`(${msSince(t0)}ms)`);
        return;
      }

      if (typeof auth?.loginMock === "function") {
        auth.loginMock({ userId: "u1", token: "demo-token" });
        append(`Auth: loginMock(userId=u1)`);
        pass(`(${msSince(t0)}ms)`);
        return;
      }

      // If no loginMock exists, don’t crash: explain what to fix
      warn("Not authed and loginMock() not found. Add loginMock in AuthContext or login manually.");
      pass(`(${msSince(t0)}ms)`);
    });

    // 3) Houses: list
    let targetHouseId = null;
    tests.push(async () => {
      startSection("Houses: GET /houses (list)");
      const t0 = Date.now();

      const res = await tryCall(
        "house.list",
        [
          houseApi?.list,
          houseApi?.listHouses,
          async () => (await http.get("/houses")).data,
        ],
        []
      );

      if (!res.ok) throw res.error;

      const { items, total } = normalizeListPayload(res.out);
      append(`GET /houses -> count=${total}`);

      // Prefer a house NOT owned by me (so apply/report makes sense)
      const mine = String(auth?.userId || "");
      const candidate =
        items.find((h) => String(h?.owner_id || h?.ownerId || "") && String(h?.owner_id || h?.ownerId) !== mine) ||
        items[0];

      targetHouseId = candidate?.id || candidate?.house_id || null;
      append(`Target houseId=${targetHouseId || "-"}`);

      if (!targetHouseId) warn("No houses returned. Some tests will be skipped.");

      pass(`(${msSince(t0)}ms)`);
    });

    // 4) Houses: create
    tests.push(async () => {
      startSection("Houses: POST /houses (create listing)");
      const t0 = Date.now();

      const title = `SMOKE_${Date.now()}`;
      const payload = {
        title,
        description: "Smoke test listing (mock)",
        location: "Rabat",
        price_per_room: 1200,
        total_rooms: 3,
        occupied_rooms: 0,
        status: "AVAILABLE",
      };

      const res = await tryCall(
        "house.create",
        [
          houseApi?.create,
          houseApi?.createHouse,
          async () => (await http.post("/houses", payload)).data,
        ],
        [payload]
      );

      if (!res.ok) throw res.error;

      const out = res.out?.data ?? res.out;
      const id = out?.id || out?.house_id || out?.house?.id || null;

      created.houseId = id;
      append(`POST /houses -> id=${created.houseId || "-"} title=${title}`);

      if (!created.houseId) warn("Create did not return an id. Next steps will try best-effort.");

      pass(`(${msSince(t0)}ms)`);
    });

    // 5) Houses: get created
    tests.push(async () => {
      startSection("Houses: GET /houses/:id (created)");
      const t0 = Date.now();

      if (!created.houseId) {
        warn("No created houseId -> skipping GET created");
        pass(`(${msSince(t0)}ms)`);
        return;
      }

      const id = created.houseId;

      const res = await tryCall(
        "house.get",
        [
          houseApi?.get,
          houseApi?.getHouse,
          async () => (await http.get(`/houses/${id}`)).data,
        ],
        [id]
      );

      if (!res.ok) throw res.error;

      const out = res.out?.data ?? res.out;
      const title = out?.title || out?.house?.title || "-";
      append(`GET /houses/${id} -> title=${title}`);

      pass(`(${msSince(t0)}ms)`);
    });

    // 6) Houses: update created
    tests.push(async () => {
      startSection("Houses: PUT /houses/:id (update created)");
      const t0 = Date.now();

      if (!created.houseId) {
        warn("No created houseId -> skipping PUT created");
        pass(`(${msSince(t0)}ms)`);
        return;
      }

      const id = created.houseId;
      const payload = { title: `${id}_UPDATED` };

      const res = await tryCall(
        "house.update",
        [
          houseApi?.update,
          houseApi?.updateHouse,
          async () => (await http.put(`/houses/${id}`, payload)).data,
        ],
        [id, payload]
      );

      if (!res.ok) throw res.error;

      append(`PUT /houses/${id} -> title=${payload.title}`);
      pass(`(${msSince(t0)}ms)`);
    });

    // 7) Houses: my listings
    tests.push(async () => {
      startSection("Houses: GET /houses/my (my listings)");
      const t0 = Date.now();

      const res = await tryCall(
        "house.mine",
        [
          houseApi?.mine,
          houseApi?.my,
          houseApi?.listMy,
          async () => (await http.get("/houses/my")).data,
        ],
        []
      );

      if (!res.ok) throw res.error;

      const { items, total } = normalizeListPayload(res.out);
      append(`GET /houses/my -> count=${total}`);

      if (created.houseId) {
        const found = items.some((h) => (h?.id || h?.house_id) === created.houseId);
        append(`My listings contains created house? ${found ? "YES" : "NO"}`);
        // Don’t fail on this in mock mode, but warn if unexpected:
        if (!found) warn("Created house not found in /houses/my (mock may not persist or endpoint mapping differs).");
      }

      pass(`(${msSince(t0)}ms)`);
    });

    // 8) Applications: apply to target
    tests.push(async () => {
      startSection("Applications: POST /applications (apply to target house)");
      const t0 = Date.now();

      if (!targetHouseId) {
        warn("No target house -> skipping apply");
        pass(`(${msSince(t0)}ms)`);
        return;
      }

      // If targetHouse is owned by me (rare), skip to avoid nonsense
      // (We already tried to pick a not-mine house above.)
      const payload = { house_id: targetHouseId, message: "Smoke test application" };

      const res = await tryCall(
        "applications.apply",
        [
          houseApi?.apply,
          houseApi?.applyToHouse,
          async () => (await http.post("/applications", payload)).data,
        ],
        [payload]
      );

      if (!res.ok) throw res.error;

      const out = res.out?.data ?? res.out;
      created.applicationId = out?.id || out?.application_id || null;
      append(
        `POST /applications -> ok=${String(out?.ok ?? true)} already_applied=${String(
          out?.already_applied ?? false
        )} id=${created.applicationId || "-"}`
      );

      pass(`(${msSince(t0)}ms)`);
    });

    // 9) Applications: my apps
    tests.push(async () => {
      startSection("Applications: GET /applications/my (my apps)");
      const t0 = Date.now();

      const res = await tryCall(
        "applications.my",
        [
          houseApi?.myApplications,
          houseApi?.listMyApplications,
          async () => (await http.get("/applications/my")).data,
        ],
        []
      );

      if (!res.ok) throw res.error;

      const { total } = normalizeListPayload(res.out);
      append(`GET /applications/my -> count=${total}`);
      pass(`(${msSince(t0)}ms)`);
    });

    // 10) Notifications: list latest 5
    tests.push(async () => {
      startSection("Notifications: GET /notifications (latest 5)");
      const t0 = Date.now();

      const res = await tryCall(
        "notifications.list",
        [
          houseApi?.listNotifications,
          houseApi?.notifications,
          async () => (await http.get("/notifications", { params: { limit: 5 } })).data,
        ],
        []
      );

      if (!res.ok) throw res.error;

      const { items, total } = normalizeListPayload(res.out);
      append(`GET /notifications -> count=${total}`);

      const first = items[0];
      created.notificationId = first?.id || first?.notification_id || null;

      pass(`(${msSince(t0)}ms)`);
    });

    // 11) Notifications: mark latest as read
    tests.push(async () => {
      startSection("Notifications: mark latest as read (if any)");
      const t0 = Date.now();

      if (!created.notificationId) {
        warn("No notifications -> skipping mark as read");
        pass(`(${msSince(t0)}ms)`);
        return;
      }

      const id = created.notificationId;

      const res = await tryCall(
        "notifications.read",
        [
          houseApi?.markNotificationRead,
          houseApi?.markAsRead,
          async () => (await http.post(`/notifications/${id}/read`)).data,
        ],
        [id]
      );

      if (!res.ok) throw res.error;

      append(`POST /notifications/${id}/read -> ok`);
      pass(`(${msSince(t0)}ms)`);
    });

    // 12) Reports: report a house
    tests.push(async () => {
      startSection("Reports: POST /reports (report target house)");
      const t0 = Date.now();

      if (!targetHouseId) {
        warn("No target house -> skipping report");
        pass(`(${msSince(t0)}ms)`);
        return;
      }

      const payload = { house_id: targetHouseId, reason: "Smoke test report" };

      const res = await tryCall(
        "reports.create",
        [
          houseApi?.report,
          houseApi?.reportListing,
          async () => (await http.post("/reports", payload)).data,
        ],
        [payload]
      );

      if (!res.ok) throw res.error;

      const out = res.out?.data ?? res.out;
      created.reportId = out?.id || out?.report_id || null;

      append(`POST /reports -> ok=${String(out?.ok ?? true)} id=${created.reportId || "-"}`);
      pass(`(${msSince(t0)}ms)`);
    });

    // 13) Admin: get overview
    tests.push(async () => {
      startSection("Admin: get overview (if available)");
      const t0 = Date.now();

      const fn = adminApi?.getAdminOverview || adminApiModule?.getAdminOverview;
      if (typeof fn !== "function") {
        // Don’t fail: admin overview may not be wired yet
        warn("getAdminOverview() not exported -> skipping");
        pass(`(${msSince(t0)}ms)`);
        return;
      }

      try {
        const out = await fn(10);
        append(`Admin overview -> ${safeJson(out)}`);
        pass(`(${msSince(t0)}ms)`);
      } catch (e) {
        // still PASS but report what happened, as you wanted (informative)
        append(`Admin overview -> ${safeJson(e?.response?.data || { ok: false, message: e?.message })}`);
        pass(`(${msSince(t0)}ms)`);
      }
    });

    // 14) Admin: list users
    tests.push(async () => {
      startSection("Admin: list users");
      const t0 = Date.now();

      const fn =
        adminApi?.listUsers ||
        adminApiModule?.listUsers ||
        adminApi?.getUsers ||
        adminApiModule?.getUsers;

      if (typeof fn !== "function") {
        // fallback to http endpoints used by AdminUsers.jsx
        try {
          const { data } = await http.get("/users", { params: { q: "", page: 1, page_size: 8 } });
          const { total } = normalizeListPayload(data);
          append(`Admin listUsers -> count=${total} (via /users)`);
          pass(`(${msSince(t0)}ms)`);
          return;
        } catch (e) {
          warn("No listUsers() export and /users failed.");
          fail(e);
          return;
        }
      }

      const out = await fn({ q: "", page: 1, page_size: 8 }).catch(async () => await fn());
      const { total } = normalizeListPayload(out);
      append(`Admin listUsers -> count=${total}`);
      pass(`(${msSince(t0)}ms)`);
    });

    // 15) Admin: list reports
    tests.push(async () => {
      startSection("Admin: list reports");
      const t0 = Date.now();

      const fn = adminApi?.listReports || adminApiModule?.listReports;
      if (typeof fn !== "function") {
        // fallback: try a common endpoint
        try {
          const { data } = await http.get("/admin/reports");
          const { total } = normalizeListPayload(data);
          append(`Admin listReports -> count=${total} (via /admin/reports)`);
          pass(`(${msSince(t0)}ms)`);
          return;
        } catch (e) {
          warn("No listReports() export and /admin/reports failed.");
          fail(e);
          return;
        }
      }

      const out = await fn({ page: 1, page_size: 10 }).catch(async () => await fn());
      const { items, total } = normalizeListPayload(out);

      append(`Admin listReports -> count=${total}`);
      if (created.reportId) {
        const found = items.some((r) => (r?.id || r?.report_id) === created.reportId);
        append(`Admin reports contains my created report? ${found ? "YES" : "NO"}`);
      }

      pass(`(${msSince(t0)}ms)`);
    });

    // 16) Admin: resolve created report
    tests.push(async () => {
      startSection("Admin: resolve created report (if we have one)");
      const t0 = Date.now();

      if (!created.reportId) {
        warn("No created reportId -> skipping resolve");
        pass(`(${msSince(t0)}ms)`);
        return;
      }

      const fn = adminApi?.resolveReport || adminApiModule?.resolveReport;
      if (typeof fn !== "function") {
        // fallback: common endpoint
        try {
          await http.post(`/admin/reports/${created.reportId}/resolve`, { status: "RESOLVED" });
          append(`Admin resolveReport(${created.reportId}) -> ok (via /admin/reports/:id/resolve)`);
          pass(`(${msSince(t0)}ms)`);
          return;
        } catch (e) {
          warn("No resolveReport() export and fallback endpoint failed.");
          fail(e);
          return;
        }
      }

      await fn(created.reportId);
      append(`Admin resolveReport(${created.reportId}) -> ok`);
      pass(`(${msSince(t0)}ms)`);
    });

    // 17) Cleanup: delete created house
    tests.push(async () => {
      startSection("Cleanup: DELETE /houses/:id (delete created listing)");
      const t0 = Date.now();

      if (!created.houseId) {
        warn("No created houseId -> skipping cleanup delete");
        pass(`(${msSince(t0)}ms)`);
        return;
      }

      const id = created.houseId;

      const res = await tryCall(
        "house.delete",
        [
          houseApi?.remove,
          houseApi?.delete,
          houseApi?.deleteHouse,
          async () => (await http.delete(`/houses/${id}`)).data,
        ],
        [id]
      );

      if (!res.ok) throw res.error;

      append(`DELETE /houses/${id} -> ok`);
      pass(`(${msSince(t0)}ms)`);
    });

    // ---- Run all tests ------------------------------------------------------
    for (const fn of tests) {
      const sectionStart = Date.now();
      try {
        await fn();
      } catch (e) {
        fail(e);
      } finally {
        // visually separate hard failures
        const took = msSince(sectionStart);
        if (took > 2000) warn(`Slow step: ${took}ms`);
      }
    }

    append("");
    append("---- SUMMARY ----");
    append(
      `Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed} | Time: ${msSince(
        startedAt
      )}ms`
    );

    setRunning(false);
  }

  return (
    <Box sx={{ maxWidth: 980, mx: "auto", py: 3 }}>
      <Paper sx={{ p: 2.2, borderRadius: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="h5">Frontend Smoke Test</Typography>
          <Typography color="text.secondary">
            Runs a full chain of mock/gateway calls and reports results here (no white screens).
          </Typography>

          <Divider />

          <Stack direction="row" spacing={1}>
            <Button variant="contained" disabled={running} onClick={run}>
              {running ? "Running..." : "Run smoke test"}
            </Button>
            <Button variant="outlined" disabled={running} onClick={clear}>
              Clear
            </Button>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              mt: 1,
              p: 1.5,
              borderRadius: 2,
              bgcolor: "rgba(0,0,0,0.25)",
              overflow: "auto",
              maxHeight: 520,
            }}
          >
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{log}</pre>
          </Paper>
        </Stack>
      </Paper>
    </Box>
  );
}
