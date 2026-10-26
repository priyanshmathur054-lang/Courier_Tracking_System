const mongoose = require("mongoose");

const parcelSchema = new mongoose.Schema(
  {
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    senderName: { type: String, required: true },
    senderPhone: { type: String, required: true },
    senderAddress: { type: String, required: true },
    receiverName: { type: String, required: true },
    receiverPhone: { type: String, required: true },
    receiverAddress: { type: String, required: true },
    courierName: { type: String, default: "" },
    courierPhone: { type: String, default: "" },
    courierVehicle: { type: String, default: "" },
    description: { type: String, default: "" },
    serviceType: {
      type: String,
      enum: ["Standard", "Express"],
      default: "Standard"
    },
    weightKg: { type: Number, min: 0.1, max: 30, default: 1 },
    shippingFee: { type: Number, min: 0, default: 115 },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending"
    },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    delayAlert: {
      type: Boolean,
      default: false
    },
    weatherAlert: { type: String, default: "" },
    courierPhoto: {
        type: String,
        default: ""
    },
    status: {
      type: String,
      enum: [
        "Booked",
        "Picked Up",
        "In Transit",
        "At Warehouse",
        "Out for Delivery",
        "Delivered",
        "Delayed",
        "Cancelled"
      ],
      default: "Booked"
    },
    history: [
      {
        status: { type: String, required: true },
        location: { type: String, default: "" },
        note: { type: String, default: "" },
        updatedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Parcel", parcelSchema);