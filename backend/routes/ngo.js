const express = require('express');

const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// ── GET ALL APPROVED NGOS ───────────────────
router.get('/', async (req, res) => {

  try {

    const result = await db.query(
      `
      SELECT
        id,
        name,
        description,
        totalDonations
      FROM ngos
      WHERE status = $1
      ORDER BY name
      `,
      ['approved']
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

// ── GET NGO REQUIREMENTS ────────────────────
router.get('/:id/requirements', async (req, res) => {

  try {

    const result = await db.query(
      `
      SELECT *
      FROM requirements
      WHERE ngo_id = $1
      AND status = 'active'
      ORDER BY created_at DESC
      `,
      [req.params.id]
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

// ── ADD REQUIREMENT ─────────────────────────
router.post(
  '/:id/requirements',
  auth(['ngo']),
  async (req, res) => {

    if (req.user.id != req.params.id) {

      return res.status(403).json({
        error:
        'You can only add requirements to your own NGO'
      });
    }

    const {
      title,
      description,
      goal_amount
    } = req.body;

    if (!title || !goal_amount) {

      return res.status(400).json({
        error:
        'Title and goal amount are required'
      });
    }

    try {

      const result = await db.query(
        `
        INSERT INTO requirements
        (
          ngo_id,
          title,
          description,
          goal_amount
        )
        VALUES ($1,$2,$3,$4)
        RETURNING id
        `,
        [
          req.params.id,
          title,
          description || '',
          goal_amount
        ]
      );

      res.status(201).json({
        message: 'Requirement added',
        id: result.rows[0].id
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);

// ── UPDATE REQUIREMENT ──────────────────────
router.patch(
  '/:id/requirements/:rid',
  auth(['ngo']),
  async (req, res) => {

    if (req.user.id != req.params.id) {

      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const {
      title,
      description,
      goal_amount,
      status
    } = req.body;

    try {

      await db.query(
        `
        UPDATE requirements
        SET
          title = COALESCE($1,title),
          description = COALESCE($2,description),
          goal_amount = COALESCE($3,goal_amount),
          status = COALESCE($4,status)
        WHERE id = $5
        AND ngo_id = $6
        `,
        [
          title,
          description,
          goal_amount,
          status,
          req.params.rid,
          req.params.id
        ]
      );

      res.json({
        message: 'Requirement updated'
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);

// ── NGO DONATIONS ───────────────────────────
router.get(
  '/:id/donations',
  auth(['ngo', 'admin']),
  async (req, res) => {

    if (
      req.user.role === 'ngo' &&
      req.user.id != req.params.id
    ) {

      return res.status(403).json({
        error: 'Access denied'
      });
    }

    try {

      const result = await db.query(
        `
        SELECT
          d.*,
          r.title AS "requirementTitle"
        FROM donations d
        LEFT JOIN requirements r
        ON d.requirement_id = r.id
        WHERE d.ngo_id = $1
        AND d.status = 'completed'
        ORDER BY d.created_at DESC
        `,
        [req.params.id]
      );

      res.json(result.rows);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);

// ── NGO SUMMARY ─────────────────────────────
router.get(
  '/:id/summary',
  auth(['ngo', 'admin']),
  async (req, res) => {

    try {

      const ngoResult = await db.query(
        `
        SELECT
          name,
          email,
          totalDonations
        FROM ngos
        WHERE id = $1
        `,
        [req.params.id]
      );

      const countResult = await db.query(
        `
        SELECT COUNT(*) AS count
        FROM donations
        WHERE ngo_id = $1
        AND status = 'completed'
        `,
        [req.params.id]
      );

      res.json({
        ...ngoResult.rows[0],
        donationCount:
        countResult.rows[0].count
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);

module.exports = router;