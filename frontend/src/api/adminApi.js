// src/api/adminApi.js
import { apiGet, apiPost, apiDelete } from "./client";

/**
 * IMPORTANT:
 * - apiGet signature: apiGet(path, params = {}, config = {})
 * - Admin backend requires: x-admin-id header (admin.py & admin_reports.py)
 *
 * Keep exports compatible with existing admin pages.
 */

function getAdminId() {
  return (
    localStorage.getItem("co_rent_user_id") ||
    localStorage.getItem("user_id") ||
    ""
  );
}

function adminConfig(extraConfig = {}) {
  const adminId = getAdminId();
  return {
    ...(extraConfig || {}),
    headers: {
      ...(extraConfig?.headers || {}),
      "x-admin-id": adminId, // ✅ required by backend
    },
  };
}

/* =======================
   OVERVIEW
   ======================= */
export async function getAdminOverview(params = {}) {
  const res = await apiGet("/admin/overview", params, adminConfig());
  return res.data;
}

/* =======================
   REPORTS
   ======================= */
export async function listReports({
  status = "open",
  pageSize = 50,
  pageToken = "0",
} = {}) {
  const res = await apiGet(
    "/admin/reports",
    { status, pageSize, pageToken },
    adminConfig()
  );
  return res.data;
}

export async function getReportDetails(reportId) {
  const res = await apiGet(`/admin/reports/${reportId}`, {}, adminConfig());
  return res.data;
}

export async function resolveReport(reportId, status = "reviewed") {
  const res = await apiPost(
    `/admin/reports/${reportId}/resolve`,
    { status },
    adminConfig()
  );
  return res.data;
}

/* =======================
   USERS (ADMIN)
   ======================= */
/**
 * Your backend file admin.py includes ban/unban, but may not include listing.
 * We still point to /admin/users (correct namespace).
 * If your backend doesn't implement it yet, it will 404 and we'll add it backend-side.
 */
export async function listUsers({ q = "", page = 1, page_size = 8 } = {}) {
  const res = await apiGet(
    "/admin/users",
    { q, page, page_size },
    adminConfig()
  );
  return res.data;
}

export async function banUser(userId, reason = "") {
  const res = await apiPost(
    `/admin/users/${userId}/ban`,
    { ban: true, reason },
    adminConfig()
  );
  return res.data;
}

export async function unbanUser(userId, reason = "") {
  const res = await apiPost(
    `/admin/users/${userId}/ban`,
    { ban: false, reason },
    adminConfig()
  );
  return res.data;
}

/* =======================
   HOUSES (ADMIN)
   ======================= */
/**
 * Your backend does NOT provide GET /admin/houses listing.
 * So listHouses must use public listing endpoint /houses.
 * Admin moderation actions still use /admin/houses/{id}/...
 */
export async function listHouses({ q = "", page = 1, page_size = 8 } = {}) {
  const res = await apiGet("/houses", { q, page, page_size });
  return res.data;
}

// ✅ Your admin pages expect this export
export async function getHouseDetails(houseId) {
  const res = await apiGet(`/houses/${houseId}`, {});
  return res.data;
}

export async function deleteHouse(houseId, reason = "") {
  // DELETE /admin/houses/{id} requires x-admin-id
  const config = adminConfig(
    reason ? { params: { reason } } : undefined
  );
  const res = await apiDelete(`/admin/houses/${houseId}`, config);
  return res.data;
}

export async function setHouseRating(houseId, rating) {
  // POST /admin/houses/{id}/rating requires x-admin-id
  const res = await apiPost(
    `/admin/houses/${houseId}/rating`,
    { rating },
    adminConfig()
  );
  return res.data;
}

export async function setHouseStatus(houseId, status, reason = "") {
  // POST /admin/houses/{id}/status requires x-admin-id
  const res = await apiPost(
    `/admin/houses/${houseId}/status`,
    { status, reason },
    adminConfig()
  );
  return res.data;
}

/* =======================
   Backwards-compatible default export
   ======================= */
const adminApi = {
  getAdminOverview,
  listReports,
  getReportDetails,
  resolveReport,
  listUsers,
  banUser,
  unbanUser,
  listHouses,
  getHouseDetails,
  deleteHouse,
  setHouseRating,
  setHouseStatus,
};

export default adminApi;
