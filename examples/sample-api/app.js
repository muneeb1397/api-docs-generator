'use strict';

// examples/sample-api/app.js — minimal Express app

const express = require('express');
const app = express();

app.use(express.json());
app.use('/users', require('./routes/users'));
app.use('/products', require('./routes/products'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sample API on http://localhost:${PORT}`));
