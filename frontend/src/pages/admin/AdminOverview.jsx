import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Grid,
  Paper,
  Button,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { getAdminOverview } from "../../api/adminApi";
import { useNavigate } from "react-router-dom";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import HomeWorkOutlinedIcon from "@mui/icons-material/HomeWorkOutlined";
import ReportGmailerrorredOutlinedIcon from "@mui/icons-material/ReportGmailerrorredOutlined";

const MOCK = {
  totals: {
    total_users: 128,
    banned_users: 4,
    total_houses: 42,
    available_houses: 18,
    reports_open: 7,
  },
  recent: [
    {
      type: "user",
      label: "User banned",
      meta: "reason: spam • user_77",
      at: "2h ago",
    },
    {
      type: "house",
      label: "House status changed",
      meta: "UNAVAILABLE • Marrakech",
      at: "4h ago",
    },
    {
      type: "report",
      label: "Report resolved",
      meta: "Noise complaint • rep_002",
      at: "1d ago",
    },
  ],
};
function mapOverview(api) {
  const events = (api?.recent_events || []).map((e) => {
    const type =
      e.type === "BAN_LOG" ? "user" : e.type === "RATING_LOG" ? "house" : "report";

    return {
      type,
      label: e.message || "Event",
      meta: e.id || "",
      at: e.created_at ? new Date(e.created_at).toLocaleString() : "",
    };
  });

  return {
    totals: {
      total_users: api?.total_users ?? 0,
      banned_users: api?.total_banned_users ?? 0,
      total_houses: api?.total_houses ?? 0,
      available_houses: 0, // (ton backend ne donne pas ça pour le moment)
      reports_open: 0,     // (ton backend ne donne pas ça pour le moment)
    },
    recent: events,
  };
}


function StatCard({ title, value, hint, chip, onClick }) {
  return (
    <Paper
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" ? onClick?.() : null)}
      sx={{
        p: 2.2,
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
        position: "relative",

        // premium surface
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
        transition:
          "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
        boxShadow: "0 10px 24px rgba(0,0,0,0.45)",

        "&:hover": onClick
          ? {
              transform: "translateY(-6px)",
              boxShadow: "0 18px 44px rgba(0,0,0,0.60)",
              borderColor: "rgba(255,255,255,0.16)",
            }
          : {},
      }}
    >
      {/* soft glow accent */}
      <Box
        sx={{
          position: "absolute",
          inset: -80,
          background:
            "radial-gradient(closest-side, rgba(109,94,246,0.18), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <Stack spacing={1.1} sx={{ position: "relative" }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontWeight: 700 }}
          >
            {title}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            {chip ? (
              <Chip
                size="small"
                label={chip.label}
                color={chip.color}
                sx={{
                  fontWeight: 800,
                  px: 0.6,
                  borderRadius: 999,
                }}
              />
            ) : null}

            {onClick ? (
              <ChevronRightRoundedIcon sx={{ opacity: 0.65 }} />
            ) : null}
          </Stack>
        </Stack>

        <Typography
          variant="h3"
          sx={{
            fontWeight: 900,
            letterSpacing: -0.8,
            lineHeight: 1.05,
          }}
        >
          {value}
        </Typography>

        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {hint}
        </Typography>
      </Stack>
    </Paper>
  );
}
function eventMeta(type) {
  if (type === "ban" || type === "user") {
    return {
      label: "Users",
      icon: <PersonOutlineIcon fontSize="small" />,
      glow: "rgba(109,94,246,0.22)",
    };
  }
  if (type === "house") {
    return {
      label: "Houses",
      icon: <HomeWorkOutlinedIcon fontSize="small" />,
      glow: "rgba(56,210,125,0.16)",
    };
  }
  return {
    label: "Reports",
    icon: <ReportGmailerrorredOutlinedIcon fontSize="small" />,
    glow: "rgba(245,193,108,0.18)",
  };
}

function EventRow({ e, onClick }) {
  const meta = eventMeta(e.type);

  return (
    <Paper
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(ev) => (ev.key === "Enter" ? onClick?.() : null)}
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 3,
        cursor: onClick ? "pointer" : "default",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        transition:
          "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
        "&:hover": onClick
          ? {
              transform: "translateY(-4px)",
              boxShadow: "0 16px 36px rgba(0,0,0,0.55)",
              borderColor: "rgba(255,255,255,0.16)",
            }
          : {},
      }}
    >
      <Stack direction="row" spacing={1.4} alignItems="center">
        {/* Icon bubble */}
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
            boxShadow: `0 0 0 10px ${meta.glow}`,
          }}
        >
          {meta.icon}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label={meta.label}
              variant="outlined"
              sx={{ borderRadius: 999, fontWeight: 800 }}
            />
            <Typography sx={{ fontWeight: 800 }} noWrap>
              {e.label}
            </Typography>
          </Stack>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={e.meta}
          >
            {e.meta}
          </Typography>
        </Box>

        {/* Right side */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label={e.at}
            sx={{
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "text.secondary",
              fontWeight: 700,
            }}
          />
          {onClick ? <ChevronRightRoundedIcon sx={{ opacity: 0.7 }} /> : null}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [apiOk, setApiOk] = useState(true);
  const [data, setData] = useState(MOCK);
  const navigate = useNavigate();
  const [showAllEvents, setShowAllEvents] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
       const api = await getAdminOverview(10); 
       const real = mapOverview(api); 
        if (!cancelled) {
          setData(real);
          setApiOk(true);
        }
      } catch (e) {
        if (!cancelled) {
          setData(MOCK);
          setApiOk(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">Admin overview</Typography>
        <Typography color="text.secondary">
          Quick stats and recent actions. Clean, modern, and fast.
        </Typography>
      </Box>
      {!apiOk && (
        <Alert
          severity="warning"
          sx={{
            borderRadius: 3,
            backgroundColor: "rgba(245,193,108,0.10)",
          }}
        >
          API Gateway not reachable — showing mock data.
        </Alert>
      )}
      <Grid container columnSpacing={9} rowSpacing={2} sx={{ px: 13 }}>
        <Grid item xs={12} md={4} sx={{ display: "flex" }}>
          <Box sx={{ flex: 1 }}>
            {loading ? (
              <Skeleton variant="rounded" height={160} />
            ) : (
              <StatCard
                title="Total users"
                value={data?.totals?.total_users ?? 0}
                hint="All registered users"
                chip={{
                  label: `${data?.totals?.banned_users ?? 0} banned`,
                  color: "warning",
                }}
                onClick={() => navigate("/admin/users")}
              />
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={4} sx={{ display: "flex" }}>
          <Box sx={{ flex: 1 }}>
            {loading ? (
              <Skeleton variant="rounded" height={160} />
            ) : (
              <StatCard
                title="Total houses"
                value={data?.totals?.total_houses ?? 0}
                hint="Listings in the platform"
                chip={{
                  label: `${data?.totals?.available_houses ?? 0} available`,
                  color: "success",
                }}
                onClick={() => navigate("/admin/houses")}
              />
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={4} sx={{ display: "flex" }}>
          <Box sx={{ flex: 1 }}>
            {loading ? (
              <Skeleton variant="rounded" height={160} />
            ) : (
              <StatCard
                title="Open reports"
                value={data?.totals?.reports_open ?? 0}
                hint="Needs admin attention"
                chip={{ label: "Moderation", color: "primary" }}
                onClick={() => navigate("/admin/reports")}
              />
            )}
          </Box>
        </Grid>
      </Grid>
      {/* Recent events */}
      <Paper sx={{ p: 2.2 }}>
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ width: "100%" }} // 👈 LA LIGNE CLÉ
            >
              <Typography variant="h6">Recent events</Typography>

              <Button
                size="small"
                variant="text"
                endIcon={<ChevronRightRoundedIcon />}
                onClick={() => setShowAllEvents((v) => !v)}
                sx={{
                  borderRadius: 999,
                  color: "text.secondary",
                  "&:hover": {
                    color: "text.primary",
                    backgroundColor: "rgba(255,255,255,0.06)",
                  },
                }}
              >
                {showAllEvents ? "Show less" : "See all"}
              </Button>
            </Stack>
          </Stack>

          {loading ? (
            <Stack spacing={1}>
              <Skeleton variant="rounded" height={64} />
              <Skeleton variant="rounded" height={64} />
              <Skeleton variant="rounded" height={64} />
            </Stack>
          ) : (
            <Stack spacing={1.2}>
              {(showAllEvents ? data?.recent : data?.recent?.slice(0, 3))?.map(
                (r, idx) => {
                  const go =
                    r.type === "house"
                      ? "/admin/houses"
                      : r.type === "report"
                      ? "/admin/reports"
                      : "/admin/users";

                  return (
                    <EventRow key={idx} e={r} onClick={() => navigate(go)} />
                  );
                }
              )}
            </Stack>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
