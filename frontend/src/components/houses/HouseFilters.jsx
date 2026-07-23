export default function HouseFilters({ value, onChange }) {
  const v = value;
  return (
    <div className="filterWrapper">
      <div className="filterBar">
        <input
          className="filterInput filterInput--grow"
          type="text"
          placeholder="City / Location"
          value={v.location}
          onChange={(e) => onChange({ ...v, location: e.target.value })}
        />
        <input
          className="filterInput filterInput--short"
          type="number"
          placeholder="Min price"
          value={v.minPrice}
          onChange={(e) => onChange({ ...v, minPrice: e.target.value })}
        />
        <input
          className="filterInput filterInput--short"
          type="number"
          placeholder="Max price"
          value={v.maxPrice}
          onChange={(e) => onChange({ ...v, maxPrice: e.target.value })}
        />
        <label className="filterToggle">
          <input
            type="checkbox"
            checked={Boolean(v.onlyAvailable)}
            onChange={(e) =>
              onChange({ ...v, onlyAvailable: e.target.checked })
            }
          />
          <span className="filterToggle__track">
            <span
              className="filterToggle__thumb"
              style={{
                transform: v.onlyAvailable
                  ? "translateX(18px)"
                  : "translateX(0)",
              }}
            />
          </span>
          <span className="filterToggle__label">Only available</span>
        </label>
        <select
          className="filterInput filterInput--select"
          value={v.sort}
          onChange={(e) => onChange({ ...v, sort: e.target.value })}
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
        </select>
      </div>
    </div>
  );
}
