require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function seedAdmin() {
  try {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();

    const existing = await User.findOne({ email });

    if (existing) {
      console.log("This email already exists. No changes made.");
      return;
    }

    const password = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      12
    );

    await User.create({
      name: "Courier Administrator",
      email,
      password,
      role: "admin"
    });

    console.log("Admin account created successfully");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();