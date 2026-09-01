import { Link } from "react-router-dom";

function formatMAD(amount) {
  return new Intl.NumberFormat("fr-MA").format(Number(amount || 0)) + " MAD";
}
function firstImage(images) {
  if (!images) return "";
  if (Array.isArray(images)) return images.find(Boolean) || "";
  if (typeof images === "string") return images;
  return "";
}

export default function HouseCard({ house }) {
  console.log("house data:", house);
  const id = house?.id;
  const img = firstImage(house?.images);
  const total = Number(house?.total_rooms || 0);
  const occupied = Number(house?.occupied_rooms || 0);
  const availableRooms = Math.max(0, total - occupied);
  const isAvailable = availableRooms > 0;

  return (
    <Link to={`/houses/${id}`} className="houseCard">
      <img
        className="houseCard__img"
        src={img || "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200"}
        alt={house?.title || "House"}
        loading="lazy"
      />
      <div className="houseCard__body">
        <div className="houseCard__chips">
          <span className="chip">{house?.location || "Unknown"}</span>
          <span className={`chip chip--${isAvailable ? "available" : "full"}`}>
            {isAvailable ? `${availableRooms} available` : "Full"}
          </span>
        </div>
        <p className="houseCard__title">{house?.title || "Untitled"}</p>
        <p className="houseCard__desc">{house?.description || "No description."}</p>
        <div className="houseCard__footer">
          <span className="houseCard__price">
            {formatMAD(house?.price_per_room)}
            <span className="houseCard__perRoom"> / room</span>
          </span>
          <span className="houseCard__occupancy">Occupancy: {occupied}/{total}</span>
        </div>
      </div>
    </Link>
  );
}