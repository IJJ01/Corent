// src/api/http.js
import axios from "axios";

/**
 * ENV
 * - VITE_USE_MOCK=true|false
 * - VITE_API_BASE_URL=http://127.0.0.1:8000
 * - VITE_ADMIN_ID=... (optional)
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const http = axios.create({
  baseURL,
  timeout: 15000,
});

/* =======================
   AUTH HELPERS
   ======================= */
function getToken() {
  return (
    localStorage.getItem("co_rent_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function getUserId() {
  return (
    localStorage.getItem("co_rent_user_id") ||
    localStorage.getItem("user_id") ||
    ""
  );
}

// Decode JWT payload (NO verification) to extract user_id when localStorage is missing it.
function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");

    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getUserIdFromToken(token) {
  const payload = decodeJwtPayload(token);
  const uid = payload?.user_id || payload?.userId || payload?.sub;
  return uid ? String(uid) : "";
}

/* =======================
   REQUEST INTERCEPTOR
   ======================= */
http.interceptors.request.use(
  (config) => {
    const token = getToken();
    let uid = getUserId();

    // If uid not present in storage, fallback to token payload
    if (!uid && token) uid = getUserIdFromToken(token);

    config.headers = config.headers || {};

    // Always attach Authorization if token exists
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Always attach x-user-id if we have it (storage or token)
    if (uid) config.headers["x-user-id"] = uid;

    // Admin header only for admin routes (keeps admin behavior isolated)
    const url = String(config.url || "");
    if (url.startsWith("/admin")) {
      const adminId =
        import.meta.env.VITE_ADMIN_ID || localStorage.getItem("admin_id");
      if (adminId) config.headers["x-admin-id"] = adminId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* =======================
   MOCK DB
   ======================= */
const mockDb = {
  users: [
    { id: "a1", email: "admin@mock.local", is_admin: true, banned: false },
    { id: "u1", email: "user1@mock.local", is_admin: false, banned: false },
    { id: "u2", email: "user2@mock.local", is_admin: false, banned: false },
  ],

  houses: [
    {
      id: "h1",
      title: "Modern Studio",
      description: "Bright studio near the tram.",
      location: "Casablanca",
      price_per_room: 300,
      total_rooms: 3,
      occupied_rooms: 1,
      status: "AVAILABLE",
      owner_id: "u1",
      images: [],
    },
    {
      id: "h2",
      title: "Shared Apartment",
      description: "Cozy shared flat.",
      location: "Rabat",
      price_per_room: 250,
      total_rooms: 4,
      occupied_rooms: 2,
      status: "AVAILABLE",
      owner_id: "u2",
      images: [],
    },
  ],

  applications: [
    // { id, house_id, applicant_id, message, status, created_at }
  ],

  reports: [
    // { id, house_id, reporter_id, reason, status, created_at }
  ],

  notifications: [
    // { id, user_id, type, title, message, created_at, read_at, link? }
  ],
};

/* =======================
   MOCK HELPERS
   ======================= */
function ok(data, config, status = 200) {
  return Promise.resolve({
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
  });
}

function err(message, config, status = 400) {
  return ok({ ok: false, message }, config, status);
}

function notFound(config) {
  return err("MOCK: Not found", config, 404);
}

function safeJsonParse(data) {
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  if (typeof data === "object") return data;
  return {};
}

function parseId(path) {
  const parts = String(path || "").split("/").filter(Boolean);
  return parts[parts.length - 1];
}

function newId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

function pushNotif({ user_id, type = "info", title, message, link }) {
  mockDb.notifications.unshift({
    id: newId("n_"),
    user_id,
    type,
    title,
    message,
    link: link || null,
    created_at: new Date().toISOString(),
    read_at: null,
  });
}

/* =======================
   MOCK ADAPTER
   ======================= */
async function mockAdapter(config) {
  const method = (config.method || "get").toLowerCase();
  const url = config.url || "";
  const path = url.startsWith("http") ? new URL(url).pathname : url;

  const uid = getUserId() || getUserIdFromToken(getToken());

  /* ---------- HOUSES ---------- */
  if (method === "get" && path === "/houses") {
    return ok(mockDb.houses, config);
  }

  // ✅ Owner: list my listings
  if (method === "get" && path === "/houses/my") {
    if (!uid) return err("Missing user id", config, 401);

    const mine = mockDb.houses
      .filter((h) => String(h.owner_id) === String(uid))
      .sort((a, b) => String(b.id).localeCompare(String(a.id)));

    return ok(mine, config);
  }

  if (method === "get" && path.startsWith("/houses/")) {
    const id = parseId(path);
    const house = mockDb.houses.find((h) => h.id === id);
    return house ? ok(house, config) : notFound(config);
  }

  if (method === "post" && path === "/houses") {
    if (!uid) return err("Missing user id", config, 401);
    const body = safeJsonParse(config.data);

    const created = {
      id: newId("h_"),
      owner_id: uid,
      title: body.title || "Untitled",
      description: body.description || "",
      location: body.location || "",
      price_per_room: Number(body.price_per_room || 0),
      total_rooms: Number(body.total_rooms || 0),
      occupied_rooms: Number(body.occupied_rooms || 0),
      status: body.status || "AVAILABLE",
      images: body.images || [],
      created_at: new Date().toISOString(),
    };

    mockDb.houses.unshift(created);
    pushNotif({
      user_id: uid,
      type: "success",
      title: "Listing created",
      message: `Your listing "${created.title}" was created.`,
      link: `/houses/${created.id}`,
    });

    return ok(created, config, 201);
  }

  /* ---------- APPLICATIONS ---------- */
  if (method === "post" && path.endsWith("/apply")) {
    if (!uid) return err("Missing user id", config, 401);
    const body = safeJsonParse(config.data);

    const houseId = path.split("/").filter(Boolean)[1];
    if (!houseId) return err("Missing house id", config, 400);

    const app = {
      id: newId("app_"),
      house_id: houseId,
      applicant_id: uid,
      message: body.message || "Hi, I'm interested!",
      status: "pending",
      created_at: new Date().toISOString(),
    };

    mockDb.applications.unshift(app);

    return ok({ application: app }, config, 200);
  }

  /* ---------- NOTIFICATIONS ---------- */
  if (method === "get" && path === "/notifications") {
    if (!uid) return err("Missing user id", config, 401);
    const qs = config.params || {};
    const limit = Number(qs.limit || qs.page_size || 5);

    const items = mockDb.notifications
      .filter((n) => String(n.user_id) === String(uid))
      .slice(0, limit);

    return ok({ notifications: items }, config, 200);
  }

  return notFound(config);
}

/* =======================
   ENABLE MOCK IF REQUESTED
   ======================= */
if (USE_MOCK) {
  http.defaults.adapter = mockAdapter;
}
