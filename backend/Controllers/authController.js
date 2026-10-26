const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function makeToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Name, valid email and password (8+ characters) required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({
      email: normalizedEmail
    });

    if (existing) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
      // Public registration can never set the admin role.
    });

    res.status(201).json({
      token: makeToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email?.trim().toLowerCase()
    });

    if (
      !user ||
      !(await bcrypt.compare(password || "", user.password))
    ) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    res.json({
      token: makeToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
};