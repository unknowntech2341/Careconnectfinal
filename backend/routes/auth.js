const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

// ── Admin Login ─────────────────────────────
router.post('/login', async (req, res) => {

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'Username and password required'
    });
  }

  try {

    const result = await db.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );

    const rows = result.rows;

    if (!rows.length) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const admin = rows[0];

    const match = await bcrypt.compare(
      password,
      admin.password
    );

    if (!match) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: 'admin'
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h'
      }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

// ── NGO Login ───────────────────────────────
router.post('/ngo-login', async (req, res) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password required'
    });
  }

  try {

    const result = await db.query(
      'SELECT * FROM ngos WHERE email = $1',
      [email]
    );

    const rows = result.rows;

    if (!rows.length) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const ngo = rows[0];

    const match = await bcrypt.compare(
      password,
      ngo.password
    );

    if (!match) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      {
        id: ngo.id,
        email: ngo.email,
        role: 'ngo'
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h'
      }
    );

    res.json({
      token,
      ngo: {
        id: ngo.id,
        name: ngo.name,
        email: ngo.email,
        status: ngo.status
      }
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

// ── NGO Register ────────────────────────────
router.post('/ngo-register', async (req, res) => {

  const {
    name,
    email,
    password,
    description,
    phone,
    website
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Name, email and password are required'
    });
  }

  try {

    const existingResult = await db.query(
      'SELECT id FROM ngos WHERE email = $1',
      [email]
    );

    const existing = existingResult.rows;

    if (existing.length) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO ngos
      (name, email, password, description, phone, website)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id`,
      [
        name,
        email,
        hashed,
        description || '',
        phone || '',
        website || ''
      ]
    );

    res.status(201).json({
      message:
      'NGO registered successfully. Awaiting admin approval.',
      ngoId: result.rows[0].id
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

module.exports = router;