import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import PageShell from "../../components/layout/PageShell";
import HouseGallery from "../../components/houses/HouseGallery";
import { houseApi } from "../../api/houseApi";

import { useAuth } from "../../auth/AuthContext";
import { applicationApi } from "../../api/applicationApi";
import { reportApi } from "../../api/reportApi";



function formatMAD(amount) {
  return new Intl.NumberFormat("fr-MA").format(Number(amount || 0)) + " MAD";
}

function normalizeImages(images) {
  if (!images) return [];
  if (Array.isArray(images)) return images.filter(Boolean);
  if (typeof images === "string") return [images];
  return [];
}

function IconPin(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
      <path
        d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconBed(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path
        d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18v2M21 18v2M3 12V7a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v3M12 10h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconDoor(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <rect x="5" y="3" width="14" height="18" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
function IconCoin(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5v9M9.3 9.7c0-1.2 1.2-2.2 2.7-2.2s2.7.7 2.7 1.8-1 1.6-2.7 2-2.7.9-2.7 2 1.2 1.8 2.7 1.8 2.7-.9 2.7-2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IconWarning(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path
        d="M12 3.5 21.5 20h-19L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 9.5v4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="16.8" r="0.9" fill="currentColor" />
    </svg>
  );
}

/* ---------- small building blocks ---------- */

function StatCard({ icon, label, value }) {
  return (
    <div className="statCard">
      <div className="statCard__icon">{icon}</div>
      <div className="statCard__text">
        <span className="statCard__label">{label}</span>
        <span className="statCard__value">{value}</span>
      </div>
    </div>
  );
}

function Chip({ children, tone = "neutral" }) {
  return <span className={`hdChip hdChip--${tone}`}>{children}</span>;
}

function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

/* ---------- main component ---------- */

export default function HouseDetails() {
  const { id } = useParams();
  const mock = useMemo(() => false, []);

  const { isAuthed, userId } = useAuth();

  const [house, setHouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);

      try {
        const data = await houseApi.get(id);
        const h = data?.house ?? data;

        if (!cancelled) {
          setHouse(h);

          if (isAuthed) {
            try {
              const mine = await applicationApi.listMy({ pageSize: 200 });
              const already = mine.some(
                (a) =>
                  String(a?.house_id) === String(id) &&
                  String(a?.applicant_id) === String(userId)
              );
              setApplied(already);
            } catch {
              setApplied(false);
            }
          } else {
            setApplied(false);
          }
        }
      } catch {
        if (!cancelled) {
          setHouse(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id, mock, isAuthed, userId]);

  const handleApply = async () => {
    if (!isAuthed) {
      setToast({ type: "warning", text: "Please login first to apply." });
      return;
    }
    if (!house?.id) return;

    setApplying(true);
    try {
      const out = await applicationApi.apply(house.id, "Hi, I'm interested!");
      if (out?.already_applied) {
        setApplied(true);
        setToast({ type: "info", text: "You already applied to this listing." });
      } else if (out?.ok) {
        setApplied(true);
        setToast({ type: "success", text: "Application sent successfully" });
      } else {
        setToast({ type: "error", text: out?.message || "Failed to apply." });
      }
    } catch (e) {
      setToast({ type: "error", text: e?.message || "Failed to apply." });
    } finally {
      setApplying(false);
    }
  };

  const handleOpenReport = () => {
    if (!isAuthed) {
      setToast({ type: "warning", text: "Please login first to report." });
      return;
    }
    setReportOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!house?.id) return;

    setReporting(true);
    try {
      const out = await reportApi.reportHouse(house.id, reportReason);
      if (out?.ok) {
        setToast({ type: "success", text: "Report submitted. Thank you." });
        setReportOpen(false);
        setReportReason("");
      } else {
        setToast({ type: "error", text: out?.message || "Failed to submit report." });
      }
    } catch (e) {
      setToast({ type: "error", text: e?.message || "Failed to submit report." });
    } finally {
      setReporting(false);
    }
  };

  const isOwner = Boolean(house?.owner_id) && String(house?.owner_id) === String(userId);

  return (
    <PageShell variant="wide">
      <div className="hdPage">
        {loading ? (
          <div className="hdLoading">
            <Spinner />
          </div>
        ) : notFound || !house ? (
          <div className="hdCard hdCard--pad">
            <h2 className="hdNotFound__title">Listing not found</h2>
            <p className="hdNotFound__text">
              The listing may have been removed or the ID is invalid.
            </p>
          </div>
        ) : (
          (() => {
            const total = Number(house.total_rooms || 0);
            const occupied = Number(house.occupied_rooms || 0);
            const availableRooms = Math.max(total - occupied, 0);
            const isAvailable = availableRooms > 0;
            const images = normalizeImages(house.images || house.image_urls);

            return (
              <div className="hdStack">
                {/* Hero */}
                <div className="hdCard hdHero">
                  <div className="hdHero__mediaWrap">
                    <HouseGallery images={images} />
                    <div className="hdHero__chips">
                      <Chip>
                        <IconPin /> {house.location || "Unknown"}
                      </Chip>
                      <Chip tone={isAvailable ? "success" : "neutral"}>
                        {isAvailable ? `${availableRooms} rooms available` : "Full"}
                      </Chip>
                      <Chip>{(house.status || "AVAILABLE").toString()}</Chip>
                    </div>
                  </div>

                  <div className="hdHero__body">
                    <h1 className="hdHero__title">{house.title}</h1>
                    <p className="hdHero__subtitle">
                      A comfortable place to co-rent — review details and apply in one click.
                    </p>
                  </div>
                </div>

                {/* Content grid */}
                <div className="hdGrid">
                  <div className="hdGrid__main">
                    <div className="hdStats">
                      <StatCard
                        icon={<IconCoin />}
                        label="Price / room"
                        value={formatMAD(house.price_per_room)}
                      />
                      <StatCard
                        icon={<IconBed />}
                        label="Occupancy"
                        value={`${occupied}/${total}`}
                      />
                      <StatCard
                        icon={<IconDoor />}
                        label="Availability"
                        value={`${availableRooms}/${total}`}
                      />
                    </div>

                    <div className="hdCard hdCard--pad">
                      <h3 className="hdSection__title">Description</h3>
                      <div className="hdDivider" />
                      <p className="hdSection__body">
                        {house.description || "No description."}
                      </p>
                    </div>
                  </div>

                  <div className="hdGrid__side">
                    <div className="hdCard hdCard--pad hdSticky">
                      <div className="hdPriceBlock">
                        <div className="hdPriceBlock__row">
                          <span className="hdPriceBlock__price">
                            {formatMAD(house.price_per_room)}
                          </span>
                          <span className="hdPriceBlock__unit">/ room</span>
                        </div>
                        <p className="hdPriceBlock__avail">
                          Availability: {availableRooms} / {total} rooms
                        </p>
                      </div>

                      <button
                        className="hdBtn hdBtn--primary hdBtn--full"
                        onClick={handleApply}
                        disabled={isOwner || applying || applied || !isAvailable}
                      >
                        {!isAvailable
                          ? "No rooms available"
                          : applied
                          ? "Applied"
                          : applying
                          ? "Applying…"
                          : "Apply for this house"}
                      </button>

                      <button
                        className="hdBtn hdBtn--danger hdBtn--full"
                        onClick={handleOpenReport}
                        disabled={isOwner}
                      >
                        <IconWarning /> Report listing
                      </button>

                      <p className="hdPriceBlock__legal">
                        By applying, you agree to follow house rules and platform policy.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Report dialog */}
      {reportOpen && (
        <div className="hdOverlay" onClick={() => setReportOpen(false)}>
          <div className="hdDialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="hdDialog__title">Report listing</h3>
            <p className="hdDialog__hint">Tell us what's wrong with this listing.</p>
            <textarea
              className="hdTextarea"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Reason (optional)"
              rows={3}
            />
            <div className="hdDialog__actions">
              <button className="hdBtn hdBtn--ghost" onClick={() => setReportOpen(false)}>
                Cancel
              </button>
              <button
                className="hdBtn hdBtn--danger"
                onClick={handleSubmitReport}
                disabled={reporting}
              >
                {reporting ? "Sending…" : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`hdToast hdToast--${toast.type || "info"}`}>
          <span>{toast.text}</span>
          <button className="hdToast__close" onClick={() => setToast(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </PageShell>
  );
}