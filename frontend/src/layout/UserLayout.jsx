import { Outlet, useLocation } from "react-router-dom";
import { Box } from "@mui/material";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/Footer";

const NAVBAR_HEIGHT = 64;

export default function UserLayout() {
  const loc = useLocation();

  const hideNavbar =
    loc.pathname === "/login" ||
    loc.pathname === "/signup" ||
    loc.pathname === "/reset-password";

  const hideFooter = loc.pathname.startsWith("/admin");

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {!hideNavbar ? <Navbar /> : null}

      {/* main content: push down under fixed navbar and make it take remaining height */}
      <Box
        component="main"
        sx={{
          flex: 1,
          pt: !hideNavbar ? `${NAVBAR_HEIGHT}px` : 0, // ✅ prevents overlap
        }}
      >
        <Outlet />
      </Box>

      {!hideFooter ? <Footer /> : null}
    </Box>
  );
}
