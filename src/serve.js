// src/serve.js — serves Swagger UI for the generated spec
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const express = require('express');
const swaggerUi = require('swagger-ui-express');

/**
 * Start an Express server that serves Swagger UI at /docs.
 *
 * @param {string} outDir – directory containing openapi.yaml
 * @param {number} [port=3000] – port to listen on
 */
function serve(outDir, port = 3000) {
  const specPath = path.resolve(outDir, 'openapi.yaml');

  if (!fs.existsSync(specPath)) {
    throw new Error(`Spec not found: ${specPath}`);
  }

  const spec = yaml.load(fs.readFileSync(specPath, 'utf-8'));
  const app = express();

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));

  app.listen(port, () => {
    console.log(`\nSwagger UI: http://localhost:${port}/docs`);
  });
}

module.exports = { serve };
