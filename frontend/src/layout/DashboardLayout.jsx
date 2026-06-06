
import { Outlet } from "react-router-dom";
import { Box, Container, Paper } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import Navbar from "../components/layout/Navbar";

export default function DashboardLayout() {
  const theme = useTheme();

  const glow =
    theme.palette.mode === "light"
      ? `radial-gradient(900px 420px at 25% 0%, ${alpha(
          theme.palette.primary.main,
          0.10
        )} 0%, transparent 60%)`
      : `radial-gradient(900px 420px at 25% 0%, ${alpha(
          theme.palette.primary.main,
          0.18
        )} 0%, transparent 60%)`;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      <Box sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
        {/* ✅ FULL WIDTH container */}
        <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              overflow: "hidden",
              borderRadius: { xs: 4, md: 6 },
              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              bgcolor: "background.paper",
              color: "text.primary",
              boxShadow: theme.shadows[2],
              backgroundImage: glow,
              backgroundRepeat: "no-repeat",
              p: { xs: 2, sm: 3, md: 4 },
            }}
          >
            <Outlet />
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
