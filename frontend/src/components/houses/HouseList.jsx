import HouseCard from "./HouseCard";

export default function HouseList({ houses }) {
  return (
    <div className="housesWrap">
      {houses.map((h) => (
        <HouseCard key={h.id} house={h} />
      ))}
    </div>
  );
}