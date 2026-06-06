import { Link as RouterLink } from "react-router-dom";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";

function statusChip(h) {
  const available = h.occupied_rooms < h.total_rooms;
  return (
    <Chip
      size="small"
      label={available ? "Available" : "Full"}
      color={available ? "success" : "default"}
    />
  );
}

export default function MyListingsTable({ houses, onDelete }) {
  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        width: "100%",          // ✅ force full width
        maxWidth: "100%",       // ✅ prevent shrinking
        borderRadius: 4,
        overflowX: "auto",
      }}
    >
      <Table sx={{ minWidth: 800 }}>
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Price / room</TableCell>
            <TableCell>Rooms</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {houses.map((h) => (
            <TableRow key={h.id} hover>
              <TableCell>{h.title}</TableCell>
              <TableCell>{h.location}</TableCell>
              <TableCell>{h.price_per_room} MAD</TableCell>
              <TableCell>
                {h.occupied_rooms}/{h.total_rooms}
              </TableCell>
              <TableCell>{statusChip(h)}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    size="small"
                    variant="outlined"
                    component={RouterLink}
                    to={`/dashboard/listings/${h.id}/edit`}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={() => onDelete(h.id)}
                  >
                    Delete
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}

          {!houses.length && (
            <TableRow>
              <TableCell
                colSpan={6}
                align="center"
                sx={{ py: 4, color: "text.secondary" }}
              >
                No listings yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
