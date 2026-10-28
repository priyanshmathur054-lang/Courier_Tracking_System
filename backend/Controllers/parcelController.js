
const Parcel = require("../models/Parcel");
const Courier = require("../models/Courier");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { checkRain } = require("../utils/weather");

const getVehicleType = (packageSize, quantity) => {
  const sizeUnits = { Small: 1, Medium: 4, Large: 13 };
  const totalUnits = sizeUnits[packageSize] * quantity;
  if (totalUnits <= 3) return "Bike";
  if (totalUnits <= 12) return "Van";
  return "Truck";
};

const getAvailableCourier = async (vehicleType) => {
  const eligibleCouriers = await Courier.find({
    active: true,
    vehicleType,
  }).lean();

  if (!eligibleCouriers.length) {
    const error = new Error("No active courier is available for this parcel size.");
    error.statusCode = 503;
    throw error;
  }

  const counts = await Parcel.aggregate([
    {
      $match: {
        courierId: { $in: eligibleCouriers.map((courier) => courier._id) },
        status: { $nin: ["Delivered", "Complete", "Cancelled", "Reject"] },
      },
    },
    { $group: { _id: "$courierId", count: { $sum: 1 } } },
  ]);
  const loadByCourier = new Map(counts.map((item) => [String(item._id), item.count]));

  return eligibleCouriers.sort((first, second) => {
    const loadDifference =
      (loadByCourier.get(String(first._id)) || 0) -
      (loadByCourier.get(String(second._id)) || 0);
    return loadDifference || first.name.localeCompare(second.name);
  })[0];
};

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
      packageSize = "Small",
      quantity = 1,
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
        message: "Parcel invalid. Please fill all required parcel fields.",
      });
    }

    if (!Object.hasOwn({ Small: true, Medium: true, Large: true }, packageSize)) {
      return res.status(400).json({
        success: false,
        message: "Parcel invalid. Choose a valid parcel size.",
      });
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 100) {
      return res.status(400).json({
        success: false,
        message: "Parcel invalid. Quantity must be a whole number between 1 and 100.",
      });
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first.",
      });
    }

    const normalizedParcel = {
      senderName: senderName.trim(),
      senderPhone: senderPhone.trim(),
      senderAddress: senderAddress.trim(),
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim(),
      receiverAddress: receiverAddress.trim(),
      packageSize,
      quantity: parsedQuantity,
      description: typeof description === "string" ? description.trim() : "",
    };

    const existingParcel = await Parcel.findOne({
      ...normalizedParcel,
      createdBy: userId,
      isDemo: false,
      status: "Booked",
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
    }).select("trackingNumber");

    if (existingParcel) {
      return res.status(409).json({
        success: false,
        message: "Parcel already created",
        trackingNumber: existingParcel.trackingNumber,
      });
    }

    const vehicleType = getVehicleType(packageSize, parsedQuantity);
    const courier = await getAvailableCourier(vehicleType);

    const parcel = await Parcel.create({
      trackingNumber: generateTrackingNumber(),
      ...normalizedParcel,
      vehicleType,
      courierId: courier._id,
      courierName: courier.name,
      courierPhone: courier.phone,
      courierVehicle: courier.vehicleType,
      createdBy: userId,
      status: "Booked",
      delayAlert: false,
      history: [{ status: "Booked", note: "Parcel booking created" }],
    });

    return res.status(201).json({
      success: true,
      message: "Parcel is created",
      parcel,
    });
  } catch (error) {
    console.error("Create parcel error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Parcel already created. Please refresh the parcel list.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Parcel invalid. Please check the parcel details and try again.",
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to book courier",
    });
  }
};

const getCouriers = async (_req, res) => {
  try {
    const couriers = await Courier.find({ active: true })
      .select("name phone vehicleType")
      .sort({ name: 1 })
      .lean();
    return res.status(200).json({ success: true, couriers });
  } catch (error) {
    console.error("Get couriers error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch available couriers.",
    });
  }
};

// =====================================
// 2. GET ALL PARCELS
// GET /api/parcels
// =====================================
const getParcels = async (req, res) => {
  try {
    const filter = req.user?.role === "admin"
      ? {}
      : { $or: [{ createdBy: req.user.id }, { isDemo: true }] };
    const parcels = await Parcel.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "New parcel created successfully.",
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
      "Complete",
      "Delayed",
      "Cancelled",
      "Reject",
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
    const { courierId } = req.body || {};
    if (!mongoose.isValidObjectId(courierId)) {
      return res.status(400).json({
        success: false,
        message: "Choose a valid courier from the active roster.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parcel ID",
      });
    }

    const courier = await Courier.findOne({ _id: courierId, active: true });
    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "That courier is no longer active. Refresh the roster and try again.",
      });
    }

    const parcel = await Parcel.findById(req.params.id);

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: "Parcel not found",
      });
    }

    if (courier.vehicleType !== parcel.vehicleType) {
      return res.status(400).json({
        success: false,
        message: `Choose a ${parcel.vehicleType} courier for this parcel.`,
      });
    }

    parcel.courierId = courier._id;
    parcel.courierName = courier.name;
    parcel.courierPhone = courier.phone;
    parcel.courierVehicle = courier.vehicleType;
    await parcel.save();

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

const checkWeather = async (req, res) => {
  const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
  if (!city) {
    return res.status(400).json({
      success: false,
      message: "Please provide a city to check its weather.",
    });
  }

  if (!process.env.WEATHER_API_KEY) {
    return res.status(503).json({
      success: false,
      message: "Weather check is unavailable. Configure WEATHER_API_KEY on the server.",
    });
  }

  try {
    const weather = await checkRain(city);
    return res.status(200).json({ success: true, weather });
  } catch (error) {
    console.error("Weather check error:", error);

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "City not found. Check the city name and try again.",
      });
    }

    return res.status(502).json({
      success: false,
      message: "Unable to check weather right now. Please try again.",
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
  getCouriers,
  checkWeather,
};
