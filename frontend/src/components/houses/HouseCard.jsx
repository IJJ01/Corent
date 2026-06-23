import { Link as RouterLink } from "react-router-dom";
import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Typography,
  Box,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

function formatMAD(amount) {
  return new Intl.NumberFormat("fr-MA").format(Number(amount || 0)) + " MAD";
}

function firstImage(images) {
  if (!images) return "";
  if (Array.isArray(images)) return images.find(Boolean) || "";
  if (typeof images === "string") return images;
  return "";
}

export default function HouseCard({ house }) {
  const id = house?.id;
  const img = firstImage(house?.images);

  const total = Number(house?.total_rooms || 0);
  const occupied = Number(house?.occupied_rooms || 0);
  const availableRooms = Math.max(0, total - occupied);
  const isAvailable = availableRooms > 0;

  return (
    <Card
      sx={(theme) => ({
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 1.5,
        overflow: "hidden",
        fontFamily:'"Montserrat", sans-serif',
        minWidth: "250px",
        transition: "transform 140ms ease, box-shadow 140ms ease",
        "&:hover": {
          boxShadow: theme.shadows[3],
        },
      })}
    >
      <CardActionArea
        component={RouterLink}
        to={`/houses/${id}`}
        sx={{ height: "100%", display: "flex", alignItems: "stretch" }}
      >
        <Box sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
          <CardMedia
            component="img"
            height="180"
            image={img || "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200"}
            alt={house?.title || "House"}
            loading="lazy"
            sx={{ objectFit: "cover" }}
          />

          <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
              <Chip
                size="small"
                label={house?.location || "Unknown"}
                sx={{ borderRadius: 999 }}
              />
              <Chip
                size="small"
                label={isAvailable ? `${availableRooms} available` : "Full"}
                sx={(theme) => ({
                  borderRadius: 999,
                  bgcolor: isAvailable
                    ? alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.22 : 0.14)
                    : alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.10 : 0.06),
                  color: isAvailable ? theme.palette.success.main : theme.palette.text.secondary,
                  fontWeight: 800,
                })}
              />
            </Stack>

            <Typography variant="subtitle1" sx={{ fontWeight: 900 }} noWrap>
              {house?.title || "Untitled"}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.6 }}
              noWrap
            >
              {house?.description || "No description."}
            </Typography>

            <Box sx={{ mt: "auto", pt: 1.6 }}>
              <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1.1 }}>
                {formatMAD(house?.price_per_room)}
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  / room
                </Typography>
              </Typography>

              <Typography variant="caption" color="text.secondary">
                Occupancy: {occupied}/{total}
              </Typography>
            </Box>
          </CardContent>
        </Box>
      </CardActionArea>
    </Card>
  );
}
