// src/api/houseApi.js
import { apiGet, apiPost, apiPut, apiDelete } from "./client";

/**
 * NOTE:
 * - Some pages call houseApi.mine(userId)
 * - Others call houseApi.list / get / create / update / remove
 *
 * To keep everything working, we expose all of these with stable names.
 * In mock mode, /houses/my uses localStorage user_id; userId param is optional.
 */

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.houses)) return data.houses;
  return [];
}

export const houseApi = {
  // Public
  async list(params = {}) {
    const res = await apiGet("/houses", params);
    return normalizeList(res?.data);
  },

  async get(id) {
    if (!id) throw new Error("get: id is required");
    const res = await apiGet(`/houses/${id}`);
    return res?.data;
  },

  // Protected (Owner)
  async mine(_userId) {
    // _userId kept for backward compatibility (your UI passes it)
    const res = await apiGet("/houses/my");
    return normalizeList(res?.data);
  },

  // aliases for safety across pages
  my: async (_userId) => houseApi.mine(_userId),
  listMy: async (_userId) => houseApi.mine(_userId),

  // CRUD
  async create(payload) {
    const res = await apiPost("/houses", payload);
    return res?.data;
  },

  async update(id, payload) {
    if (!id) throw new Error("update: id is required");
    const res = await apiPut(`/houses/${id}`, payload);
    return res?.data;
  },

  async remove(id) {
    if (!id) throw new Error("remove: id is required");
    const res = await apiDelete(`/houses/${id}`);
    return res?.data;
  },
};
