import axios from "axios";

/**
 * We support both naming schemes because your app used both at different times:
 * - access_token / user_id (from login page)
 * - co_rent_token / co_rent_user_id (from AuthContext)
 */
const readToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("co_rent_token") ||
  "";

const readUserId = () =>
  localStorage.getItem("user_id") ||
  localStorage.getItem("co_rent_user_id") ||
  "";

const API_BASE_URL =
  (import.meta?.env?.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

const USE_MOCK = String(import.meta?.env?.VITE_USE_MOCK || "false").toLowerCase() === "true";

// ---- axios instance ----
const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = readToken();
  const userId = readUserId();

  config.headers = config.headers || {};

  // Attach JWT if present
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach x-user-id if present (your FastAPI routes rely on this)
  if (userId) {
    config.headers["x-user-id"] = userId;
  }

  return config;
});

// Optional: normalize error shape
function normalizeAxiosError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;

  // FastAPI often returns { detail: "..." }
  const detail =
    (typeof data === "string" && data) ||
    data?.detail ||
    data?.message ||
    err?.message ||
    "Request failed";

  const out = new Error(detail);
  out.status = status;
  out.data = data;
  out.raw = err;
  return out;
}

// ---- tiny helpers ----
export async function apiGet(path, config = {}) {
  if (USE_MOCK) throw new Error("Mock mode is ON: apiGet not wired.");
  try {
    return await http.get(path, config);
  } catch (e) {
    throw normalizeAxiosError(e);
  }
}

export async function apiPost(path, body = {}, config = {}) {
  if (USE_MOCK) throw new Error("Mock mode is ON: apiPost not wired.");
  try {
    return await http.post(path, body, config);
  } catch (e) {
    throw normalizeAxiosError(e);
  }
}

export async function apiPut(path, body = {}, config = {}) {
  if (USE_MOCK) throw new Error("Mock mode is ON: apiPut not wired.");
  try {
    return await http.put(path, body, config);
  } catch (e) {
    throw normalizeAxiosError(e);
  }
}

export async function apiDelete(path, config = {}) {
  if (USE_MOCK) throw new Error("Mock mode is ON: apiDelete not wired.");
  try {
    return await http.delete(path, config);
  } catch (e) {
    throw normalizeAxiosError(e);
  }
}

/**
 * Avatar upload (you said ignore for now, but leaving it here won’t break anything).
 * Your frontend calls apiUploadAvatar(file).
 * If your gateway doesn’t have this route yet, it will return 404 — that’s fine.
 */
export async function apiUploadAvatar(file) {
  if (USE_MOCK) throw new Error("Mock mode is ON: apiUploadAvatar not wired.");

  const form = new FormData();
  form.append("file", file);

  try {
    return await http.post("/upload/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } catch (e) {
    throw normalizeAxiosError(e);
  }
}

// Export the raw axios instance in case other api files import it
export { http };
