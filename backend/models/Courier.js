const mongoose = require("mongoose");

const courierSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    vehicleType: {
      type: String,
      enum: ["Bike", "Van", "Truck"],
      required: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Courier", courierSchema);