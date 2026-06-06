// src/pages/CreateListing.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";

import { useAuth } from "../../auth/AuthContext";
import { houseApi } from "../../api/houseApi";

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "UNAVAILABLE", label: "Unavailable" },
  { value: "ARCHIVED", label: "Archived" },
];

function toNumber(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function getUserIdFromAuth(auth) {
  return (
    auth?.userId ||
    auth?.user_id ||
    auth?.user?.id ||
    auth?.user?.user_id ||
    auth?.user?.userId ||
    ""
  );
}

export default function CreateListing() {
  const navigate = useNavigate();
  const auth = useAuth();

  const isAuthed = !!auth?.isAuthed;
  const userId = useMemo(() => getUserIdFromAuth(auth), [auth]);

  const [form, setForm] = useState({
    title: "",
    location: "",
    description: "",
    price_per_room: "",
    total_rooms: "",
    status: "AVAILABLE",
    images: [""],
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const updateImage = (idx, val) => {
    setForm((p) => {
      const images = [...p.images];
      images[idx] = val;
      return { ...p, images };
    });
  };

  const addImage = () => setForm((p) => ({ ...p, images: [...p.images, ""] }));

  const removeImage = (idx) => {
    setForm((p) => {
      const next = p.images.filter((_, i) => i !== idx);
      return { ...p, images: next.length ? next : [""] };
    });
  };

  const validate = () => {
    if (!isAuthed || !userId) return "You must be logged in to create a listing.";
    if (!form.title.trim()) return "Title is required.";
    if (!form.location.trim()) return "Location is required.";
    const price = toNumber(form.price_per_room, NaN);
    if (!Number.isFinite(price) || price <= 0) return "Price per room must be a positive number.";
    const rooms = toNumber(form.total_rooms, NaN);
    if (!Number.isFinite(rooms) || rooms <= 0) return "Total rooms must be a positive number.";
    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    const payload = {
      owner_id: userId,
      title: form.title.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      price_per_room: toNumber(form.price_per_room, 0),
      total_rooms: toNumber(form.total_rooms, 0),
      occupied_rooms: 0,
      status: form.status,
      image_urls: form.images.map((s) => s.trim()).filter(Boolean),
    };

    try {
      setSubmitting(true);

      // ✅ FIX: houseApi.create(payload)
      const res = await houseApi.create(payload);

      const newId =
        res?.id || res?.house_id || res?.house?.id || res?.house?.house_id || null;

      // safest redirect
      navigate("/my-listings", { replace: true });

      // if you prefer:
      // if (newId) navigate(`/houses/${newId}`, { replace: true });
    } catch (err) {
      setError(err?.message || "Failed to create listing.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: 860,
        mx: "auto",
        p: { xs: 2, sm: 3 },
        borderRadius: 4,
        bgcolor: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
        Create Listing
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
        This will call the API Gateway.
      </Typography>

      {!isAuthed && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You must be logged in to create a listing.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {String(error)}
        </Alert>
      )}

      <form onSubmit={onSubmit}>
        <Stack spacing={2.2}>
          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            fullWidth
          />

          <TextField
            label="Location (City)"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            fullWidth
          />

          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            multiline
            minRows={4}
            fullWidth
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: "100%" }}>
            <TextField
              label="Price per room (MAD)"
              value={form.price_per_room}
              onChange={(e) => update("price_per_room", e.target.value)}
              inputMode="numeric"
              fullWidth
            />
            <TextField
              label="Total rooms"
              value={form.total_rooms}
              onChange={(e) => update("total_rooms", e.target.value)}
              inputMode="numeric"
              fullWidth
            />
          </Stack>

          <TextField
            select
            label="Status"
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            fullWidth
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <Divider sx={{ opacity: 0.2 }} />

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Images (URLs)
            </Typography>
            <Button
              type="button"
              startIcon={<AddIcon />}
              onClick={addImage}
              variant="text"
              sx={{ textTransform: "none" }}
            >
              Add image
            </Button>
          </Stack>

          <Stack spacing={1.2}>
            {form.images.map((url, idx) => (
              <Stack key={idx} direction="row" spacing={1} alignItems="center">
                <TextField
                  label={`Image URL #${idx + 1}`}
                  value={url}
                  onChange={(e) => updateImage(idx, e.target.value)}
                  fullWidth
                />
                <IconButton
                  type="button"
                  onClick={() => removeImage(idx)}
                  aria-label="Remove image"
                  sx={{ flex: "0 0 auto" }}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            ))}
          </Stack>

          <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
            <Button variant="contained" type="submit" disabled={!isAuthed || !userId || submitting}>
              {submitting ? "Creating..." : "Create"}
            </Button>
            <Button variant="outlined" type="button" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </form>
    </Paper>
  );
}
