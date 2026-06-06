import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        alignItems: { xs: "flex-start", md: "center" },
        justifyContent: "space-between",
        flexDirection: { xs: "column", md: "row" },
        mb: 2.5,
      }}
    >
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      {actions ? <Box sx={{ display: "flex", gap: 1 }}>{actions}</Box> : null}
    </Box>
  );
}
