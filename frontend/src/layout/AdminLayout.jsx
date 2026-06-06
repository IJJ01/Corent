import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Stack,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import Menu from "@mui/material/Menu";
import Divider from "@mui/material/Divider";

import { useAuth } from "../auth/AuthContext"; // ✅ adjust path if your AdminLayout is elsewhere

const nav = [
  { to: "/admin/overview", label: "Overview" },
  { to: "/admin/houses", label: "Houses" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/users", label: "Users" },
];

export default function AdminLayout() {
  // ✅ hooks INSIDE component
  const [notifAnchor, setNotifAnchor] = useState(null);
  const notifOpen = Boolean(notifAnchor);

  const openNotif = (e) => setNotifAnchor(e.currentTarget);
  const closeNotif = () => setNotifAnchor(null);

  // ✅ logout (same behavior as working Navbar)
  const { logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = () => {
    logout();
    navigate("/login", { replace: true }); // or "/browse" if you prefer
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px 500px at 15% 10%, rgba(109,94,246,0.25), transparent 55%), radial-gradient(800px 500px at 85% 20%, rgba(56,210,125,0.12), transparent 55%), #0B0A14",
      }}
    >
      {/* Topbar */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(11,10,20,0.65)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ py: 1.2 }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography sx={{ fontWeight: 900, letterSpacing: 0.2 }}>
                Co-Rent{" "}
                <span style={{ opacity: 0.7, fontWeight: 700 }}>/ Admin</span>
              </Typography>

              <Stack direction="row" spacing={0.5} sx={{ ml: 1 }}>
                {nav.map((i) => (
                  <Button
                    key={i.to}
                    component={NavLink}
                    to={i.to}
                    size="small"
                    variant="text"
                    sx={(theme) => ({
                      color: "text.secondary",
                      borderRadius: 999,
                      px: 1.2,
                      "&.active": {
                        color: "text.primary",
                        backgroundColor: "rgba(255,255,255,0.06)",
                        border: `1px solid ${theme.palette.divider}`,
                      },
                    })}
                  >
                    {i.label}
                  </Button>
                ))}
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Theme (later)">
                <IconButton size="small">
                  <LightModeIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Notifications">
                <IconButton
                  size="small"
                  onClick={openNotif}
                  sx={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 3,
                  }}
                >
                  <NotificationsNoneRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Button variant="outlined" onClick={onLogout}>
                Logout700
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Notifications menu */}
      <Menu
        anchorEl={notifAnchor}
        open={notifOpen}
        onClose={closeNotif}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            mt: 1,
            width: 320,
            borderRadius: 3,
            p: 1.2,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.60)",
          },
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontWeight: 900 }}>Notifications</Typography>
            <Chip size="small" label="0" variant="outlined" />
          </Stack>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

          {/* empty for now */}
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
              Nothing here yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We’ll plug the notification service later.
            </Typography>
          </Box>
        </Stack>
      </Menu>

      {/* Page */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>

      {/* Footer */}
      <Box sx={{ py: 3, opacity: 0.6, textAlign: "center" }}>
        <Typography variant="body2">© 2026 Co-Rent</Typography>
      </Box>
    </Box>
  );
}
