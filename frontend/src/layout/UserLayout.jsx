import { Outlet, useLocation } from "react-router-dom";
import { Box } from "@mui/material";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/Footer";
import Sidebar from "../components/layout/Sidebar";

const NAVBAR_HEIGHT = 64;

export default function UserLayout() {
  const loc = useLocation();

  const hideNavbar =
  loc.pathname === "/" ||
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

      <Box
        sx={{
          flex: 1,
          display: "flex",
          pt: !hideNavbar ? `${NAVBAR_HEIGHT}px` : 0,
        }}
      >
        {!hideNavbar && <Sidebar />}

        <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>

      {!hideFooter ? <Footer /> : null}
    </Box>
  );
}