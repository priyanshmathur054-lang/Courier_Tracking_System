import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../utils/Axios";

const STATUSES = [
  "Booked",
  "Picked Up",
  "In Transit",
  "At Warehouse",
  "Out for Delivery",
  "Delivered",
  "Complete",
  "Delayed",
  "Cancelled",
  "Reject",
];

const STATUS_FILTERS = [
  "Booked",
  "Picked Up",
  "In Transit",
  "At Warehouse",
  "Out for Delivery",
  "Delivered",
  "Complete",
  "Delayed",
  "Cancelled",
  "Reject",
];

const EMPTY_FORM = {
  senderName: "",
  senderPhone: "",
  senderAddress: "",
  receiverName: "",
  receiverPhone: "",
  receiverAddress: "",
  description: "",
  packageSize: "Small",
  quantity: 1,
};

function readUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = readUser();
  const isAdmin = user.role === "admin";
  const [parcels, setParcels] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [courierForms, setCourierForms] = useState({});
  const [couriers, setCouriers] = useState([]);
  const [weatherCity, setWeatherCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  const fetchParcels = useCallback(() => API.get("/parcels"), []);

  const loadParcels = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetchParcels();
      setParcels(response.data.parcels);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load parcels. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchParcels]);

  useEffect(() => {
    let active = true;
    fetchParcels()
      .then((response) => {
        if (active) {
          setError("");
          setParcels(response.data.parcels);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load parcels. Please check your connection and try again.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchParcels]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    API.get("/parcels/couriers")
      .then((response) => {
        if (active) setCouriers(response.data.couriers);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load the courier roster.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  function logout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  function changeField(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function createParcel(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await API.post("/parcels", formData);
      const trackingNumber = response.data.parcel.trackingNumber;
      setMessage(`${response.data.message} Tracking number: ${trackingNumber}`);
      setFormData(EMPTY_FORM);
      await loadParcels();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to book this parcel. Check the details and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(parcelId, status, note = "") {
    setError("");
    try {
      const response = await API.patch(`/parcels/${parcelId}/status`, { status, note });
      setParcels((current) =>
        current.map((parcel) =>
          parcel._id === parcelId ? response.data.parcel : parcel,
        ),
      );
      setMessage(
        status === "Picked Up" && note
          ? "Parcel accepted. Status changed to Picked Up."
          : "Parcel status updated.",
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update parcel status. Please try again.",
      );
    }
  }

  function changeCourier(parcelId, courierId) {
    setCourierForms((current) => ({ ...current, [parcelId]: courierId }));
  }

  async function saveCourier(parcelId) {
    const courierId = courierForms[parcelId];
    if (!courierId) return;
    setError("");
    setMessage("");
    try {
      const response = await API.patch(`/parcels/${parcelId}/courier`, { courierId });
      setParcels((current) =>
        current.map((item) => item._id === parcelId ? response.data.parcel : item),
      );
      setCourierForms((current) => {
        const next = { ...current };
        delete next[parcelId];
        return next;
      });
      setMessage(`Courier assigned to ${response.data.parcel.trackingNumber}.`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to save courier details. Please try again.",
      );
    }
  }

  async function handleWeatherCheck(event) {
    event.preventDefault();
    setWeatherError("");
    setWeather(null);
    setWeatherLoading(true);
    try {
      const response = await API.get("/parcels/weather", {
        params: { city: weatherCity.trim() },
      });
      setWeather(response.data.weather);
    } catch (requestError) {
      setWeatherError(
        requestError.response?.data?.message ||
          "Unable to check weather right now. Please try again.",
      );
    } finally {
      setWeatherLoading(false);
    }
  }

  const filteredParcels = parcels.filter((parcel) => {
    const text = `${parcel.trackingNumber} ${parcel.receiverName} ${parcel.receiverAddress} ${parcel.status}`.toLowerCase();
    const statusMatches = !statusFilter || parcel.status === statusFilter;
    return statusMatches && text.includes(query.toLowerCase());
  });
  const activeCount = parcels.filter(
    (parcel) => !["Delivered", "Complete", "Cancelled", "Reject"].includes(parcel.status),
  ).length;
  const deliveredCount = parcels.filter((parcel) => ["Delivered", "Complete"].includes(parcel.status)).length;
  const bookedCount = parcels.filter((parcel) => parcel.status === "Booked").length;
  const cancelledCount = parcels.filter((parcel) => ["Cancelled", "Reject"].includes(parcel.status)).length;

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link to="/" className="brand dashboard-brand"><span className="brand-mark">N</span><span>NEXROUTE</span></Link>
        <div className="sidebar-caption">WORKSPACE</div>
        <Link className="sidebar-link selected" to="/dashboard"><span>▦</span> Overview</Link>
        <Link className="sidebar-link" to="/"><span>⌕</span> Track a parcel</Link>
        <div className="sidebar-bottom">
          <div className="support-card"><span>✳</span><strong>Need a hand?</strong><small>Your shipments are just a click away.</small><Link to="/">Visit tracking <span>↗</span></Link></div>
          <button type="button" className="sidebar-link logout-button" onClick={logout}><span>↪</span> Sign out</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div><span className="dashboard-overline">YOUR NEXROUTE</span><h1>Shipment overview</h1></div>
          <div className="profile-block"><span className="avatar">{(user.name || "U").charAt(0).toUpperCase()}</span><span><strong>{user.name || "Account"}</strong><small>{isAdmin ? "Administrator" : "Customer"}</small></span></div>
        </header>

        <section className="dashboard-welcome">
          <div><span className="welcome-kicker">GOOD TO HAVE YOU HERE</span><h2>Keep every delivery<br />moving forward.</h2><p>Manage your parcels and follow each journey from pickup to delivery.</p></div>
          <div className="welcome-art" aria-hidden="true"><span className="welcome-sun" /><span className="welcome-box">N</span><span className="welcome-spark">✳</span></div>
          <span className="welcome-index">Nº 01&nbsp; / &nbsp;SHIPMENTS</span>
        </section>

        {error && <div role="alert" className="notice notice-error">{error}</div>}
        {message && <div role="status" className="notice notice-success">{message}</div>}

        <section className={`stats-grid${isAdmin ? " admin-stats-grid" : ""}`}>
          <article className="stat-card"><span className="stat-icon">▧</span><span className="stat-label">TOTAL SHIPMENTS</span><strong>{parcels.length}</strong><small>All your booked parcels</small></article>
          <article className="stat-card"><span className="stat-icon icon-orange">↗</span><span className="stat-label">IN PROGRESS</span><strong>{activeCount}</strong><small>Currently on their way</small></article>
          {isAdmin && <article className="stat-card"><span className="stat-icon">＋</span><span className="stat-label">BOOKED</span><strong>{bookedCount}</strong><small>Awaiting pickup</small></article>}
          <article className="stat-card"><span className="stat-icon icon-green">✓</span><span className="stat-label">{isAdmin ? "COMPLETED" : "DELIVERED"}</span><strong>{deliveredCount}</strong><small>Safely at their destination</small></article>
          {isAdmin && <article className="stat-card"><span className="stat-icon icon-orange">×</span><span className="stat-label">CANCELLED / REJECTED</span><strong>{cancelledCount}</strong><small>Cancelled shipments</small></article>}
        </section>

        {isAdmin && (
          <section className="weather-panel">
            <div className="weather-heading">
              <span className="dashboard-overline">DELIVERY CONDITIONS</span>
              <h2>Weather check</h2>
              <p>Check current weather and rain alerts for a destination city.</p>
            </div>
            <form className="weather-form" onSubmit={handleWeatherCheck}>
              <label htmlFor="weather-city">Destination city</label>
              <div className="weather-input-row">
                <input
                  id="weather-city"
                  value={weatherCity}
                  onChange={(event) => setWeatherCity(event.target.value)}
                  placeholder="e.g. Mumbai"
                  required
                />
                <button type="submit" disabled={weatherLoading || !weatherCity.trim()}>
                  {weatherLoading ? "Checking..." : "Check weather"}
                </button>
              </div>
            </form>
            {weatherError && <p role="alert" className="weather-error">{weatherError}</p>}
            {weather && (
              <div role="status" className="weather-result">
                <strong>{weather.city}</strong>
                <span>{weather.condition} · {weather.temperatureC ?? "—"}°C</span>
                <p className={weather.rainy ? "weather-rain-alert" : ""}>
                  {weather.message || "No rain currently reported."}
                </p>
              </div>
            )}
          </section>
        )}

        <section className="shipments-panel">
          <div className="panel-heading"><div><span className="dashboard-overline">YOUR SHIPMENTS</span><h2>{isAdmin ? "All parcels" : "Recent parcels"}</h2></div><div className="shipment-filters"><label className="table-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shipments" aria-label="Search shipments" /></label><select className="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter shipments by status"><option value="">All statuses</option>{STATUS_FILTERS.map((status) => <option key={status} value={status}>{status}</option>)}</select></div></div>
          <div className="table-scroll">
            <table className="shipment-table">
              <thead><tr><th>TRACKING NUMBER</th><th>RECIPIENT</th><th>BOOKED</th><th>DESTINATION</th><th>SIZE / QTY</th><th>VEHICLE</th><th>STATUS</th><th>COURIER</th>{isAdmin && <th>UPDATE</th>}</tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={isAdmin ? 9 : 8} className="empty-cell">Loading your shipments...</td></tr>
                ) : filteredParcels.length ? filteredParcels.map((parcel) => (
                  <tr key={parcel._id}>
                    <td><Link to={`/?tracking=${encodeURIComponent(parcel.trackingNumber)}`} className="tracking-code">{parcel.trackingNumber}</Link></td>
                    <td className="recipient-cell">{parcel.receiverName}</td>
                    <td>{parcel.createdAt ? new Date(parcel.createdAt).toLocaleDateString() : "—"}</td>
                    <td>{parcel.receiverAddress}</td>
                    <td>{parcel.packageSize || "Small"} / {parcel.quantity || 1}</td>
                    <td>{parcel.vehicleType || "Bike"}</td>
                    <td><span className={`status-pill status-${parcel.status.toLowerCase().replaceAll(" ", "-")}`}><span className="status-dot" />{parcel.status}</span></td>
                    <td>
                      {isAdmin ? (
                        <div className="courier-assignment">
                          <select
                            aria-label={`Courier name for ${parcel.trackingNumber}`}
                            value={courierForms[parcel._id] ?? parcel.courierId ?? ""}
                            onChange={(event) => changeCourier(parcel._id, event.target.value)}
                          >
                            <option value="">{parcel.courierName || "Select courier"}</option>
                            {couriers
                              .filter((courier) => {
                                const capacity = { Bike: 1, Van: 2, Truck: 3 };
                                return capacity[courier.vehicleType] >= capacity[parcel.vehicleType || "Bike"];
                              })
                              .map((courier) => (
                                <option key={courier._id} value={courier._id}>
                                  {courier.name} · {courier.vehicleType}
                                </option>
                              ))}
                          </select>
                          <button type="button" onClick={() => saveCourier(parcel._id)} disabled={!courierForms[parcel._id]}>
                            Assign
                          </button>
                        </div>
                      ) : parcel.courierName ? (
                        <span className="courier-summary">{parcel.courierName}<small>{parcel.courierPhone}</small></span>
                      ) : "Not assigned"}
                    </td>
                    {isAdmin && <td><div className="status-actions"><select className="status-select" aria-label={`Update ${parcel.trackingNumber} status`} value={parcel.status} onChange={(event) => changeStatus(parcel._id, event.target.value)}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>{parcel.status === "Booked" && <button className="accept-parcel-button" type="button" onClick={() => changeStatus(parcel._id, "Picked Up", "Parcel accepted for pickup.")}>Accept</button>}</div></td>}
                  </tr>
                )) : (
                  <tr><td colSpan={isAdmin ? 9 : 8} className="empty-cell">{query || statusFilter ? "No shipments match these filters." : "No parcels yet. Book your first delivery below."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="booking-panel">
          <div className="panel-heading booking-heading"><div><span className="dashboard-overline">NEW DELIVERY</span><h2>Book a parcel</h2></div><span className="booking-step">01 <i /> 02 <i /> 03</span></div>
          <p className="booking-intro">Add sender and recipient details to create a trackable shipment.</p>
          <form onSubmit={createParcel} className="booking-form">
            <div className="form-section-title"><span>01</span> SENDER DETAILS</div>
            <div className="form-grid">
              <label>Sender name<input name="senderName" value={formData.senderName} onChange={changeField} placeholder="Full name" required /></label>
              <label>Phone number<input name="senderPhone" type="tel" value={formData.senderPhone} onChange={changeField} placeholder="+91 98765 43210" required /></label>
              <label className="form-span">Pickup address<input name="senderAddress" value={formData.senderAddress} onChange={changeField} placeholder="Street, city, state" required /></label>
            </div>
            <div className="form-section-title recipient-title"><span>02</span> RECIPIENT DETAILS</div>
            <div className="form-grid">
              <label>Recipient name<input name="receiverName" value={formData.receiverName} onChange={changeField} placeholder="Full name" required /></label>
              <label>Phone number<input name="receiverPhone" type="tel" value={formData.receiverPhone} onChange={changeField} placeholder="+91 98765 43210" required /></label>
              <label className="form-span">Delivery address<input name="receiverAddress" value={formData.receiverAddress} onChange={changeField} placeholder="Street, city, state" required /></label>
              <label>Parcel size<select name="packageSize" value={formData.packageSize} onChange={changeField}><option>Small</option><option>Medium</option><option>Large</option></select></label>
              <label>Quantity<input name="quantity" type="number" min="1" max="100" step="1" value={formData.quantity} onChange={changeField} required /></label>
              <label className="form-span">Parcel note <textarea name="description" value={formData.description} onChange={changeField} placeholder="Optional package description or delivery notes" rows="3" /></label>
              
            </div>
            <div className="form-actions"><span>🔒 Your shipment details stay private.</span><button className="primary-button" type="submit" disabled={saving}>{saving ? "Booking..." : "Book shipment"} <span>→</span></button></div>
          </form>
        </section>
        <footer className="dashboard-footer"><span>© {new Date().getFullYear()} NexRoute Courier</span><Link to="/">Track a shipment ↗</Link></footer>
      </main>
    </div>
  );
}
