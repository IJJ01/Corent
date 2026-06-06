// src/api/reportApi.js
import { apiPost } from "./client";

export const reportApi = {
  async reportHouse(houseId, reason = "") {
    if (!houseId) throw new Error("reportHouse: houseId is required");
    const res = await apiPost("/reports", { house_id: houseId, reason });
    return res?.data;
  },
};
