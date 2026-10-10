// test/check.js — assert expected endpoints exist in generated openapi.yaml
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SPEC_PATH = path.resolve(__dirname, '..', 'docs', 'openapi.yaml');

const EXPECTED = [
  { method: 'get',    path: '/users' },
  { method: 'post',   path: '/users' },
  { method: 'get',    path: '/users/{id}' },
  { method: 'put',    path: '/users/{id}' },
  { method: 'delete', path: '/users/{id}' },
  { method: 'get',    path: '/products' },
];

// --- load spec ---
if (!fs.existsSync(SPEC_PATH)) {
  console.error(`Spec not found: ${SPEC_PATH}`);
  process.exit(1);
}

const doc = yaml.load(fs.readFileSync(SPEC_PATH, 'utf-8'));
const paths = doc.paths || {};

// --- collect actual endpoints ---
const actualSet = new Set();
for (const [p, methods] of Object.entries(paths)) {
  for (const m of Object.keys(methods)) {
    actualSet.add(`${m.toLowerCase()} ${p}`);
  }
}

// --- check expected ---
let failures = 0;
const rows = [];

for (const ep of EXPECTED) {
  const key = `${ep.method} ${ep.path}`;
  const found = actualSet.has(key);
  if (!found) failures++;
  rows.push({
    endpoint: `${ep.method.toUpperCase()} ${ep.path}`,
    expected: 'present',
    actual: found ? 'present' : 'MISSING',
    result: found ? 'PASS' : 'FAIL',
  });
}

// --- check for unexpected extras ---
const expectedSet = new Set(EXPECTED.map((e) => `${e.method} ${e.path}`));
const extras = [...actualSet].filter((k) => !expectedSet.has(k));

// --- print table ---
console.log('\n--- Endpoint Check ---\n');
console.log(
  'Endpoint'.padEnd(24) +
  'Expected'.padEnd(12) +
  'Actual'.padEnd(12) +
  'Result'
);
console.log('-'.repeat(54));

for (const r of rows) {
  console.log(
    r.endpoint.padEnd(24) +
    r.expected.padEnd(12) +
    r.actual.padEnd(12) +
    r.result
  );
}

if (extras.length > 0) {
  console.log('\nUnexpected endpoints:');
  for (const e of extras) {
    const [m, ...rest] = e.split(' ');
    console.log(`  • ${m.toUpperCase()} ${rest.join(' ')}`);
  }
  failures += extras.length;
}

// --- summary ---
const total = rows.length + extras.length;
const passed = rows.filter((r) => r.result === 'PASS').length;
console.log(`\n${passed}/${rows.length} expected endpoints present, ${extras.length} unexpected.`);

if (failures > 0) {
  console.error(`\n✗ ${failures} issue(s) found.`);
  process.exit(1);
} else {
  console.log('\n✓ All checks passed.');
}
