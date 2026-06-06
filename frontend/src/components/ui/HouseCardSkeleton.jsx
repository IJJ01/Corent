import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export default function HouseCardSkeleton() {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.2}>
          <Skeleton variant="rounded" height={140} />
          <Skeleton variant="text" height={26} width="70%" />
          <Skeleton variant="text" height={18} width="45%" />
          <Skeleton variant="text" height={18} width="85%" />
          <Skeleton variant="rounded" height={36} />
        </Stack>
      </CardContent>
    </Card>
  );
}
