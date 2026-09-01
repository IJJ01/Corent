import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import { houseApi } from "../../api/houseApi";

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "UNAVAILABLE", label: "Unavailable" },
  { value: "ARCHIVED", label: "Archived" },
];

function toNumber(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function getUserIdFromAuth(auth) {
  return (
    auth?.userId ||
    auth?.user_id ||
    auth?.user?.id ||
    auth?.user?.user_id ||
    auth?.user?.userId ||
    ""
  );
}

export default function CreateListing() {
  const navigate = useNavigate();
  const auth = useAuth();

  const isAuthed = !!auth?.isAuthed;
  const userId = useMemo(() => getUserIdFromAuth(auth), [auth]);

  const [form, setForm] = useState({
    title: "",
    location: "",
    description: "",
    price_per_room: "",
    total_rooms: "",
    status: "AVAILABLE",
  });

  // --- image state, separate from the rest of the form ---
  const [images, setImages] = useState([]); // confirmed URLs
  const [editingSlot, setEditingSlot] = useState(false); // is the "add" square open for input?
  const [draftUrl, setDraftUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const startAddingImage = () => {
    setEditingSlot(true);
    setDraftUrl("");
  };

  const commitDraftImage = () => {
    const url = draftUrl.trim();
    if (url) {
      setImages((prev) => [...prev, url]);
    }
    setEditingSlot(false);
    setDraftUrl("");
  };

  const cancelDraftImage = () => {
    setEditingSlot(false);
    setDraftUrl("");
  };

  const handleDraftKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraftImage();
    } else if (e.key === "Escape") {
      cancelDraftImage();
    }
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const validate = () => {
    if (!isAuthed || !userId)
      return "You must be logged in to create a listing.";
    if (!form.title.trim()) return "Title is required.";
    if (!form.location.trim()) return "Location is required.";
    const price = toNumber(form.price_per_room, NaN);
    if (!Number.isFinite(price) || price <= 0)
      return "Price per room must be a positive number.";
    const rooms = toNumber(form.total_rooms, NaN);
    if (!Number.isFinite(rooms) || rooms <= 0)
      return "Total rooms must be a positive number.";
    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    // catch a URL that's mid-typing but not yet committed
    const allImages =
      editingSlot && draftUrl.trim() ? [...images, draftUrl.trim()] : images;

    const payload = {
      owner_id: userId,
      title: form.title.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      price_per_room: toNumber(form.price_per_room, 0),
      total_rooms: toNumber(form.total_rooms, 0),
      occupied_rooms: 0,
      status: form.status,
      image_urls: allImages,
    };

    try {
      setSubmitting(true);
      await houseApi.create(payload);
      navigate("/my-listings", { replace: true });
    } catch (err) {
      setError(err?.message || "Failed to create listing.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    
    <div className="listingPage">
      <div className="headerListing"></div>
      <div className="listingCard">
        <div className="listingHeader">
          <h1 className="listingTitle">New listing</h1>
          <div className="actionsRow">
            <button
              className="btn btn--solid"
              type="submit"
              form="create-listing-form"
              disabled={!isAuthed || !userId || submitting}
            >
              {submitting ? "Creating..." : "Create"}
            </button>
            <button
              className="btn btn--danger"
              type="button"
              onClick={() => navigate(-1)}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        {!isAuthed && (
          <div className="alert alert--warning">
            You must be logged in to create a listing.
          </div>
        )}

        {error && <div className="alert alert--error">{String(error)}</div>}

        <form
          id="create-listing-form"
          className="listingForm"
          onSubmit={onSubmit}
        >
          <div className="listingInputs">
            <div className="listingLeft">
              <div className="field">
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="location">Location (City)</label>
                <input
                  id="location"
                  type="text"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </div>

              <div className="fieldRow">
                <div className="field">
                  <label htmlFor="price_per_room">Price per room (MAD)</label>
                  <input
                    id="price_per_room"
                    type="text"
                    inputMode="numeric"
                    value={form.price_per_room}
                    onChange={(e) => update("price_per_room", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="total_rooms">Total rooms</label>
                  <input
                    id="total_rooms"
                    type="text"
                    inputMode="numeric"
                    value={form.total_rooms}
                    onChange={(e) => update("total_rooms", e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="listingRight">
              <div className="imagesGrid">
                {/* empty state: one big add square */}
                {images.length === 0 && !editingSlot && (
                  <button
                    type="button"
                    className="imageSlot imageSlot--hero imageSlot--add"
                    onClick={startAddingImage}
                  >
                    <i className="fa-solid fa-plus"></i>
                    <span>Add image</span>
                  </button>
                )}

                {/* confirmed images: index 0 = hero, rest = thumbnails */}
                {images.map((url, idx) => (
                  <div
                    key={`${idx}-${url}`}
                    className={`imageSlot ${idx === 0 ? "imageSlot--hero" : "imageSlot--thumb"}`}
                  >
                    <img
                      src={url}
                      alt={`Listing image ${idx + 1}`}
                      onError={(e) =>
                        e.currentTarget.classList.add("imageSlot__img--broken")
                      }
                    />
                    <button
                      type="button"
                      className="imageSlot__remove"
                      onClick={() => removeImage(idx)}
                      aria-label="Remove image"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ))}

                {/* add square after existing images */}
                {images.length > 0 && !editingSlot && (
                  <button
                    type="button"
                    className="imageSlot imageSlot--thumb imageSlot--add"
                    onClick={startAddingImage}
                  >
                    <i className="fa-solid fa-plus"></i>
                    <span>Add image</span>
                  </button>
                )}

                {/* active input slot, sized hero or thumb depending on position */}
                {editingSlot && (
                  <div
                    className={`imageSlot imageSlot--editing ${
                      images.length === 0
                        ? "imageSlot--hero"
                        : "imageSlot--thumb"
                    }`}
                  >
                    {draftUrl.trim() && (
                      <img
                        src={draftUrl.trim()}
                        alt="Preview"
                        onError={(e) =>
                          e.currentTarget.classList.add(
                            "imageSlot__img--broken",
                          )
                        }
                      />
                    )}
                    <input
                      type="text"
                      autoFocus
                      className="imageSlot__input"
                      placeholder="Paste image URL..."
                      value={draftUrl}
                      onChange={(e) => setDraftUrl(e.target.value)}
                      onKeyDown={handleDraftKeyDown}
                      onBlur={commitDraftImage}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
