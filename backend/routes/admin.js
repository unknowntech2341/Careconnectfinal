const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin JWT
router.use(auth(['admin']));

// ── GET /admin/ngos ─────────────────────────
router.get('/ngos', async (req, res) => {

  const { status } = req.query;

  try {

    let query = `
      SELECT
        id,
        name,
        email,
        description,
        phone,
        website,
        status,
        totalDonations AS "totalDonations",
        created_at
      FROM ngos
    `;

    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(
      query,
      params
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

// ── PATCH /admin/ngo/:id ───────────────────
router.patch('/ngo/:id', async (req, res) => {

  const { id } = req.params;
  const { status } = req.body;

  if (
    !['approved', 'rejected']
    .includes(status)
  ) {
    return res.status(400).json({
      error:
      'Status must be approved or rejected'
    });
  }

  try {

    const result = await db.query(
      `UPDATE ngos
       SET status = $1
       WHERE id = $2
       RETURNING id`,
      [status, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'NGO not found'
      });
    }

    res.json({
      message: `NGO ${status} successfully`
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

// ── GET /admin/donations ───────────────────
router.get('/donations', async (req, res) => {

  try {

    const result = await db.query(`
      SELECT
        d.*,
        n.name AS "ngoName",
        r.title AS "requirementTitle"
      FROM donations d
      JOIN ngos n
      ON d.ngo_id = n.id
      LEFT JOIN requirements r
      ON d.requirement_id = r.id
      ORDER BY d.created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

// ── GET /admin/requirements ────────────────
router.get('/requirements', async (req, res) => {

  try {

    const result = await db.query(`
      SELECT
        r.*,
        n.name AS "ngoName"
      FROM requirements r
      JOIN ngos n
      ON r.ngo_id = n.id
      ORDER BY r.created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

module.exports = router;