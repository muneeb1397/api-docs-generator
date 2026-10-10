'use strict';

// routes/users.js — CRUD routes for users

const router = require('express').Router();

// GET /users — list all users
router.get('/', (req, res) => {
  res.json([{ id: 1, name: 'Alice', email: 'alice@example.com' }]);
});

// GET /users/:id — get user by id
router.get('/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Alice', email: 'alice@example.com' });
});

// POST /users — create user (body: name, email)
router.post('/', (req, res) => {
  const { name, email } = req.body;
  res.status(201).json({ id: 2, name, email });
});

// PUT /users/:id — update user
router.put('/:id', (req, res) => {
  res.json({ id: req.params.id, ...req.body });
});

// DELETE /users/:id — delete user
router.delete('/:id', (req, res) => {
  res.status(204).end();
});

module.exports = router;
