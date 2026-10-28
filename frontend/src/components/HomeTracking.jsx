import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../utils/Axios";

const STATUS_STEPS = [
  "Booked",
  "Picked Up",
  "In Transit",
  "At Warehouse",
  "Out for Delivery",
  "Delivered",
];

function formatDate(value) {
  if (!value) return "Pending";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function HomeTracking() {
  const [searchParams] = useSearchParams();
  const sharedTrackingNumber = searchParams.get("tracking") || "";
  const [trackingNumber, setTrackingNumber] = useState(sharedTrackingNumber);
  const [parcel, setParcel] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestTracking = useCallback((number) =>
    API.get(`/parcels/track/${encodeURIComponent(number.trim())}`), []);

  const fetchTracking = useCallback(async (number) => {
    setError("");
    setParcel(null);
    setLoading(true);
    try {
      const response = await requestTracking(number);
      setParcel(response.data.parcel);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Tracking is unavailable right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [requestTracking]);

  useEffect(() => {
    if (!sharedTrackingNumber) return undefined;
    let active = true;
    requestTracking(sharedTrackingNumber)
      .then((response) => {
        if (active) {
          setError("");
          setParcel(response.data.parcel);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Tracking is unavailable right now. Please try again.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [requestTracking, sharedTrackingNumber]);

  async function handleTrack(event) {
    event.preventDefault();
    await fetchTracking(trackingNumber);
  }

  const currentStep = parcel ? STATUS_STEPS.indexOf(parcel.status) : -1;

  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="NexRoute home">
          <span className="brand-mark">N</span>
          <span>NEXROUTE</span>
        </Link>
        <nav className="topnav" aria-label="Main navigation">
          <a href="#track">Track parcel</a>
          <a href="#about-us">About us</a>
          <Link to="/login">Sign in</Link>
          <Link className="nav-cta" to="/register">Create account <span>↗</span></Link>
        </nav>
      </header>

      <main>
        <section className="hero-section" id="track">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> COURIER, WITHOUT THE GUESSWORK</div>
            <h1>Your delivery,<br /><span>in good hands.</span></h1>
            <p>From pickup to your doorstep, know where your parcel is every step of the way.</p>
            <div className="tracking-card">
              <form onSubmit={handleTrack}>
                <label htmlFor="tracking-number">TRACK A PARCEL</label>
                <div className="tracking-input-row">
                  <span className="search-icon" aria-hidden="true">⌕</span>
                  <input
                    id="tracking-number"
                    type="text"
                    placeholder="Enter your tracking number"
                    value={trackingNumber}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                    autoComplete="off"
                    required
                  />
                  <button type="submit" disabled={loading}>
                    {loading ? "Searching..." : "Track parcel"} <span aria-hidden="true">→</span>
                  </button>
                </div>
              </form>
              <div className="tracking-hint"><span>↳</span> Your tracking number is in your booking confirmation.</div>
            </div>
            {error && <div className="notice notice-error" role="alert">{error}</div>}

            {parcel && (
              <section className="tracking-result" aria-live="polite">
                <div className="result-heading">
                  <div>
                    <span className="result-label">TRACKING NUMBER</span>
                    <h2>{parcel.trackingNumber}</h2>
                  </div>
                  <span className={`status-pill ${parcel.status === "Delivered" ? "status-delivered" : ""}`}>
                    <span className="status-dot" /> {parcel.status}
                  </span>
                </div>
                <div className="result-route">
                  <span className="route-pin">◉</span>
                  <div><span>DELIVERING TO</span><strong>{parcel.receiverAddress || "Destination on file"}</strong></div>
                  <div className="route-updated"><span>LAST UPDATED</span><strong>{formatDate(parcel.updatedAt)}</strong></div>
                </div>
                <div className="tracking-courier">
                  <span className="courier-avatar">↗</span>
                  {parcel.courierName ? (
                    <div className="courier-info">
                      <span>YOUR COURIER</span>
                      <strong>{parcel.courierName}</strong>
                      <small>
                        {parcel.courierVehicle || "Delivery partner"}
                        {parcel.courierPhone && <> · <a href={`tel:${parcel.courierPhone}`}>{parcel.courierPhone}</a></>}
                      </small>
                    </div>
                  ) : (
                    <div className="courier-info">
                      <span>YOUR COURIER</span>
                      <strong>Courier not assigned yet</strong>
                      <small>Courier details will appear here once assigned.</small>
                    </div>
                  )}
                </div>
                <div className="progress-track" aria-label={`Parcel status: ${parcel.status}`}>
                  {STATUS_STEPS.map((step, index) => {
                    const done = currentStep >= 0 && index <= currentStep;
                    const active = index === currentStep;
                    return (
                      <div className={`progress-step ${done ? "is-done" : ""} ${active ? "is-active" : ""}`} key={step}>
                        <span className="progress-marker">{done ? "✓" : ""}</span>
                        <span className="progress-label">{step}</span>
                      </div>
                    );
                  })}
                </div>
                {parcel.history?.length > 0 && (
                  <div className="history-list">
                    <h3>Shipment updates</h3>
                    {[...parcel.history].reverse().map((item, index) => (
                      <div className="history-item" key={`${item.updatedAt}-${index}`}>
                        <span className="history-marker" />
                        <div><strong>{item.status}</strong>{item.note && <p>{item.note}</p>}</div>
                        <time>{formatDate(item.updatedAt)}</time>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-glow" />
            <div className="route-line"><span /><span /><span /></div>
            <div className="parcel-illustration">
              <div className="parcel-top" />
              <div className="parcel-front"><span className="parcel-tape" /><span className="parcel-label"><i /><i /><i /></span></div>
              <div className="parcel-side" />
            </div>
            <div className="floating-card delivery-card"><span className="delivery-icon">✓</span><span><strong>On its way</strong><small>Every step, in view</small></span></div>
            <div className="floating-card speed-card"><span className="speed-icon">↗</span><span><strong>Reliable delivery</strong><small>Across the country</small></span></div>
            <div className="art-caption"><span className="caption-line" /> MOVING WHAT MATTERS</div>
          </div>
        </section>

        <section className="feature-strip">
          <div><span className="feature-number">01</span><span><strong>Book with ease</strong><small>Simple, secure parcel booking</small></span></div>
          <div><span className="feature-number">02</span><span><strong>Track in real time</strong><small>Updates at every milestone</small></span></div>
          <div><span className="feature-number">03</span><span><strong>Delivered with care</strong><small>From our hands to yours</small></span></div>
          <Link to="/register" className="feature-link">Get started <span>↗</span></Link>
        </section>

        <section className="about-section grid md:grid-cols-[1fr_.8fr]" id="about-us">
          <div className="about-copy">
            <span className="eyebrow">ABOUT NEXROUTE</span>
            <h2>Every parcel deserves<br />a clear path home.</h2>
            <p>NexRoute connects dependable couriers with the people and businesses counting on them. From booking through delivery, every shipment has a trackable journey and a team ready to move it forward.</p>
          </div>
          <div className="about-points">
            <div><strong>01</strong><span><b>Built around clarity</b><small>Shipment updates stay easy to find and understand.</small></span></div>
            <div><strong>02</strong><span><b>Handled with care</b><small>Every booking is matched with a suitable delivery vehicle.</small></span></div>
            <div><strong>03</strong><span><b>Here for every mile</b><small>Track progress from booking to the final handoff.</small></span></div>
          </div>
        </section>
      </main>
      <footer className="site-footer"><Link className="brand footer-brand" to="/"><span className="brand-mark">N</span><span>NEXROUTE</span></Link><span>Every parcel has a story. We get it there.</span><span>© {new Date().getFullYear()} NexRoute</span></footer>
    </div>
  );
}
