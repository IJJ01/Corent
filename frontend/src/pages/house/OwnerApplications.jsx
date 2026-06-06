// src/pages/house/OwnerApplications.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";

import PageShell from "../../components/layout/PageShell";
import { applicationApi } from "../../api/applicationApi";

function fmt(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function statusChip(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") return <Chip size="small" label="Pending" color="warning" />;
  if (s === "APPROVED") return <Chip size="small" label="Approved" color="success" />;
  if (s === "REJECTED") return <Chip size="small" label="Rejected" color="default" />;
  return <Chip size="small" label={s || "Unknown"} />;
}

export default function OwnerApplications() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState("");

  const pending = useMemo(
    () => items.filter((a) => String(a.status).toUpperCase() === "PENDING"),
    [items]
  );

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await applicationApi.listForOwner({ status: "PENDING", pageSize: 50 });
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (appId, decision) => {
    setBusyId(appId);
    try {
      await applicationApi.decide(appId, decision);
      // remove from pending view (or reload)
      await load();
    } finally {
      setBusyId("");
    }
  };

  return (
    <PageShell>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 }, py: 3 }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
          <Stack spacing={0.5}>
            <Typography variant="h5" sx={{ fontWeight: 950 }}>
              Applications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review pending applications for your listings.
            </Typography>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {loading ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={24} />
            </Stack>
          ) : err ? (
            <Alert severity="error">{err}</Alert>
          ) : pending.length === 0 ? (
            <Alert severity="info">No pending applications right now.</Alert>
          ) : (
            <Stack spacing={1.5}>
              {pending.map((a) => (
                <Paper
                  key={a.id}
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 3 }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                  >
                    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography sx={{ fontWeight: 900 }}>
                          Application #{String(a.id).slice(-6)}
                        </Typography>
                        {statusChip(a.status)}
                        <Chip size="small" label={`House: ${a.house_id}`} />
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        Applicant: <b>{a.applicant_id}</b> • {fmt(a.created_at)}
                      </Typography>

                      {a.message ? (
                        <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                          {a.message}
                        </Typography>
                      ) : null}
                    </Stack>

                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={() => decide(a.id, "APPROVED")}
                        disabled={busyId === a.id}
                        sx={{ fontWeight: 900, borderRadius: 2.5 }}
                      >
                        {busyId === a.id ? "..." : "Approve"}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => decide(a.id, "REJECTED")}
                        disabled={busyId === a.id}
                        sx={{ fontWeight: 900, borderRadius: 2.5 }}
                      >
                        {busyId === a.id ? "..." : "Reject"}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </PageShell>
  );
}
