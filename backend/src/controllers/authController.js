const User = require('../models/user');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

const ALLOWED_ROLES = ['admin', 'owner', 'staff'];

const signup = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const phoneTrimmed = phone != null ? String(phone).trim() : '';

    if (!name?.trim() || !email?.trim() || !password || !role || !phoneTrimmed) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, password, and role are required',
        timestamp: new Date().toISOString(),
        
      });
    }

    const roleNormalized = String(role).toLowerCase().trim();

    if (!ALLOWED_ROLES.includes(roleNormalized)) {
      return res.status(400).json({ success: false, message: 'Please select a valid role' });
    }

    const emailLower = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      $or: [{ email: emailLower }, { phone: phoneTrimmed }],
    });
    if (existingUser) {
      const msg =
        existingUser.email === emailLower
          ? 'User already exists with this email'
          : 'User already exists with this phone number';
      return res.status(400).json({ success: false, message: msg });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: emailLower,
      phone: phoneTrimmed,
      password: hashedPassword,
      role: roleNormalized,
    });

    res.status(201).json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      message: 'Signup successful',
      token: generateToken(user._id),
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const message =
        field === 'phone'
          ? 'Phone number already registered'
          : 'User already exists';
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email or password'
      });
    }

    res.status(200).json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      message: 'Login successful',
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { signup, login };
