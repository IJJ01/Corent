import Alert from "@mui/material/Alert";

export default function ApiStatusBanner({ mode }) {
  if (mode === "api") return null;

  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      API Gateway not reachable — showing mock data.
    </Alert>
  );
}
