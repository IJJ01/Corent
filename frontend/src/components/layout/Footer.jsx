import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default function Footer() {
  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider", py: 2 }}>
      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Co‑Rent. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
