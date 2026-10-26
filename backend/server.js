
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const app = express();

// CORS configuration
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
  })
);

// IMPORTANT: Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploaded images folder
app.use("/upload", express.static(path.join(__dirname, "uploads")));

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "Courier Tracking API is running",
  });
});

// API routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/parcels", require("./routes/parcelRoutes"));

// Start server
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET must be configured before starting the server.");
  process.exit(1);
}

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });
