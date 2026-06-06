// src/components/common/NotificationsBell.jsx
import { useEffect, useMemo, useState } from "react";
import { Badge, IconButton, Menu, Tooltip } from "@mui/material";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";

import { useAuth } from "../../auth/AuthContext";
import { notificationApi } from "../../api/notificationApi";
import NotificationsPanel from "./NotificationsPanel";
import { useNavigate } from "react-router-dom";
function isUnread(n) {
  if (typeof n?.read === "boolean") return !n.read;
  return !n?.read_at;
}

export default function NotificationsBell() {
  const { isAuthed } = useAuth();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = useMemo(
    () => (Array.isArray(items) ? items.filter(isUnread).length : 0),
    [items]
  );

  const refresh = async () => {
    if (!isAuthed) return;
    setLoading(true);
    try {
      const list = await notificationApi.list({ pageSize: 5 });
      setItems(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  };

  // light polling so badge stays fresh
  useEffect(() => {
    if (!isAuthed) return;
    refresh();
    const t = setInterval(refresh, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const onOpen = (e) => {
    setAnchorEl(e.currentTarget);
    refresh();
  };

  const onClose = () => setAnchorEl(null);

  const onClickItem = async (n) => {
    if (!n?.id) return;
    
    const navigate = useNavigate();

// after markAsRead:
if (n?.link) navigate(n.link);

    // click = mark as read (no navigation)
    if (isUnread(n)) {
      await notificationApi.markAsRead(n.id);
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, read_at: x.read_at || new Date().toISOString(), read: true } : x
        )
      );
    }
  };

  const onMarkAllRead = async () => {
    await notificationApi.markAllAsRead();
    const now = new Date().toISOString();
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || now, read: true })));
  };

  if (!isAuthed) return null;

  return (
    <>
      <Tooltip title="Notifications" arrow>
        <IconButton
          onClick={onOpen}
          size="small"
          sx={{
            width: 36,
            height: 36,
            borderRadius: 999,
            border: (t) =>
              `1px solid ${
                t.palette.mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.14)"
              }`,
          }}
        >
          <Badge badgeContent={unreadCount} color="error" overlap="circular" max={9}>
            <NotificationsNoneOutlinedIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <NotificationsPanel
          items={items}
          loading={loading}
          onClickItem={onClickItem}
          onMarkAllRead={onMarkAllRead}
          maxItems={5}
        />
      </Menu>
    </>
  );
}
