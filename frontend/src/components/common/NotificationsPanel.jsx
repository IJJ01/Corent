// src/components/common/NotificationsPanel.jsx
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";

function isUnread(n) {
  // support both read_at and boolean read fields
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
    <Box sx={{ width: 360, maxWidth: "90vw" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.25 }}>
        <Typography sx={{ fontWeight: 900 }}>Notifications</Typography>

        <Button size="small" onClick={onMarkAllRead} disabled={loading || unreadCount === 0}>
          Mark all read
        </Button>
      </Stack>

      <Divider />

      {loading ? (
        <Stack alignItems="center" sx={{ py: 3 }}>
          <CircularProgress size={22} />
        </Stack>
      ) : sliced.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>All caught up 🎉</Typography>
          <Typography variant="body2" color="text.secondary">
            You have no notifications yet.
          </Typography>
        </Box>
      ) : (
        <List dense disablePadding>
          {sliced.map((n) => {
            const unread = isUnread(n);
            return (
              <ListItemButton
                key={n.id}
                onClick={() => onClickItem?.(n)}
                sx={{
                  alignItems: "flex-start",
                  py: 1.2,
                  bgcolor: unread ? "action.hover" : "transparent",
                }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ fontWeight: unread ? 900 : 700 }}>
                        {n.title || "Notification"}
                      </Typography>
                      {unread && (
                        <Typography variant="caption" sx={{ fontWeight: 900, color: "primary.main" }}>
                          NEW
                        </Typography>
                      )}
                    </Stack>
                  }
                  secondary={
                    <Box sx={{ mt: 0.25 }}>
                      <Typography variant="body2" color="text.secondary">
                        {n.message || ""}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatWhen(n.created_at)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
      )}
    </Box>
  );
}
