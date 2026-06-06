// src/api/applicationApi.js
import { apiGet, apiPost } from "./client";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.applications)) return data.applications;
  return [];
}

export const applicationApi = {
  // =========================
  // USER APPLIES TO A HOUSE
  // =========================
  async apply(houseId, message = "") {
    if (!houseId) throw new Error("apply: houseId is required");

    // MOCK MODE
    if (USE_MOCK) {
      const res = await apiPost("/applications", {
        house_id: houseId,
        message,
      });
      return res?.data;
    }

    // REAL GATEWAY MODE
    const res = await apiPost(`/houses/${houseId}/apply`, { message });
    const data = res?.data;

    const app = data?.application;

    return {
      ok: true,
      application: app,
      id: app?.id,
      status: app?.status,
      message: "Application submitted",
    };
  },

  // =========================
  // USER: MY APPLICATIONS
  // =========================
  async listMy({ page = 1, pageSize = 50 } = {}) {
    if (USE_MOCK) {
      const res = await apiGet("/applications/my", {
        page,
        page_size: pageSize,
        limit: pageSize,
      });
      return normalizeList(res?.data);
    }

    const res = await apiGet("/applications", {
      mine: 1,
      pageSize,
      pageToken: String((page - 1) * pageSize),
    });

    return normalizeList(res?.data);
  },

  // =========================
  // OWNER: APPLICATIONS FOR MY HOUSES
  // =========================
  async listForOwner({ status = "PENDING", page = 1, pageSize = 50 } = {}) {
    if (USE_MOCK) {
      const res = await apiGet("/applications/owner", {
        status,
        page,
        page_size: pageSize,
        limit: pageSize,
      });
      return normalizeList(res?.data);
    }

    const res = await apiGet("/applications/owner", {
      status,
      pageSize,
      pageToken: String((page - 1) * pageSize),
    });

    return normalizeList(res?.data);
  },

  // =========================
  // OWNER DECISION
  // =========================
  async decide(applicationId, decision) {
    if (!applicationId) throw new Error("decide: applicationId is required");
    if (!decision) throw new Error("decide: decision is required");

    const d = String(decision).toUpperCase();

    // MOCK MODE
    if (USE_MOCK) {
      const res = await apiPost(`/applications/${applicationId}/decision`, {
        decision: d,
      });
      return res?.data;
    }

    // REAL GATEWAY MODE
    if (d === "APPROVED") {
      const res = await apiPost(`/applications/${applicationId}/accept`, {});
      return res?.data;
    }

    if (d === "REJECTED") {
      const res = await apiPost(`/applications/${applicationId}/reject`, {});
      return res?.data;
    }

    throw new Error('decision must be "APPROVED" or "REJECTED"');
  },
};
