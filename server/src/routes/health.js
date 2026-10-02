const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1;');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Database unreachable' });
  }
});

module.exports = router;
