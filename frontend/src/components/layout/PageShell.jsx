import { Box } from "@mui/material";

export default function PageShell({
  children,
  variant = "wide", // wide | narrow
  sx,
}) {
  const maxW = variant === "narrow" ? 860 : 1400;

  return (
    <Box
      sx={{
        width: "100%",
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 3 },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: maxW,
          mx: "auto",
          ...sx,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
