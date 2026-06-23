import Grid from "@mui/material/Grid";
import HouseCard from "./HouseCard";

export default function HouseList({ houses }) {
  return (
    <div className="housesWrap">
    <Grid container spacing={2}>
      {houses.map((h) => (
        <Grid
          key={h.id}
          item
          xs={12}
          sm={6}
          md={4}
          lg={3}
        >
          <HouseCard house={h} />
        </Grid>
      ))}
    </Grid>
    </div>
  );
}
