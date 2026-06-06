import { NavLink, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";

import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

import { alpha } from "@mui/material/styles";
import { useColorMode } from "../../styles/ColorModeProvider";
import { useAuth } from "../../auth/AuthContext";
import NotificationsBell from "../common/NotificationsBell";

const navLinkSx = {
  position: "relative",
  px: 1.25,
  py: 0.75,
  borderRadius: 999,
  fontWeight: 600,
  fontSize: 14,
  color: "text.secondary",
  textDecoration: "none",
  lineHeight: 1,
  "&:hover": {
    color: "text.primary",
    bgcolor: (t) =>
      alpha(t.palette.text.primary, t.palette.mode === "dark" ? 0.08 : 0.06),
  },
  "&.active": {
    color: "text.primary",
    bgcolor: (t) =>
      alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.16 : 0.10),
  },
};

export default function Navbar() {
  const { isAuthed, logout } = useAuth();
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useColorMode();

  const onLogout = () => {
    logout();
    navigate("/browse");
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        top: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backdropFilter: "blur(10px)",
        backgroundImage: "none",
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(15, 23, 42, 0.72)"
            : "rgba(255, 255, 255, 0.72)",
        borderBottom: (t) =>
          t.palette.mode === "dark"
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(15,23,42,0.10)",
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: 64, gap: 2 }}>
          {/* Brand */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{ cursor: "pointer", userSelect: "none" }}
            onClick={() => navigate("/browse")}
          >
            <Box
              aria-hidden
              sx={{
                width: 32,
                height: 32,
                borderRadius: 10,
                bgcolor: "primary.main",
                boxShadow: (t) =>
                  t.palette.mode === "dark"
                    ? "0 10px 28px rgba(49,0,71,0.55)"
                    : "0 10px 28px rgba(49,0,71,0.28)",
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.4 }}>
              Co-Rent
            </Typography>
          </Stack>

          {/* Nav */}
          <Stack direction="row" spacing={0.75} sx={{ flex: 1, ml: 1 }}>
            <Box component={NavLink} to="/browse" sx={navLinkSx}>
              Browse
            </Box>

            {isAuthed && (
              <>
                <Box component={NavLink} to="/my-listings" sx={navLinkSx}>
                  My Listings
                </Box>
                <Box component={NavLink} to="/owner/applications" sx={navLinkSx}>
  Applications
</Box>

                <Box component={NavLink} to="/create" sx={navLinkSx}>
                  New Listing
                </Box>
              </>
            )}
          </Stack>

          {/* Actions */}
          <Stack direction="row" spacing={1} alignItems="center">
            {isAuthed && (
              <>
                {/* 👤 User profile */}
                <Tooltip title="Profile" arrow>
                  <IconButton
                    onClick={() => navigate("/profile")}
                    size="small"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      bgcolor: (t) =>
                        alpha(
                          t.palette.text.primary,
                          t.palette.mode === "dark" ? 0.10 : 0.06
                        ),
                      "&:hover": {
                        bgcolor: (t) =>
                          alpha(
                            t.palette.text.primary,
                            t.palette.mode === "dark" ? 0.16 : 0.10
                          ),
                      },
                    }}
                  >
                    <AccountCircleOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                    <NotificationsBell />

                <Divider flexItem orientation="vertical" sx={{ mx: 0.5, opacity: 0.35 }} />

                {/* 🔴 Logout */}
                <Tooltip title="Logout" arrow>
                  <IconButton
                    onClick={onLogout}
                    size="small"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      color: "error.main",
                      bgcolor: (t) =>
                        alpha(t.palette.error.main, t.palette.mode === "dark" ? 0.18 : 0.12),
                      "&:hover": {
                        bgcolor: (t) =>
                          alpha(t.palette.error.main, t.palette.mode === "dark" ? 0.28 : 0.20),
                      },
                    }}
                  >
                    <LogoutRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}

            {!isAuthed && (
              <Button
                variant="contained"
                onClick={() => navigate("/login")}
                sx={{
                  borderRadius: 999,
                  px: 2,
                  boxShadow: "none",
                  "&:hover": { boxShadow: "none" },
                }}
              >
                Login
              </Button>
            )}

            {/* Theme toggle */}
            <Tooltip title={mode === "dark" ? "Switch to light" : "Switch to dark"} arrow>
              <IconButton
                onClick={toggleColorMode}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: (t) =>
                    `1px solid ${
                      t.palette.mode === "dark"
                        ? "rgba(255,255,255,0.14)"
                        : "rgba(15,23,42,0.14)"
                    }`,
                  bgcolor: (t) =>
                    alpha(t.palette.text.primary, t.palette.mode === "dark" ? 0.08 : 0.04),
                  "&:hover": {
                    bgcolor: (t) =>
                      alpha(t.palette.text.primary, t.palette.mode === "dark" ? 0.12 : 0.08),
                  },
                }}
              >
                {mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
