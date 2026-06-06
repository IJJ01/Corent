import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha, useTheme } from "@mui/material/styles";

import PageShell from "../../components/layout/PageShell";
import { useAuth } from "../../auth/AuthContext";
import { houseApi } from "../../api/houseApi";

const STATUS_ENUM_TO_LABEL = {
  0: "AVAILABLE",
  1: "UNAVAILABLE",
  2: "ARCHIVED",
};
const STATUS_LABELS = ["AVAILABLE", "UNAVAILABLE", "ARCHIVED"];

const isPositiveNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
};

export default function EditListing() {
  const theme = useTheme();

  const { id } = useParams();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const uid = useMemo(() => String(userId || ""), [userId]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    location: "",
    description: "",
    price_per_room: "",
    total_rooms: "",
    status: "AVAILABLE",
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let alive = true;

    async function load() {
      setError("");
      setLoading(true);

      try {
        const res = await houseApi.get(id);
        const h = res?.house ?? res;

        if (!alive) return;

        if (uid && h?.owner_id && String(h.owner_id) !== String(uid)) {
          setError("You are not the owner of this listing.");
        }

        setForm({
          title: h?.title ?? "",
          location: h?.location ?? "",
          description: h?.description ?? "",
          price_per_room: h?.price_per_room ?? "",
          total_rooms: h?.total_rooms ?? "",
          status:
            typeof h?.status === "number"
              ? STATUS_ENUM_TO_LABEL[h.status] ?? "AVAILABLE"
              : h?.status ?? "AVAILABLE",
        });
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load listing");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (id) load();
    return () => {
      alive = false;
    };
  }, [id, uid]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!uid) return setError("You must be logged in.");
    if (!form.title.trim()) return setError("Title is required.");
    if (!form.location.trim()) return setError("Location is required.");
    if (!isPositiveNumber(form.price_per_room)) return setError("Price per room must be > 0.");
    if (!isPositiveNumber(form.total_rooms)) return setError("Total rooms must be > 0.");

    const payload = {
      title: form.title.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      price_per_room: Number(form.price_per_room),
      total_rooms: Number(form.total_rooms),
      status: form.status,
    };

    try {
      setSaving(true);

      // ✅ FIX: update(id, payload)
      await houseApi.update(id, payload);

      navigate("/my-listings");
    } catch (e2) {
      setError(e2?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const glassBg =
    theme.palette.mode === "dark" ? "rgba(20,20,28,0.65)" : "rgba(255,255,255,0.85)";
  const glassBorder =
    theme.palette.mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";

  return (
    <PageShell variant="narrow">
      <Paper
        sx={{
          width: "100%",
          p: { xs: 2.5, md: 3 },
          borderRadius: 4,
          background: glassBg,
          backdropFilter: "blur(12px)",
          border: `1px solid ${glassBorder}`,
          boxShadow:
            theme.palette.mode === "dark"
              ? `0 18px 50px ${alpha("#000", 0.45)}`
              : `0 18px 50px ${alpha("#000", 0.12)}`,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Edit Listing
        </Typography>

        <Typography sx={{ mt: 0.5, opacity: 0.75 }}>Listing ID: {id}</Typography>

        <Divider sx={{ my: 2, opacity: 0.25 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 2 }}>
            <CircularProgress size={20} />
            <Typography sx={{ opacity: 0.8 }}>Loading...</Typography>
          </Box>
        ) : (
          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
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
                fullWidth
                multiline
                minRows={4}
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Price per room (MAD)"
                  value={form.price_per_room}
                  onChange={(e) => update("price_per_room", e.target.value)}
                  fullWidth
                  inputMode="numeric"
                />
                <TextField
                  label="Total rooms"
                  value={form.total_rooms}
                  onChange={(e) => update("total_rooms", e.target.value)}
                  fullWidth
                  inputMode="numeric"
                />
              </Stack>

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={form.status} onChange={(e) => update("status", e.target.value)}>
                  {STATUS_LABELS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <Button variant="contained" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outlined" onClick={() => navigate(-1)} disabled={saving}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </form>
        )}
      </Paper>
    </PageShell>
  );
}
