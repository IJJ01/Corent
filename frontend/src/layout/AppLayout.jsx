import React from "react";
import { Outlet } from "react-router-dom";
import { Box, Container } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export default function AppLayout() {
  const theme = useTheme();

  const glow =
    theme.palette.mode === "light"
      ? `radial-gradient(900px 420px at 25% 0%, ${alpha(
          theme.palette.primary.main,
          0.1
        )} 0%, transparent 60%)`
      : `radial-gradient(900px 420px at 25% 0%, ${alpha(
          theme.palette.primary.main,
          0.18
        )} 0%, transparent 60%)`;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      <Navbar />

      <Box
        component="main"
        sx={{
          flex: 1,
          width: "100%",
          py: { xs: 2, sm: 3, md: 4 },
          backgroundImage: glow,
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* ✅ This centers ALL pages and fixes “everything stuck to the left” */}
        <Container
          maxWidth={false}
          disableGutters
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
          }}
        >
          <Outlet />
        </Container>
      </Box>

      <Box sx={{ mt: { xs: 4, md: 6 } }}>
        <Footer />
      </Box>
    </Box>
  );

  

  
}
