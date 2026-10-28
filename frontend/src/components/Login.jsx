import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../utils/Axios";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    if (!/^[^\s.@]+(?:\.[^\s.@]+)*@[^\s.@]+(?:\.[^\s.@]+)+$/.test(email.trim())) {
      setError("Enter a valid email address, including the correct dots (for example, name@example.com).");
      return;
    }
    if (!password) {
      setError("Enter your password to sign in.");
      return;
    }
    setLoading(true);
    try {
      const response = await API.post("/auth/login", { email, password });
      sessionStorage.setItem("token", response.data.token);
      sessionStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/dashboard");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to sign in. Check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand auth-brand" to="/"><span className="brand-mark">N</span><span>NEXROUTE</span></Link>
      <section className="auth-card">
        <span className="auth-kicker">WELCOME BACK</span>
        <h1>Your shipments<br />are waiting.</h1>
        <p className="auth-description">Sign in to book a delivery or check on your parcels.</p>
        {error && <div role="alert" className="notice notice-error">{error}</div>}
        <form onSubmit={handleLogin} className="auth-form" noValidate>
          <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /></label>
          <button type="submit" className="primary-button auth-submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"} <span>→</span></button>
        </form>
        <p className="auth-switch">New to NexRoute? <Link to="/register">Create an account</Link></p>
        <Link className="auth-back" to="/">← Back to tracking</Link>
      </section>
      <div className="auth-note"><span>✳</span> A little more peace of mind, with every parcel.</div>
    </main>
  );
}
