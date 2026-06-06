import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";

export default function HouseFilters({ value, onChange }) {
  const v = value;

  return (
    <Paper
      sx={(theme) => ({
        p: { xs: 1.75, md: 2.25 },
        borderRadius: 999,
        bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
        border: "1px solid",
        borderColor: theme.palette.divider,
      })}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <TextField
          label="City / Location"
          value={v.location}
          onChange={(e) => onChange({ ...v, location: e.target.value })}
          fullWidth
        />

        <TextField
          label="Min price"
          type="number"
          value={v.minPrice}
          onChange={(e) => onChange({ ...v, minPrice: e.target.value })}
          sx={{ width: { xs: "100%", md: 170 } }}
        />

        <TextField
          label="Max price"
          type="number"
          value={v.maxPrice}
          onChange={(e) => onChange({ ...v, maxPrice: e.target.value })}
          sx={{ width: { xs: "100%", md: 170 } }}
        />

        <FormControlLabel
          sx={{ ml: { xs: 0, md: 1 } }}
          control={
            <Switch
              checked={Boolean(v.onlyAvailable)}
              onChange={(e) => onChange({ ...v, onlyAvailable: e.target.checked })}
            />
          }
          label="Only available"
        />

        <TextField
          select
          label="Sort"
          value={v.sort}
          onChange={(e) => onChange({ ...v, sort: e.target.value })}
          sx={{ width: { xs: "100%", md: 160 } }}
        >
          <MenuItem value="newest">Newest</MenuItem>
          <MenuItem value="price_asc">Price ↑</MenuItem>
          <MenuItem value="price_desc">Price ↓</MenuItem>
        </TextField>
      </Stack>
    </Paper>
  );
}
