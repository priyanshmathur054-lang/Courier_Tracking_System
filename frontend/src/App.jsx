import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminDashboard from "./components/AdminDashboard";
import HomeTracking from "./components/HomeTracking";
import Login from "./components/Login";
import Register from "./components/Register";

function ProtectedDashboard() {
  return localStorage.getItem("token") ? (
    <AdminDashboard />
  ) : (
    <Navigate to="/login" replace />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeTracking />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
