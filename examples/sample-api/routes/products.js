'use strict';

// routes/products.js — product listing route

const router = require('express').Router();

// GET /products — list products (query: category, minPrice, page)
router.get('/', (req, res) => {
  const { category, minPrice, page } = req.query;
  res.json({
    category: category || 'all',
    minPrice: minPrice || 0,
    page: page || 1,
    items: [{ id: 1, name: 'Widget', price: 9.99, category: 'gadgets' }],
  });
});

module.exports = router;
