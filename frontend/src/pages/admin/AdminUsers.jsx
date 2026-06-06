import { useEffect, useMemo, useState } from "react";
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
import BlockIcon from "@mui/icons-material/Block";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { banUser, unbanUser } from "../../api/adminApi";
import { http } from "../../api/http";

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminUsers() {
  const [filters, setFilters] = useState({
    q: "",
    scope: "all", // all | admins | banned
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [apiOk, setApiOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // dialogs
  const [banTarget, setBanTarget] = useState(null);
  const [banReason, setBanReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      let url = "/users";
      if (filters.scope === "admins") url = "/users/admins";
      if (filters.scope === "banned") url = "/users/banned";

      const { data } = await http.get(url, {
        params: { q: filters.q, page, page_size: pageSize },
      });

      setItems(data?.items || []);
      setTotal(Number(data?.total || 0));
      setApiOk(true);
    } catch (e) {
      setApiOk(false);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.scope, page, pageSize]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">Users</Typography>
        <Typography color="text.secondary">
          Admin moderation: ban / unban users.
        </Typography>
      </Box>
      {!apiOk && (
        <Alert
          severity="warning"
          sx={{ borderRadius: 3, backgroundColor: "rgba(245,193,108,0.10)" }}
        >
          API Gateway / User service not reachable — no data.
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 1.2 }}>
        <Grid container spacing={1}>
          <Grid item xs={12} md={7}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search: email, name, id..."
              value={filters.q}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, q: e.target.value }));
              }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Select
              fullWidth
              size="small"
              value={filters.scope}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, scope: e.target.value }));
              }}
              sx={{ borderRadius: 999 }}
            >
              <MenuItem value="all">All users</MenuItem>
              <MenuItem value="admins">Admins only</MenuItem>
              <MenuItem value="banned">Banned only</MenuItem>
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
            <Typography variant="h6">All users</Typography>
            <Typography variant="body2" color="text.secondary">
              {total} total
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
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Banned at</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {items.map((u) => {
                  const isBanned = !!u.banned_at;

                  return (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Stack spacing={0.2}>
                          <Typography sx={{ fontWeight: 800 }} noWrap>
                            {u.first_name} {u.last_name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {u.email}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                          >
                            {u.id}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        {u.is_admin ? (
                          <Chip size="small" label="Admin" color="primary" />
                        ) : (
                          <Chip size="small" label="User" variant="outlined" />
                        )}
                      </TableCell>

                      <TableCell>
                        {isBanned ? (
                          <Chip size="small" label="Banned" color="warning" />
                        ) : (
                          <Chip size="small" label="Active" color="success" />
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(u.created_at)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(u.banned_at)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        {u.is_admin ? (
                          <Typography variant="body2" color="text.secondary">
                            Protected
                          </Typography>
                        ) : isBanned ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<LockOpenIcon />}
                            onClick={async () => {
                              await unbanUser(u.id);
                              await load();
                            }}
                            sx={{ borderRadius: 3 }}
                          >
                            Unban
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            startIcon={<BlockIcon />}
                            onClick={() => {
                              setBanTarget(u);
                              setBanReason("");
                            }}
                            sx={{ borderRadius: 3 }}
                          >
                            Ban
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" sx={{ py: 2 }}>
                        No users found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Pagination simple */}
        <Box sx={{ p: 1.5, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              Page {page} / {totalPages}
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
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* Ban dialog */}
      <Dialog
        open={!!banTarget}
        onClose={() => setBanTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ban user</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              You are banning:{" "}
              <b>
                {banTarget?.first_name} {banTarget?.last_name}
              </b>{" "}
              ({banTarget?.email})
            </Typography>

            <TextField
              label="Reason (optional)"
              placeholder="Spam, scam, abuse..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              fullWidth
              size="small"
            />

            <Paper sx={{ p: 1.5, borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary">
                This will set <b>banned_at</b> to now.
              </Typography>
            </Paper>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button variant="text" onClick={() => setBanTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={async () => {
              await banUser(banTarget.id, banReason);
              setBanTarget(null);
              await load();
            }}
          >
            Confirm ban
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
