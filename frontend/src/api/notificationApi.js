// src/api/notificationApi.js
import { apiGet, apiPost } from "./client";

// Normalize list responses: can be an array or an envelope { items: [...] }
function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.notifications)) return data.notifications;
  return [];
}

export const notificationApi = {
  async list({ page = 1, pageSize = 5, unreadOnly = false } = {}) {
    const res = await apiGet("/notifications", {
      page,
      page_size: pageSize,
      limit: pageSize, // mock uses this too
      unreadOnly,
    });
    return normalizeList(res?.data);
  },

  async markAsRead(notificationId) {
    if (!notificationId) throw new Error("markAsRead: notificationId is required");
    const res = await apiPost(`/notifications/${notificationId}/read`, {});
    return res?.data;
  },

  async markAllAsRead() {
    const res = await apiPost("/notifications/read-all", {});
    return res?.data;
  },
};
