import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

export default function HouseGallery({ images = [] }) {
  const list = images.length ? images : ["https://picsum.photos/seed/fallback/900/650"];
  const [active, setActive] = useState(list[0]);

  return (
    <Box>
      <Box
        component="img"
        src={active}
        alt="House"
        sx={{
          width: "100%",
          height: { xs: 220, sm: 320, md: 380 },
          objectFit: "cover",
          borderRadius: 3,
          mb: 1.5,
        }}
      />

      <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
        {list.map((img) => (
          <Box
            key={img}
            component="img"
            src={img}
            alt="thumb"
            onClick={() => setActive(img)}
            sx={{
              width: 90,
              height: 64,
              objectFit: "cover",
              borderRadius: 2,
              cursor: "pointer",
              border: active === img ? "2px solid" : "1px solid",
              borderColor: active === img ? "primary.main" : "divider",
              flex: "0 0 auto",
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}
