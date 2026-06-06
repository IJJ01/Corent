import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Select,
  MenuItem,
  Stack,
  Typography,
  Skeleton,
  Divider,
  Slider,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StarRoundedIcon from "@mui/icons-material/StarRounded";

import {
  getHouseDetails,
  setHouseStatus,
  setHouseRating,
  deleteHouse,
} from "../../api/adminApi";

function statusChipProps(status) {
  if (status === "AVAILABLE") return { label: "Available", color: "success" };
  if (status === "UNAVAILABLE")
    return { label: "Unavailable", color: "warning" };
  return { label: "Archived", color: "default" };
}

export default function AdminHouseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [apiOk, setApiOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [house, setHouse] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rating, setRating] = useState(4.0);

  async function load() {
    setLoading(true);
    try {
      const resp = await getHouseDetails(id);

      if (!resp?.found) {
        setHouse(null);
        setApiOk(true);
        return;
      }

      const h = resp.house || {};
      const cover =
        (resp.image_urls && resp.image_urls[0]) ||
        h.cover_image_url ||
        "https://via.placeholder.com/1200x600?text=No+Image";

      const mapped = {
        ...h,
        // ton UI utilise ces champs :
        cover_url: cover,
        address: h.location || "", // tu affiches house.address, mais proto a location
        city: h.city || "", // peut être vide chez toi
        description: resp.description || "",
        amenities: [], // pas fourni par proto, laisse vide
      };

      setHouse(mapped);
      setRating(mapped.rating ?? 4.0);
      setApiOk(true);
    } catch (e) {
      setApiOk(false);
      setHouse(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={220} />
        <Skeleton variant="rounded" height={160} />
        <Skeleton variant="rounded" height={160} />
      </Stack>
    );
  }

  if (!house) {
    return (
      <Paper sx={{ p: 2.2 }}>
        <Typography variant="h6">House not found</Typography>
        <Button
          sx={{ mt: 2 }}
          variant="outlined"
          onClick={() => navigate("/admin/houses")}
        >
          Back to houses
        </Button>
      </Paper>
    );
  }

  const chip = statusChipProps(house.status);
  const freeRooms = Math.max(0, house.total_rooms - house.occupied_rooms);

  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <IconButton
          onClick={() => navigate("/admin/houses")}
          sx={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 3 }}
        >
          <ArrowBackIcon />
        </IconButton>

        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ lineHeight: 1.1 }}>
            {house.title}
          </Typography>
          <Typography color="text.secondary">{house.address}</Typography>
        </Box>

        <Chip size="small" label={chip.label} color={chip.color} />
        <Chip
          size="small"
          label={house.city || house.location || "—"}
          variant="outlined"
        />
      </Stack>
      {!apiOk && (
        <Alert
          severity="warning"
          sx={{ borderRadius: 3, backgroundColor: "rgba(245,193,108,0.10)" }}
        >
          API Gateway / Admin gRPC not reachable.
        </Alert>
      )}

      {/* Cover + Quick info */}
      <Paper sx={{ overflow: "hidden" }}>
        <Box
          sx={{
            height: 260,
            backgroundImage: `url(${house.cover_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <Stack sx={{ p: 2.2 }} spacing={1.4}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">Overview</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <StarRoundedIcon fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {house.rating?.toFixed(1)} / 5
              </Typography>
              <Chip
                size="small"
                label={`${freeRooms} free`}
                color={freeRooms > 0 ? "success" : "warning"}
              />
            </Stack>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            divider={<Divider flexItem />}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                Price / room
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {Number(house.price_per_room || 0).toLocaleString("fr-MA")} MAD
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                Rooms
              </Typography>
              <Typography sx={{ fontWeight: 800 }}>
                {house.occupied_rooms}/{house.total_rooms} occupied
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                ID
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {house.id}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      {/* Details + Actions */}
      <Paper sx={{ p: 2.2 }}>
        <Stack spacing={1.6}>
          <Typography variant="h6">Details</Typography>
          <Typography color="text.secondary">{house.description}</Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            {(house.amenities || []).map((a) => (
              <Chip key={a} size="small" label={a} variant="outlined" />
            ))}
          </Stack>

          <Divider />

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.2}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            {/* STATUS */}
            <Stack sx={{ flex: 1 }} spacing={0.6}>
              <Typography variant="body2" color="text.secondary">
                Availability / Status
              </Typography>
              <Select
                size="small"
                value={house.status}
                onChange={async (e) => {
                  const status = e.target.value;
                  const map = {
                    AVAILABLE: "available",
                    UNAVAILABLE: "unavailable",
                    ARCHIVED: "archived",
                  };
                  await setHouseStatus(house.id, map[status] || "available");
                  await load();
                }}
                sx={{ borderRadius: 3 }}
              >
                <MenuItem value="AVAILABLE">AVAILABLE</MenuItem>
                <MenuItem value="UNAVAILABLE">UNAVAILABLE</MenuItem>
                <MenuItem value="ARCHIVED">ARCHIVED</MenuItem>
              </Select>
            </Stack>

            {/* RATING */}
            <Button
              variant="outlined"
              onClick={() => setRateOpen(true)}
              sx={{ borderRadius: 3, alignSelf: "end" }}
            >
              Set rating
            </Button>

            {/* DELETE */}
            <Button
              color="warning"
              variant="contained"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => setDeleteOpen(true)}
              sx={{ borderRadius: 3, alignSelf: "end" }}
            >
              Delete
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Delete dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete house?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This will remove: <b>{house.title}</b>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={async () => {
              await deleteHouse(house.id);
              setDeleteOpen(false);
              navigate("/admin/houses");
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rating dialog */}
      <Dialog
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Set rating</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography color="text.secondary">{house.title}</Typography>
            <Slider
              value={rating}
              onChange={(_, v) => setRating(Array.isArray(v) ? v[0] : v)}
              min={1}
              max={5}
              step={1}
              valueLabelDisplay="auto"
            />
            <Chip label={`${Number(rating).toFixed(1)} / 5`} color="primary" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setRateOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              const r = Math.min(5, Math.max(1, Math.round(Number(rating))));
              await setHouseRating(house.id, r);
              setRateOpen(false);
              await load();
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
