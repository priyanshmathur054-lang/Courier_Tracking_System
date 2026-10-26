
const Parcel = require("../models/Parcel");
const crypto = require("crypto");
const mongoose = require("mongoose");

// Generate unique tracking number
const generateTrackingNumber = () => {
  return "CR" + crypto.randomBytes(5).toString("hex").toUpperCase();
};

// =====================================
// 1. CREATE / BOOK PARCEL
// POST /api/parcels
// =====================================
const createParcel = async (req, res) => {
  try {
    const {
      senderName,
      senderPhone,
      senderAddress,
      receiverName,
      receiverPhone,
      receiverAddress,
      description,
    } = req.body || {};

    // Validate required fields
    const requiredFields = [
      senderName,
      senderPhone,
      senderAddress,
      receiverName,
      receiverPhone,
      receiverAddress,
    ];
    if (
      requiredFields.some(
        (value) => typeof value !== "string" || !value.trim(),
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required parcel fields.",
      });
    }

    // Check authenticated user
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first.",
      });
    }

    // Save parcel in MongoDB
    const parcel = await Parcel.create({
      trackingNumber: generateTrackingNumber(),
      senderName: senderName.trim(),
      senderPhone: senderPhone.trim(),
      senderAddress: senderAddress.trim(),
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim(),
      receiverAddress: receiverAddress.trim(),
      description: typeof description === "string" ? description.trim() : "",
      createdBy: userId,
      status: "Booked",
      delayAlert: false,
      history: [{ status: "Booked", note: "Parcel booking created" }],
    });

    return res.status(201).json({
      success: true,
      message: "Courier booked successfully!",
      parcel,
    });
  } catch (error) {
    console.error("Create parcel error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to book courier",
    });
  }
};

// =====================================
// 2. GET ALL PARCELS
// GET /api/parcels
// =====================================
const getParcels = async (req, res) => {
  try {
    const filter = req.user?.role === "admin" ? {} : { createdBy: req.user.id };
    const parcels = await Parcel.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: parcels.length,
      parcels,
    });
  } catch (error) {
    console.error("Get parcels error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch parcels",
    });
  }
};

// =====================================
// 3. TRACK PARCEL
// GET /api/parcels/track/:trackingNumber
// =====================================
const trackParcel = async (req, res) => {
  try {
    const trackingNumber = req.params.trackingNumber.trim();

    const parcel = await Parcel.findOne({
      trackingNumber: trackingNumber.toUpperCase(),
    })
      .select(
        "trackingNumber status createdAt updatedAt history courierName courierPhone courierVehicle",
      )
      .lean();

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: "Parcel not found",
      });
    }

    return res.status(200).json({
      success: true,
      parcel,
    });
  } catch (error) {
    console.error("Track parcel error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to track parcel",
    });
  }
};

// =====================================
// 4. UPDATE PARCEL STATUS
// PATCH /api/parcels/:id/status
// =====================================
const updateParcelStatus = async (req, res) => {
  try {
    const { status, location = "", note = "" } = req.body || {};

    const allowedStatuses = [
      "Booked",
      "Picked Up",
      "In Transit",
      "At Warehouse",
      "Out for Delivery",
      "Delivered",
      "Delayed",
      "Cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parcel status",
        allowedStatuses,
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parcel ID",
      });
    }

    const parcel = await Parcel.findById(req.params.id);

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: "Parcel not found",
      });
    }

    parcel.status = status;
    parcel.history.push({
      status,
      location: typeof location === "string" ? location.trim() : "",
      note: typeof note === "string" ? note.trim() : "",
    });
    await parcel.save();

    return res.status(200).json({
      success: true,
      message: "Parcel status updated successfully",
      parcel,
    });
  } catch (error) {
    console.error("Update parcel status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update parcel status",
    });
  }
};

const updateCourierDetails = async (req, res) => {
  try {
    const { courierName, courierPhone, courierVehicle = "" } = req.body || {};

    if (
      typeof courierName !== "string" ||
      !courierName.trim() ||
      typeof courierPhone !== "string" ||
      !courierPhone.trim() ||
      typeof courierVehicle !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Courier name and phone number are required.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parcel ID",
      });
    }

    const parcel = await Parcel.findByIdAndUpdate(
      req.params.id,
      {
        courierName: courierName.trim(),
        courierPhone: courierPhone.trim(),
        courierVehicle: courierVehicle.trim(),
      },
      { new: true, runValidators: true },
    );

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: "Parcel not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Courier details updated successfully",
      parcel,
    });
  } catch (error) {
    console.error("Update courier details error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update courier details",
    });
  }
};

// Export controller functions
module.exports = {
  createParcel,
  getParcels,
  trackParcel,
  updateParcelStatus,
  updateCourierDetails,
};
