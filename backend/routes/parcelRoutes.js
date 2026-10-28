
const express = require("express");
const router = express.Router();

// Import controller functions
const {
  createParcel,
  getParcels,
  trackParcel,
  updateParcelStatus,
  updateCourierDetails,
  getCouriers,
  checkWeather,
} = require("../Controllers/parcelController");

// Import middleware
const { protect, adminOnly } = require("../middleware/authMiddleware");

// ======================================
// 1. CREATE / BOOK NEW PARCEL
// POST /api/parcels
// ======================================
router.post(
  "/",
  protect,
  createParcel
);

// ======================================
// 2. GET ALL PARCELS
// GET /api/parcels
// ======================================
router.get(
  "/",
  protect,
  getParcels
);

router.get(
  "/weather",
  protect,
  adminOnly,
  checkWeather
);

router.get("/couriers", protect, adminOnly, getCouriers);

// ======================================
// 3. TRACK PARCEL BY TRACKING NUMBER
// GET /api/parcels/track/:trackingNumber
// ======================================
router.get(
  "/track/:trackingNumber",
  trackParcel
);

// ======================================
// 4. UPDATE PARCEL STATUS
// PATCH /api/parcels/:id/status
// ======================================
router.patch(
  "/:id/status",
  protect,
  adminOnly,
  updateParcelStatus
);

router.patch(
  "/:id/courier",
  protect,
  adminOnly,
  updateCourierDetails
);

// Export router
module.exports = router;
