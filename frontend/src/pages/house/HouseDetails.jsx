import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import BedOutlinedIcon from "@mui/icons-material/BedOutlined";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";

import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";

import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";

import PageShell from "../../components/layout/PageShell";
import HouseGallery from "../../components/houses/HouseGallery";
import { houseApi } from "../../api/houseApi";

import { useAuth } from "../../auth/AuthContext";
import { applicationApi } from "../../api/applicationApi";
import { reportApi } from "../../api/reportApi";

function formatMAD(amount) {
  return new Intl.NumberFormat("fr-MA").format(Number(amount || 0)) + " MAD";
}

function normalizeImages(images) {
  if (!images) return [];
  if (Array.isArray(images)) return images.filter(Boolean);
  if (typeof images === "string") return [images];
  return [];
}

function StatCard({ icon, label, value }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: "grid",
          placeItems: "center",
          bgcolor: (t) =>
            t.palette.mode === "dark"
              ? "rgba(255,255,255,0.06)"
              : "rgba(15,23,42,0.04)",
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 900, lineHeight: 1.25 }}>
          {value}
        </Typography>
      </Box>
    </Paper>
  );
}

export default function HouseDetails() {
  const { id } = useParams();
  const mock = useMemo(() => false, []);

  const { isAuthed, userId } = useAuth();

  const [house, setHouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Apply state
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  // Report state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);

      try {
        const data = await houseApi.get(id);
        const h = data?.house ?? data; // support both shapes

        if (!cancelled) {
          setHouse(h);

          // Check if already applied (mock-ready, doesn't break if endpoint changes later)
          if (isAuthed) {
            try {
              const mine = await applicationApi.listMy({ pageSize: 200 });
              const already = mine.some(
                (a) =>
                  String(a?.house_id) === String(id) &&
                  String(a?.applicant_id) === String(userId)
              );
              setApplied(already);
            } catch {
              setApplied(false);
            }
          } else {
            setApplied(false);
          }
        }
      } catch {
        if (!cancelled) {
          setHouse(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id, mock, isAuthed, userId]);

  const handleApply = async () => {
    if (!isAuthed) {
      setToast({ type: "warning", text: "Please login first to apply." });
      return;
    }
    if (!house?.id) return;

    setApplying(true);
    try {
      const out = await applicationApi.apply(house.id, "Hi, I'm interested!");
      if (out?.already_applied) {
        setApplied(true);
        setToast({ type: "info", text: "You already applied to this listing." });
      } else if (out?.ok) {
        setApplied(true);
        setToast({ type: "success", text: "Application sent successfully ✅" });
      } else {
        setToast({ type: "error", text: out?.message || "Failed to apply." });
      }
    } catch (e) {
      setToast({ type: "error", text: e?.message || "Failed to apply." });
    } finally {
      setApplying(false);
    }
  };

  const handleOpenReport = () => {
    if (!isAuthed) {
      setToast({ type: "warning", text: "Please login first to report." });
      return;
    }
    setReportOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!house?.id) return;

    setReporting(true);
    try {
      const out = await reportApi.reportHouse(house.id, reportReason);
      if (out?.ok) {
        setToast({ type: "success", text: "Report submitted. Thank you." });
        setReportOpen(false);
        setReportReason("");
      } else {
        setToast({ type: "error", text: out?.message || "Failed to submit report." });
      }
    } catch (e) {
      setToast({ type: "error", text: e?.message || "Failed to submit report." });
    } finally {
      setReporting(false);
    }
  };
const isOwner = Boolean(house?.owner_id) && String(house?.owner_id) === String(userId);

  return (
    <PageShell variant="wide">
      <Box sx={{ maxWidth: 1200, mx: "auto", width: "100%", px: { xs: 2, md: 0 } }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress />
          </Box>
        ) : notFound || !house ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Listing not found
            </Typography>
            <Typography sx={{ mt: 1, opacity: 0.8 }}>
              The listing may have been removed or the ID is invalid.
            </Typography>
          </Paper>
        ) : (
          (() => {
            const total = Number(house.total_rooms || 0);
            const occupied = Number(house.occupied_rooms || 0);
            const availableRooms = Math.max(total - occupied, 0);
            const isAvailable = availableRooms > 0;

            // accept either images[] or image_urls[]
            const images = normalizeImages(house.images || house.image_urls);

            return (
              <Stack spacing={3}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 1.5, md: 2 },
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <Stack spacing={2}>
                    <Box sx={{ position: "relative" }}>
                      <HouseGallery images={images} />
                      <Box
                        sx={{
                          position: "absolute",
                          left: 14,
                          top: 14,
                          display: "flex",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <Chip
                          size="small"
                          icon={<PlaceOutlinedIcon />}
                          label={house.location || "Unknown"}
                          sx={{
                            borderRadius: 999,
                            bgcolor: (t) =>
                              t.palette.mode === "dark"
                                ? "rgba(15,23,42,0.65)"
                                : "rgba(255,255,255,0.75)",
                            backdropFilter: "blur(10px)",
                          }}
                        />
                        <Chip
                          size="small"
                          label={isAvailable ? `${availableRooms} rooms available` : "Full"}
                          color={isAvailable ? "success" : "default"}
                          sx={{
                            borderRadius: 999,
                            bgcolor: (t) =>
                              t.palette.mode === "dark"
                                ? "rgba(15,23,42,0.65)"
                                : "rgba(255,255,255,0.75)",
                            backdropFilter: "blur(10px)",
                          }}
                        />
                        <Chip
                          size="small"
                          label={(house.status || "AVAILABLE").toString()}
                          sx={{
                            borderRadius: 999,
                            bgcolor: (t) =>
                              t.palette.mode === "dark"
                                ? "rgba(15,23,42,0.65)"
                                : "rgba(255,255,255,0.75)",
                            backdropFilter: "blur(10px)",
                          }}
                        />
                      </Box>
                    </Box>

                    <Stack spacing={0.5}>
                      <Typography variant="h4" sx={{ fontWeight: 950, letterSpacing: -0.5 }}>
                        {house.title}
                      </Typography>
                      <Typography color="text.secondary">
                        A comfortable place to co-rent — review details and apply in one click.
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>

                <Grid container spacing={3} alignItems="flex-start">
                  <Grid item xs={12} md={8}>
                    <Stack spacing={2.5}>
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={4}>
                          <StatCard
                            icon={<PaymentsOutlinedIcon fontSize="small" />}
                            label="Price / room"
                            value={formatMAD(house.price_per_room)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <StatCard
                            icon={<BedOutlinedIcon fontSize="small" />}
                            label="Occupancy"
                            value={`${occupied}/${total}`}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <StatCard
                            icon={<MeetingRoomOutlinedIcon fontSize="small" />}
                            label="Availability"
                            value={`${availableRooms}/${total}`}
                          />
                        </Grid>
                      </Grid>

                      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
                        <Stack spacing={1.25}>
                          <Typography variant="h6" sx={{ fontWeight: 950 }}>
                            Description
                          </Typography>
                          <Divider />
                          <Typography sx={{ whiteSpace: "pre-wrap", opacity: 0.95 }}>
                            {house.description || "No description."}
                          </Typography>
                        </Stack>
                      </Paper>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box sx={{ position: { md: "sticky" }, top: { md: 88 } }}>
                      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
                        <Stack spacing={2}>
                          <Box>
                            <Stack direction="row" alignItems="baseline" spacing={1} flexWrap="wrap">
                              <Typography variant="h4" sx={{ fontWeight: 950, letterSpacing: -0.5 }}>
                                {formatMAD(house.price_per_room)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                / room
                              </Typography>
                            </Stack>
                            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                              Availability: {availableRooms} / {total} rooms
                            </Typography>
                          </Box>

                          <Button
                            variant="contained"
                            size="large"
                            sx={{ borderRadius: 2.5, py: 1.25 }}
                            onClick={handleApply}
                            disabled={isOwner || applying || applied || !isAvailable}
                          >
                            {!isAvailable
                              ? "No rooms available"
                              : applied
                              ? "Applied ✅"
                              : applying
                              ? "Applying…"
                              : "Apply for this house"}
                          </Button>

                          <Button
                            variant="contained"
                            color="error"
                            size="large"
                            startIcon={<ReportProblemOutlinedIcon />}
                            sx={{
                              borderRadius: 2.5,
                              py: 1.25,
                              fontWeight: 800,
                              boxShadow: "none",
                              "&:hover": {
                                boxShadow: "none",
                                bgcolor: (t) => t.palette.error.dark,
                              },
                               
                            }}
                            onClick={handleOpenReport}
                            disabled= {isOwner}
                          >
                            Report listing
                          </Button>

                          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.9 }}>
                            By applying, you agree to follow house rules and platform policy.
                          </Typography>
                        </Stack>
                      </Paper>
                    </Box>
                  </Grid>
                </Grid>
              </Stack>
            );
          })()
        )}
      </Box>

      {/* Report dialog (does not affect layout) */}
      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Report listing</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Tell us what’s wrong with this listing.
          </Typography>
          <TextField
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Reason (optional)"
            fullWidth
            multiline
            minRows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleSubmitReport} disabled={reporting}>
            {reporting ? "Sending…" : "Submit report"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast (does not affect layout) */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.type || "info"} variant="filled" onClose={() => setToast(null)}>
            {toast.text}
          </Alert>
        ) : null}
      </Snackbar>
    </PageShell>
  );
}
