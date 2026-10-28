import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../utils/Axios";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (!/^[^\s.@]+(?:\.[^\s.@]+)*@[^\s.@]+(?:\.[^\s.@]+)+$/.test(email.trim())) {
      setError("Enter a valid email address, including the correct dots (for example, name@example.com).");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const response = await API.post("/auth/register", { name, email, password });
      sessionStorage.setItem("token", response.data.token);
      sessionStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/dashboard");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to create your account. Please check your details.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand auth-brand" to="/"><span className="brand-mark">N</span><span>NEXROUTE</span></Link>
      <section className="auth-card">
        <span className="auth-kicker">YOUR NEXT DELIVERY STARTS HERE</span>
        <h1>Make room<br />for the good stuff.</h1>
        <p className="auth-description">Create an account to book parcels and follow every delivery.</p>
        {error && <div role="alert" className="notice notice-error">{error}</div>}
        <form onSubmit={handleRegister} className="auth-form" noValidate>
          <label>Full name<input type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required /></label>
          <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
          <label>Password<input type="password" autoComplete="new-password" minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required /></label>
          <button type="submit" className="primary-button auth-submit" disabled={loading}>{loading ? "Creating account..." : "Create account"} <span>→</span></button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        <Link className="auth-back" to="/">← Back to tracking</Link>
      </section>
      <div className="auth-note"><span>✳</span> A little more peace of mind, with every parcel.</div>
    </main>
  );
}
