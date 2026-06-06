import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 4,
        textAlign: "center",
        border: (t) =>
          t.palette.mode === "dark"
            ? "1px dashed rgba(255,255,255,0.16)"
            : "1px dashed rgba(18,16,38,0.18)",
        backgroundColor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(255,255,255,0.03)"
            : "rgba(18,16,38,0.02)",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
          {description}
        </Typography>
      ) : null}

      {actionLabel && onAction ? (
        <Button sx={{ mt: 2 }} onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Box>
  );
}
