function isUnread(n) {
  if (typeof n?.read === "boolean") return !n.read;
  return !n?.read_at;
}

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default function NotificationsPanel({
  items = [],
  loading = false,
  onClickItem,
  onMarkAllRead,
  maxItems = 5,
}) {
  const sliced = Array.isArray(items) ? items.slice(0, maxItems) : [];
  const unreadCount = sliced.filter(isUnread).length;

  return (
    <div className="notifications-panel">
      <div className="notifications-header">
        <h3>Notifications</h3>

        <button
          className="mark-read-btn"
          onClick={onMarkAllRead}
          disabled={loading || unreadCount === 0}
        >
          Mark all read
        </button>
      </div>

      <div className="divider" />

      {loading ? (
        <div className="notifications-loading">
          <div className="spinner"></div>
        </div>
      ) : sliced.length === 0 ? (
        <div className="notifications-empty">
          <h4>All caught up 🎉</h4>
          <p>You have no notifications yet.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {sliced.map((n) => {
            const unread = isUnread(n);

            return (
              <button
                key={n.id}
                className={`notification-item ${unread ? "unread" : ""}`}
                onClick={() => onClickItem?.(n)}
              >
                <div className="notification-title-row">
                  <span className="notification-title">
                    {n.title || "Notification"}
                  </span>

                  {unread && <span className="notification-badge">NEW</span>}
                </div>

                <p className="notification-message">
                  {n.message || ""}
                </p>

                <span className="notification-date">
                  {formatWhen(n.created_at)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}