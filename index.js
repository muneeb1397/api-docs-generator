#!/usr/bin/env node
'use strict';

// index.js — CLI entry point: parses args and dispatches

const path = require('path');

const { scanRoutes } = require('./src/scanner');
const { extractRoutes } = require('./src/parser');
const { buildOpenApi, writeOutputs } = require('./src/generator');

const args = process.argv.slice(2);

function printUsage() {
  console.log('Usage: api-docs-generator <routesDir> [--out <dir>] [--serve]');
  process.exit(1);
}

if (!args.length || args.includes('--help')) printUsage();

/**
 * Derive mount prefix from filename (users.js → /users) and prepend it
 * to each route path that doesn't already start with that prefix.
 */
function applyMountPrefix(relPath, routes) {
  const base = path.basename(relPath, '.js');       // "users"
  const prefix = '/' + base;                         // "/users"

  return routes.map((r) => {
    let p = r.path || '/';
    if (!p.startsWith(prefix)) {
      p = p === '/' ? prefix : (prefix + p).replace(/\/\//g, '/');
    }
    return { ...r, path: p };
  });
}

(async () => {
  const routesDir = args[0];
  const outIdx = args.indexOf('--out');
  const outDir = outIdx !== -1 ? args[outIdx + 1] : 'docs';
  const serve = args.includes('--serve');

  if (!routesDir || routesDir.startsWith('--')) printUsage();
  if (outIdx !== -1 && !outDir) printUsage();

  console.log('Routes dir :', routesDir);
  console.log('Output dir :', outDir);
  console.log('Serve UI   :', serve);
  console.log();

  // --- scan route files ---
  let routeFiles;
  try {
    routeFiles = scanRoutes(routesDir);
    console.log(`Found ${routeFiles.length} route file(s):`);
    routeFiles.forEach((r) => console.log(`  • ${r.relPath}`));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  // --- extract routes via LLM ---
  console.log('\nExtracting routes via LLM…');
  const allRoutes = [];

  for (const rf of routeFiles) {
    const routes = await extractRoutes(rf.relPath, rf.code);
    const prefixed = applyMountPrefix(rf.relPath, routes);
    allRoutes.push(...prefixed);
    console.log(`  ${rf.relPath}: ${routes.length} route(s)`);
  }

  if (allRoutes.length === 0) {
    console.error('No routes extracted. Aborting.');
    process.exit(1);
  }

  // --- generate OpenAPI doc & write outputs ---
  const openapi = buildOpenApi(allRoutes);
  const { yamlPath, mdPath } = writeOutputs(openapi, outDir);

  const endpointCount = Object.values(openapi.paths)
    .reduce((n, methods) => n + Object.keys(methods).length, 0);

  console.log(`\nWritten ${endpointCount} endpoint(s):`);
  console.log(`  • ${yamlPath}`);
  console.log(`  • ${mdPath}`);
})();
