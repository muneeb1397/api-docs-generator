// src/scanner.js — scans route files from a directory
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Recursively collect all .js file paths under `dir`.
 * @param {string} dir  – absolute or relative directory path
 * @param {string} base – root directory (used to compute relPath)
 * @returns {string[]}  – list of absolute file paths
 */
function collectJsFiles(dir, base) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      results = results.concat(collectJsFiles(fullPath, base));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Scan a directory for Express route files.
 *
 * @param {string} dir – path to the routes directory
 * @returns {{ file: string, relPath: string, code: string }[]}
 * @throws {Error} if `dir` does not exist or contains no .js files
 */
function scanRoutes(dir) {
  const resolvedDir = path.resolve(dir);

  // --- guard: directory must exist ---
  if (!fs.existsSync(resolvedDir)) {
    throw new Error(`Routes directory not found: ${resolvedDir}`);
  }

  const stat = fs.statSync(resolvedDir);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedDir}`);
  }

  // --- collect .js files recursively ---
  const files = collectJsFiles(resolvedDir, resolvedDir);

  if (files.length === 0) {
    throw new Error(`No .js route files found in: ${resolvedDir}`);
  }

  // --- build result objects ---
  return files.map((file) => {
    const relPath = path.relative(resolvedDir, file);
    const code = fs.readFileSync(file, 'utf-8');
    return { file, relPath, code };
  });
}

module.exports = { scanRoutes };
