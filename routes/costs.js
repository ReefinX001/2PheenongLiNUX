const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middlewares/authMiddleware');

// Get costs page
router.get('/costs', auth.isAuthenticated, (req, res) => {
  res.render('gifts/costs');
});

// API endpoint to get cost data
router.get('/api/costs', auth.isAuthenticated, async (req, res) => {
  try {
    const { dateFrom, dateTo, category } = req.query;

    let query = `
      SELECT p.product_id AS id, p.name, p.category, i.quantity, i.cost AS unitCost, i.date
      FROM inventory_transactions i
      JOIN products p ON i.product_id = p.product_id
      WHERE i.transaction_type = 'purchase'
    `;

    const params = [];

    if (dateFrom) {
      query += ` AND i.date >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND i.date <= ?`;
      params.push(dateTo);
    }

    if (category) {
      query += ` AND p.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY i.date DESC`;

    const costs = await db.query(query, params);

    res.json(costs);
  } catch (error) {
    console.error('Error fetching cost data:', error);
    res.status(500).json({ error: 'Failed to fetch cost data' });
  }
});

// API endpoint to get categories
router.get('/api/categories', auth.isAuthenticated, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT category 
      FROM products 
      ORDER BY category
    `;

    const categories = await db.query(query);
    const categoryList = categories.map(item => item.category);

    res.json(categoryList);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
