require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Courier = require("./models/Courier");
const Parcel = require("./models/Parcel");

const DEMO_COURIERS = [
  { code: "demo-bike", name: "Demo Courier - Bike", phone: "0000000001", vehicleType: "Bike" },
  { code: "demo-van", name: "Demo Courier - Van", phone: "0000000002", vehicleType: "Van" },
  { code: "demo-truck", name: "Demo Courier - Truck", phone: "0000000003", vehicleType: "Truck" },
];

async function seedCouriers() {
  let couriers = DEMO_COURIERS;
  if (process.env.COURIERS_JSON) {
    couriers = JSON.parse(process.env.COURIERS_JSON);
  } else if (await Courier.exists({})) {
    return;
  }

  if (!Array.isArray(couriers) || couriers.length === 0) {
    throw new Error("COURIERS_JSON must be a non-empty JSON array.");
  }

  for (const courier of couriers) {
    if (
      !courier.code ||
      !courier.name ||
      !["Bike", "Van", "Truck"].includes(courier.vehicleType)
    ) {
      throw new Error("Each courier needs a code, name, and Bike, Van, or Truck vehicleType.");
    }
    await Courier.updateOne(
      { code: courier.code },
      {
        $set: {
          name: courier.name,
          phone: courier.phone || "",
          vehicleType: courier.vehicleType,
          active: courier.active !== false,
        },
      },
      { upsert: true, runValidators: true },
    );
  }
}

async function seedDemoParcels(admin) {
  const [bikeCourier, vanCourier, truckCourier] = await Promise.all([
    Courier.findOne({ active: true, vehicleType: "Bike" }).sort({ code: 1 }),
    Courier.findOne({ active: true, vehicleType: "Van" }).sort({ code: 1 }),
    Courier.findOne({ active: true, vehicleType: "Truck" }).sort({ code: 1 }),
  ]);
  const sampleParcels = [
    { trackingNumber: "DEMO-BOOKED-001", status: "Booked", packageSize: "Small", quantity: 1, vehicleType: "Bike", courier: bikeCourier },
    { trackingNumber: "DEMO-PICKED-UP-001", status: "Picked Up", packageSize: "Small", quantity: 1, vehicleType: "Bike", courier: bikeCourier },
    { trackingNumber: "DEMO-IN-TRANSIT-001", status: "In Transit", packageSize: "Medium", quantity: 2, vehicleType: "Van", courier: vanCourier },
    { trackingNumber: "DEMO-AT-WAREHOUSE-001", status: "At Warehouse", packageSize: "Medium", quantity: 2, vehicleType: "Van", courier: vanCourier },
    { trackingNumber: "DEMO-OUT-FOR-DELIVERY-001", status: "Out for Delivery", packageSize: "Medium", quantity: 2, vehicleType: "Van", courier: vanCourier },
    { trackingNumber: "DEMO-DELIVERED-001", status: "Delivered", packageSize: "Large", quantity: 1, vehicleType: "Truck", courier: truckCourier },
    { trackingNumber: "DEMO-COMPLETE-001", status: "Complete", packageSize: "Medium", quantity: 2, vehicleType: "Van", courier: vanCourier },
    { trackingNumber: "DEMO-DELAYED-001", status: "Delayed", packageSize: "Small", quantity: 2, vehicleType: "Bike", courier: bikeCourier },
    { trackingNumber: "DEMO-CANCELLED-001", status: "Cancelled", packageSize: "Small", quantity: 1, vehicleType: "Bike", courier: bikeCourier },
    { trackingNumber: "DEMO-REJECT-001", status: "Reject", packageSize: "Large", quantity: 4, vehicleType: "Truck", courier: truckCourier },
  ];

  const documents = sampleParcels.map(({ courier, ...sample }, index) => ({
    ...sample,
    senderName: "Demo Sender",
    senderPhone: "0000000000",
    senderAddress: "Sample origin",
    receiverName: `Demo ${sample.status} Parcel`,
    receiverPhone: "0000000000",
    receiverAddress: "Sample destination",
    description: "Seeded example parcel. Replace with real booking data.",
    courierId: courier?._id || null,
    courierName: courier?.name || "",
    courierPhone: courier?.phone || "",
    courierVehicle: courier?.vehicleType || "",
    createdBy: admin._id,
    history: [{ status: sample.status, note: "Seeded demo parcel" }],
    createdAt: new Date(Date.now() - index * 60_000),
  }));

  for (const document of documents) {
    await Parcel.updateOne(
      { trackingNumber: document.trackingNumber },
      { $setOnInsert: document, $set: { isDemo: true } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
}

async function seedAdmin() {
  try {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();

    let admin = await User.findOne({ email });
    if (!admin) {
      const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      admin = await User.create({
        name: "Courier Administrator",
        email,
        password,
        role: "admin",
      });
      console.log("Admin account created successfully");
    } else {
      console.log("Admin account already exists; keeping existing credentials.");
    }

    await seedCouriers();
    await seedDemoParcels(admin);
    console.log("Courier roster and demo parcels are ready.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();