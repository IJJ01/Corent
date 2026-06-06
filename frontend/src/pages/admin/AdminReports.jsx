import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Skeleton,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { listReports, resolveReport } from "../../api/adminApi";

function statusChip(status) {
  const s = String(status || "").toLowerCase();
  if (s === "open") return <Chip size="small" label="Open" color="warning" />;
  if (s === "reviewed" || s === "dismissed")
    return <Chip size="small" label="Resolved" color="success" />;
  return <Chip size="small" label={status} />;
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  // simple readable format
  return d.toLocaleString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminReports() {
  const [filters, setFilters] = useState({
    q: "",
    status: "all",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [apiOk, setApiOk] = useState(true);
  const [nextToken, setNextToken] = useState("0");
  const [pageTokens, setPageTokens] = useState({ 1: "0" }); // page -> token

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null); // for resolve dialog

  async function load() {
    setLoading(true);
    try {
      const token = pageTokens[page] ?? "0";

      const statusParam = filters.status === "all" ? "" : filters.status; // open/reviewed

      const res = await listReports({
        status: statusParam,
        pageSize,
        pageToken: token,
      });

      // map proto -> UI rows
      const mapped = (res?.reports || []).map((r) => ({
        id: r.id,
        status: r.status, // open/reviewed/dismissed
        category: r.reason || "", // UI wants "category"
        house_title: r.house_id ? `House ${r.house_id.slice(0, 8)}…` : "House",
        house_id: r.house_id || "",
        reporter: r.reporter_id || "",
        target: r.house_id || "",
        message: r.details || "",
        created_at: r.created_at || new Date().toISOString(),
      }));

      setItems(mapped);
      const q = (filters.q || "").trim().toLowerCase();
      const filtered = q
        ? mapped.filter((x) =>
            [x.id, x.category, x.house_id, x.reporter, x.message].some((v) =>
              String(v || "")
                .toLowerCase()
                .includes(q)
            )
          )
        : mapped;

      setItems(filtered);

      const nt = res?.next_page_token || "";
      setNextToken(nt);

      // store token for next page
      if (nt) {
        setPageTokens((prev) => ({ ...prev, [page + 1]: nt }));
      }

      setApiOk(true);
    } catch (e) {
      setApiOk(false);
      setItems([]);
      setNextToken("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.status, page, pageSize]);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">Reports</Typography>
        <Typography color="text.secondary">
          Review and resolve user reports.
        </Typography>
      </Box>
      {!apiOk && (
        <Alert
          severity="warning"
          sx={{ borderRadius: 3, backgroundColor: "rgba(245,193,108,0.10)" }}
        >
          API Gateway / Admin gRPC not reachable — no data.
        </Alert>
      )}

      {/* Filters (pill style) */}
      <Paper sx={{ p: 1.2 }}>
        <Grid container spacing={1}>
          <Grid item xs={12} md={7}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search: id, category, house, reporter, message..."
              value={filters.q}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, q: e.target.value }));
                setPageTokens({ 1: "0" });
                setNextToken("0");
              }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Select
              fullWidth
              size="small"
              value={filters.status}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, status: e.target.value }));
                setPageTokens({ 1: "0" });
                setNextToken("0");
              }}
              sx={{ borderRadius: 999 }}
            >
              <MenuItem value="all">All status</MenuItem>
              <MenuItem value="open">OPEN</MenuItem>
              <MenuItem value="reviewed">RESOLVED</MenuItem>
            </Select>
          </Grid>

          <Grid item xs={6} md={2}>
            <Select
              fullWidth
              size="small"
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
                setPageTokens({ 1: "0" });
                setNextToken("0");
              }}
              sx={{ borderRadius: 999 }}
            >
              <MenuItem value={5}>5 / page</MenuItem>
              <MenuItem value={8}>8 / page</MenuItem>
              <MenuItem value={12}>12 / page</MenuItem>
            </Select>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <Paper sx={{ overflow: "hidden" }}>
        <Box sx={{ p: 2, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">All reports</Typography>
            <Typography variant="body2" color="text.secondary">
              {items.length} total
            </Typography>
          </Stack>
        </Box>

        {loading ? (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rounded" height={260} />
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>House</TableCell>
                  <TableCell>Reporter → Target</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 800 }}>{r.id}</TableCell>
                    <TableCell>{statusChip(r.status)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={r.category}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.2}>
                        <Typography sx={{ fontWeight: 700 }} noWrap>
                          {r.house_title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          {r.house_id}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {r.reporter} → {r.target}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          maxWidth: 360,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={r.message}
                      >
                        {r.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(r.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        <IconButton
                          size="small"
                          sx={{
                            border: "1px solid rgba(255,255,255,0.10)",
                            borderRadius: 3,
                          }}
                          title="Open details (later)"
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>

                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CheckCircleOutlineIcon />}
                          disabled={
                            String(r.status || "").toLowerCase() !== "open"
                          }
                          onClick={() => setSelected(r)}
                          sx={{ borderRadius: 3 }}
                        >
                          Resolve
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography color="text.secondary" sx={{ py: 2 }}>
                        No reports found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Pagination simple */}
        <Box
          sx={{
            p: 1.5,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              Page {page}
              {nextToken ? "" : " (last)"}
            </Typography>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={!nextToken}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* Resolve dialog */}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Resolve report</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              You are resolving: <b>{selected?.id}</b>
            </Typography>
            <Paper sx={{ p: 1.5, borderRadius: 3 }}>
              <Stack spacing={0.6}>
                <Stack direction="row" spacing={1} alignItems="center">
                  {statusChip(selected?.status)}
                  <Chip
                    size="small"
                    label={selected?.category}
                    variant="outlined"
                  />
                </Stack>
                <Typography sx={{ fontWeight: 800 }}>
                  {selected?.house_title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selected?.reporter} → {selected?.target}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selected?.message}
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setSelected(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              await resolveReport(selected.id, "reviewed");

              setSelected(null);
              await load();
            }}
          >
            Confirm resolve
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
