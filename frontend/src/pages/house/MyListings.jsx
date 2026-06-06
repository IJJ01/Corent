import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";

import { alpha, useTheme } from "@mui/material/styles";

import PageShell from "../../components/layout/PageShell";

import { useAuth } from "../../auth/AuthContext";
import { houseApi } from "../../api/houseApi";

function formatMAD(amount) {
  const n = Number(amount || 0);
  return `${new Intl.NumberFormat("fr-MA").format(n)} MAD`;
}

function availabilityChip(h) {
  const total = Number(h?.total_rooms || 0);
  const occupied = Number(h?.occupied_rooms || 0);
  const available = Math.max(total - occupied, 0);
  const full = available <= 0;
  return { label: full ? "Full" : `${available} available`, full };
}

export default function MyListings() {
  const nav = useNavigate();
  const theme = useTheme();
  const { userId } = useAuth();

  const [error, setError] = useState("");
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await houseApi.mine(userId);

      // ✅ accept BOTH response shapes:
      // - array (mock or gateway)
      // - { houses: [...] } (some implementations)
      const list = Array.isArray(data) ? data : data?.houses || [];
      setHouses(list);
    } catch (e) {
      setError(e?.message || "Failed to load listings");
      setHouses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setHouses([]);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const glow =
    theme.palette.mode === "light"
      ? `radial-gradient(1100px 420px at 20% 0%, ${alpha(
          theme.palette.primary.main,
          0.08
        )} 0%, transparent 60%)`
      : `radial-gradient(1100px 420px at 20% 0%, ${alpha(
          theme.palette.primary.main,
          0.16
        )} 0%, transparent 60%)`;

  const rows = useMemo(() => houses || [], [houses]);

  return (
    <PageShell variant="wide">
      <Box sx={{ width: "100%" }}>
        {/* Full width shell inside AppLayout container */}
        <Paper
          sx={{
            width: "100%",
            p: { xs: 2, md: 3 },
            borderRadius: 4,
            backgroundImage: glow,
            backgroundColor:
              theme.palette.mode === "dark"
                ? "rgba(20,20,28,0.65)"
                : "rgba(255,255,255,0.72)",
            backdropFilter: "blur(12px)",
            border: "1px solid",
            borderColor: alpha(
              theme.palette.common.white,
              theme.palette.mode === "dark" ? 0.1 : 0.18
            ),
          }}
        >
          {/* Header */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1.1 }}>
                My Listings
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Manage your houses: edit details or delete a listing.
              </Typography>
            </Box>

            <Button
              variant="contained"
              onClick={() => nav("/create")}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                py: 1.2,
                px: 2.2,
                alignSelf: { xs: "flex-start", sm: "auto" },
              }}
            >
              Create listing
            </Button>
          </Stack>

          {!userId && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please login to see your listings.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Content */}
          {loading ? (
            <Typography sx={{ opacity: 0.75 }}>Loading...</Typography>
          ) : rows.length === 0 ? (
            <Typography sx={{ opacity: 0.75 }}>No listings yet.</Typography>
          ) : (
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                borderColor: alpha(
                  theme.palette.common.white,
                  theme.palette.mode === "dark" ? 0.1 : 0.22
                ),
                backgroundColor: alpha(
                  theme.palette.common.black,
                  theme.palette.mode === "dark" ? 0.18 : 0.02
                ),
              }}
            >
              {/* Header row */}
              <Box
                sx={{
                  px: { xs: 2, md: 2.5 },
                  py: 1.5,
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "2.2fr 1.2fr 1fr 1fr 1.4fr",
                  },
                  gap: 1.5,
                  alignItems: "center",
                  bgcolor: alpha(
                    theme.palette.common.black,
                    theme.palette.mode === "dark" ? 0.25 : 0.04
                  ),
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 900 }}
                >
                  Title
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontWeight: 900,
                    display: { xs: "none", md: "block" },
                  }}
                >
                  Location
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontWeight: 900,
                    display: { xs: "none", md: "block" },
                  }}
                >
                  Price / room
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontWeight: 900,
                    display: { xs: "none", md: "block" },
                  }}
                >
                  Rooms
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 900, textAlign: { md: "right" } }}
                >
                  Actions
                </Typography>
              </Box>

              <Divider />

              {/* Rows */}
              <Stack divider={<Divider />} sx={{ width: "100%" }}>
                {rows.map((h) => {
                  const { label, full } = availabilityChip(h);

                  return (
                    <Box
                      key={h.id}
                      sx={{
                        px: { xs: 2, md: 2.5 },
                        py: 1.75,
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          md: "2.2fr 1.2fr 1fr 1fr 1.4fr",
                        },
                        gap: 1.5,
                        alignItems: "center",
                      }}
                    >
                      {/* Title + mobile details */}
                      <Box sx={{ minWidth: 0 }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                        >
                          <Typography sx={{ fontWeight: 950 }} noWrap>
                            {h.title}
                          </Typography>

                          <Chip
                            size="small"
                            label={label}
                            sx={{
                              borderRadius: 999,
                              fontWeight: 900,
                              bgcolor: full
                                ? alpha(
                                    theme.palette.text.primary,
                                    theme.palette.mode === "dark" ? 0.12 : 0.08
                                  )
                                : alpha(
                                    theme.palette.success.main,
                                    theme.palette.mode === "dark" ? 0.2 : 0.12
                                  ),
                              color: full
                                ? "text.secondary"
                                : theme.palette.success.main,
                            }}
                          />
                        </Stack>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5, display: { xs: "block", md: "none" } }}
                        >
                          {h.location} • {formatMAD(h.price_per_room)} / room •{" "}
                          {h.occupied_rooms}/{h.total_rooms}
                        </Typography>
                      </Box>

                      {/* Desktop cols */}
                      <Typography sx={{ display: { xs: "none", md: "block" } }}>
                        {h.location}
                      </Typography>

                      <Typography
                        sx={{
                          display: { xs: "none", md: "block" },
                          fontWeight: 900,
                        }}
                      >
                        {formatMAD(h.price_per_room)}
                      </Typography>

                      <Typography sx={{ display: { xs: "none", md: "block" } }}>
                        {h.occupied_rooms}/{h.total_rooms}
                      </Typography>

                      {/* Actions */}
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent={{ xs: "flex-start", md: "flex-end" }}
                      >
                        <Button
                          variant="outlined"
                          // ✅ FIX: route matches your router: /edit/:id
                          onClick={() => nav(`/edit/${h.id}`)}
                          sx={{ textTransform: "none", borderRadius: 2 }}
                        >
                          Edit
                        </Button>

                        <Button
                          variant="contained"
                          color="error"
                          onClick={async () => {
                            if (!confirm("Delete this listing?")) return;
                            try {
                              // ✅ safe call signature: remove(id)
                              await houseApi.remove(h.id);
                              await load();
                            } catch (e) {
                              setError(e?.message || "Failed to delete listing");
                            }
                          }}
                          sx={{ textTransform: "none", borderRadius: 2 }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          )}
        </Paper>
      </Box>
    </PageShell>
  );
}
