import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import { notificationApi } from "../../api/notificationApi";
import NotificationsPanel from "./NotificationsPanel";

function isUnread(n) {
  if (typeof n?.read === "boolean") return !n.read;
  return !n?.read_at;
}

export default function NotificationsBell() {
  const { isAuthed } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef(null);

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

  useEffect(() => {
    if (!isAuthed) return;

    refresh();

    const timer = setInterval(refresh, 20000);

    return () => clearInterval(timer);
  }, [isAuthed]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onOpen = () => {
    setOpen((prev) => !prev);
    refresh();
  };

  const onClickItem = async (n) => {
    if (!n?.id) return;

    if (isUnread(n)) {
      await notificationApi.markAsRead(n.id);

      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id
            ? {
                ...x,
                read: true,
                read_at: x.read_at || new Date().toISOString(),
              }
            : x
        )
      );
    }

    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  const onMarkAllRead = async () => {
    await notificationApi.markAllAsRead();

    const now = new Date().toISOString();

    setItems((prev) =>
      prev.map((x) => ({
        ...x,
        read: true,
        read_at: x.read_at || now,
      }))
    );
  };

  if (!isAuthed) return null;

  return (
    <div className="notification-wrapper" ref={wrapperRef}>
      <button
        className="notification-button"
        onClick={onOpen}
        title="Notifications"
      >
        <i class="fa-regular fa-bell"></i>

        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-menu">
          <NotificationsPanel
            items={items}
            loading={loading}
            onClickItem={onClickItem}
            onMarkAllRead={onMarkAllRead}
            maxItems={5}
          />
        </div>
      )}
    </div>
  );
}