import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
} from "@mui/material";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { useNavigate } from "react-router-dom";
import {
  listHouses,
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

function HouseCard({ h, onChangeStatus, onDelete, onRate, onOpen }) {
  const availableRooms = Math.max(0, h.total_rooms - h.occupied_rooms);
  const chip = statusChipProps(h.status);

  return (
    <Paper
      sx={{
        overflow: "hidden",
        transition: "transform 220ms ease, box-shadow 220ms ease",
        boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
        },
      }}
    >
      <Box
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" ? onOpen() : null)}
        sx={{
          height: 170,
          cursor: "pointer",
          backgroundImage: `url(${h.cover_image_url || ""})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "transform 280ms ease",
          "&:hover": {
            transform: "scale(1.04)",
          },
        }}
      />

      <Stack sx={{ p: 2 }} spacing={1.2}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Chip size="small" label={h.city || h.location} variant="outlined" />

          <Chip size="small" label={chip.label} color={chip.color} />
        </Stack>

        <Typography
          onClick={onOpen}
          sx={{ fontWeight: 800, lineHeight: 1.15, cursor: "pointer" }}
          title={h.title}
        >
          {h.title}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <StarRoundedIcon fontSize="small" />
          <Typography variant="body2" color="text.secondary">
            {h.rating?.toFixed(1)} / 5
          </Typography>
          <Chip
            size="small"
            label={`${availableRooms} free`}
            color={availableRooms > 0 ? "success" : "warning"}
            sx={{ ml: "auto" }}
          />
        </Stack>

        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {h.price_per_room.toLocaleString("fr-MA")} MAD{" "}
          <Typography component="span" variant="body2" color="text.secondary">
            / room
          </Typography>
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Occupancy: {h.occupied_rooms}/{h.total_rooms}
        </Typography>

        {/* Admin actions */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.5 }}>
          <Select
            size="small"
            value={h.status}
            onChange={(e) => onChangeStatus(h.id, e.target.value)}
            sx={{ flex: 1, borderRadius: 3 }}
          >
            <MenuItem value="AVAILABLE">AVAILABLE</MenuItem>
            <MenuItem value="UNAVAILABLE">UNAVAILABLE</MenuItem>
            <MenuItem value="ARCHIVED">ARCHIVED</MenuItem>
          </Select>

          <Button
            size="small"
            variant="outlined"
            onClick={() => onRate(h)}
            sx={{ borderRadius: 3 }}
          >
            Rate
          </Button>

          <IconButton
            size="small"
            onClick={() => onDelete(h)}
            sx={{
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 3,
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function AdminHouses() {
  const [filters, setFilters] = useState({
    q: "",
    minPrice: "",
    maxPrice: "",
    onlyAvailable: false,
    status: "all",
    sort: "newest",
  });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apiOk, setApiOk] = useState(true);
  const [items, setItems] = useState([]);

  // dialogs
  const [toDelete, setToDelete] = useState(null);
  const [rateTarget, setRateTarget] = useState(null);
  const [rating, setRating] = useState(4.0);

  async function load() {
    setLoading(true);
    try {
      const params = {
        search: filters.q || "",
        min_price: Number(filters.minPrice) || 0,
        max_price: Number(filters.maxPrice) || 0,
        order_by: filters.sort || "newest",
        status: filters.onlyAvailable
          ? "AVAILABLE"
          : filters.status === "all"
          ? ""
          : filters.status,
      };

      const res = await listHouses(params);
      setItems(res?.houses || []);
      setApiOk(true);
    } catch (e) {
      setApiOk(false);
      // fallback: garde items existants ou vide
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.q,
    filters.minPrice,
    filters.maxPrice,
    filters.onlyAvailable,
    filters.status,
    filters.sort,
  ]);

  const total = items.length;

  const headerRight = useMemo(() => {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {total} results
        </Typography>
      </Stack>
    );
  }, [total]);

  return (
    <Stack spacing={2.5}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-end"
      >
        <Box>
          <Typography variant="h4">Houses</Typography>
          <Typography color="text.secondary">
            Manage listings: status, rating, and removal.
          </Typography>
        </Box>
        {headerRight}
      </Stack>
      {!apiOk && (
        <Alert
          severity="warning"
          sx={{ borderRadius: 3, backgroundColor: "rgba(245,193,108,0.10)" }}
        >
          API Gateway / Admin gRPC not reachable — no data.
        </Alert>
      )}

      {/* Filters bar (pill style like your photo) */}
      <Paper sx={{ p: 1.2 }}>
        <Grid container spacing={1}>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="City / title"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              size="small"
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              placeholder="Min price"
              value={filters.minPrice}
              onChange={(e) =>
                setFilters((f) => ({ ...f, minPrice: e.target.value }))
              }
              size="small"
              inputProps={{ inputMode: "numeric" }}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              placeholder="Max price"
              value={filters.maxPrice}
              onChange={(e) =>
                setFilters((f) => ({ ...f, maxPrice: e.target.value }))
              }
              size="small"
              inputProps={{ inputMode: "numeric" }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <Select
              fullWidth
              size="small"
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
              sx={{ borderRadius: 999 }}
            >
              <MenuItem value="all">All status</MenuItem>
              <MenuItem value="AVAILABLE">AVAILABLE</MenuItem>
              <MenuItem value="UNAVAILABLE">UNAVAILABLE</MenuItem>
              <MenuItem value="ARCHIVED">ARCHIVED</MenuItem>
            </Select>
          </Grid>

          <Grid item xs={12} md={1}>
            <Select
              fullWidth
              size="small"
              value={filters.sort}
              onChange={(e) =>
                setFilters((f) => ({ ...f, sort: e.target.value }))
              }
              sx={{ borderRadius: 999 }}
            >
              <MenuItem value="newest">Newest</MenuItem>
              <MenuItem value="price_asc">Price ↑</MenuItem>
              <MenuItem value="price_desc">Price ↓</MenuItem>
            </Select>
          </Grid>

          <Grid item xs={12}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ px: 1, pt: 0.5 }}
            >
              <Switch
                checked={filters.onlyAvailable}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, onlyAvailable: e.target.checked }))
                }
              />
              <Typography variant="body2" color="text.secondary">
                Only available
              </Typography>

              <Box sx={{ flex: 1 }} />

              <Button
                size="small"
                variant="text"
                onClick={() =>
                  setFilters({
                    q: "",
                    minPrice: "",
                    maxPrice: "",
                    onlyAvailable: false,
                    status: "all",
                    sort: "newest",
                  })
                }
                sx={{ borderRadius: 999 }}
              >
                Reset filters
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Grid cards */}
      <Grid container spacing={2}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rounded" height={340} />
              </Grid>
            ))
          : items.map((h) => (
              <Grid item xs={12} sm={6} md={4} key={h.id}>
                <HouseCard
                  h={h}
                  onOpen={() => navigate(`/admin/houses/${h.id}`)}
                  onChangeStatus={async (id, status) => {
                    const map = {
                      AVAILABLE: "available",
                      UNAVAILABLE: "unavailable",
                      ARCHIVED: "archived",
                    };
                    await setHouseStatus(id, map[status] || "available");
                    await load();
                  }}
                  onDelete={(house) => setToDelete(house)}
                  onRate={(house) => {
                    setRateTarget(house);
                    setRating(house.rating ?? 4.0);
                  }}
                />
              </Grid>
            ))}
      </Grid>

      {/* Delete confirm */}
      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete house?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This will remove: <b>{toDelete?.title}</b>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={async () => {
              await deleteHouse(toDelete.id);
              setToDelete(null);
              await load();
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rating dialog */}
      <Dialog
        open={!!rateTarget}
        onClose={() => setRateTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Set rating</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography color="text.secondary">{rateTarget?.title}</Typography>
            <Slider
              value={rating}
              onChange={(_, v) => setRating(Array.isArray(v) ? v[0] : v)}
              min={1}
              max={5}
              step={1}
              valueLabelDisplay="auto"
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={`${Number(rating)} / 5`} color="primary" />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setRateTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              const r = Math.min(5, Math.max(1, Math.round(rating)));
              await setHouseRating(rateTarget.id, r);
              setRateTarget(null);
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
