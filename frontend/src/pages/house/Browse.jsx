import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";

import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import HouseCardSkeleton from "../../components/ui/HouseCardSkeleton";

import HouseList from "../../components/houses/HouseList";
import HouseFilters from "../../components/houses/HouseFilters";
import ApiStatusBanner from "../../components/common/ApiStatusBanner";

import { MOCK_HOUSES } from "../../utils/constants";
import { apiGet } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

function normalizeHouseList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.houses)) return payload.houses;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function Browse() {
  const { userId } = useAuth();

  const [filters, setFilters] = useState({
    location: "",
    minPrice: "",
    maxPrice: "",
    onlyAvailable: false,
    sort: "newest",
  });

  const [loading, setLoading] = useState(true);
  const [houses, setHouses] = useState(Array.isArray(MOCK_HOUSES) ? MOCK_HOUSES.filter(Boolean) : []);
  const [mode, setMode] = useState("mock"); // "mock" | "api"

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await apiGet("/houses");
        const list = normalizeHouseList(res?.data);

        const cleaned = Array.isArray(list) ? list.filter(Boolean) : [];

        if (!cancelled && cleaned.length > 0) {
          setHouses(cleaned);
          setMode("api");
        } else if (!cancelled) {
          setHouses(Array.isArray(MOCK_HOUSES) ? MOCK_HOUSES.filter(Boolean) : []);
          setMode("mock");
        }
      } catch {
        if (!cancelled) {
          setHouses(Array.isArray(MOCK_HOUSES) ? MOCK_HOUSES.filter(Boolean) : []);
          setMode("mock");
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

  const filtered = useMemo(() => {
    // ✅ Ensure we never pass null/undefined houses to HouseList/HouseCard
    let items = Array.isArray(houses) ? houses.filter(Boolean) : [];

    // ✅ Hide my own listings from Browse
    if (userId) {
      items = items.filter((h) => String(h?.owner_id || "") !== String(userId));
    }

    const loc = filters.location.trim().toLowerCase();
    if (loc) {
      items = items.filter((h) =>
        String(h?.location || "").toLowerCase().includes(loc)
      );
    }

    const minP = filters.minPrice === "" ? null : Number(filters.minPrice);
    const maxP = filters.maxPrice === "" ? null : Number(filters.maxPrice);

    if (minP !== null && !Number.isNaN(minP)) {
      items = items.filter((h) => Number(h?.price_per_room) >= minP);
    }
    if (maxP !== null && !Number.isNaN(maxP)) {
      items = items.filter((h) => Number(h?.price_per_room) <= maxP);
    }

    if (filters.onlyAvailable) {
      items = items.filter((h) => {
        const total = Number(h?.total_rooms || 0);
        const occ = Number(h?.occupied_rooms || 0);
        return total - occ > 0;
      });
    }

    // sort
    const sort = String(filters.sort || "newest");
    if (sort === "price_asc") {
      items.sort((a, b) => Number(a?.price_per_room || 0) - Number(b?.price_per_room || 0));
    } else if (sort === "price_desc") {
      items.sort((a, b) => Number(b?.price_per_room || 0) - Number(a?.price_per_room || 0));
    } else {
      // newest default: keep API/mock order (already newest-first in our mock)
    }

    return items;
  }, [filters, houses, userId]);

  const clearFilters = () =>
    setFilters({
      location: "",
      minPrice: "",
      maxPrice: "",
      onlyAvailable: false,
      sort: "newest",
    });

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Browse listings"
        subtitle="Search by city, price, and rooms. Pick a place that fits your vibe."
      />

      <ApiStatusBanner mode={mode} />

      <HouseFilters value={filters} onChange={setFilters} />

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} item xs={12} sm={6} md={4}>
              <HouseCardSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Box>
          <EmptyState
            title="No listings found"
            description="Try changing filters or clearing them."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        </Box>
      ) : (
        <HouseList houses={filtered} />
      )}
    </Stack>
  );
}
