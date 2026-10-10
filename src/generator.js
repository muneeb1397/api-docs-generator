// src/generator.js — writes openapi.yaml and API.md
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Extract path-parameter names from an OpenAPI-style path string.
 * e.g. "/users/{id}/posts/{postId}" → ["id", "postId"]
 */
function extractPathParamNames(pathStr) {
  const matches = pathStr.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1));
}

/**
 * Convert Express-style :param to OpenAPI {param}.
 */
function normaliseRoutePath(p) {
  return p.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
}

/**
 * Return true if `obj` looks like a valid OpenAPI parameter object.
 */
function isValidParam(obj) {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.in === 'string'
  );
}

/**
 * Sanitise a single parameter object, filling missing fields.
 */
function sanitiseParam(p) {
  return {
    name: p.name,
    in: p.in,
    required: p.in === 'path' ? true : Boolean(p.required),
    schema: p.schema && typeof p.schema === 'object' ? p.schema : { type: 'string' },
    description: p.description || `${p.name} parameter`,
  };
}

/**
 * Sanitise requestBody: drop stray keys the LLM may have mixed in.
 * Returns null if the body is not usable.
 */
function sanitiseRequestBody(rb) {
  if (!rb || typeof rb !== 'object') return null;

  // If it has a `content` key, keep only that
  if (rb.content && typeof rb.content === 'object') {
    const clean = { content: {} };
    for (const [media, mediaObj] of Object.entries(rb.content)) {
      if (mediaObj && typeof mediaObj === 'object') {
        const schema = mediaObj.schema || { type: 'object' };
        clean.content[media] = { schema };
      }
    }
    if (Object.keys(clean.content).length > 0) return clean;
  }

  return null;
}

/**
 * Ensure every {param} in the path has a corresponding entry in `parameters`.
 */
function ensurePathParams(routePath, parameters) {
  const names = extractPathParamNames(routePath);
  const existing = new Set(
    parameters.filter((p) => p.in === 'path').map((p) => p.name)
  );

  for (const name of names) {
    if (!existing.has(name)) {
      parameters.push({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: `${name} parameter`,
      });
    }
  }

  return parameters;
}

// ─── buildOpenApi ───────────────────────────────────────────────────────────

/**
 * Build a complete OpenAPI 3.0.3 document object from a flat array of route
 * descriptors (as returned by the parser).
 *
 * @param {object[]} routes
 * @returns {object}
 */
function buildOpenApi(routes) {
  const doc = {
    openapi: '3.0.3',
    info: {
      title: 'Generated API',
      version: '1.0.0',
    },
    paths: {},
  };

  for (const route of routes) {
    const method = (route.method || 'get').toLowerCase();
    const routePath = normaliseRoutePath(route.path || '/');

    if (!doc.paths[routePath]) {
      doc.paths[routePath] = {};
    }

    // Sanitise parameters — keep only well-formed ones
    let parameters = Array.isArray(route.parameters)
      ? route.parameters.filter(isValidParam).map(sanitiseParam)
      : [];
    parameters = ensurePathParams(routePath, parameters);

    const responses =
      route.responses && typeof route.responses === 'object' && Object.keys(route.responses).length > 0
        ? route.responses
        : { '200': { description: 'OK' } };

    const operation = {
      summary: route.summary || `${method.toUpperCase()} ${routePath}`,
      parameters: parameters.length > 0 ? parameters : undefined,
      responses,
    };

    // Sanitise and attach requestBody (drop null / malformed)
    const rb = sanitiseRequestBody(route.requestBody);
    if (rb) operation.requestBody = rb;

    doc.paths[routePath][method] = operation;
  }

  return doc;
}

// ─── Markdown generation ────────────────────────────────────────────────────

/**
 * Render a Markdown documentation string from an OpenAPI 3.0.3 object.
 */
function renderMarkdown(doc) {
  const lines = [];

  lines.push(`# ${doc.info.title}`);
  lines.push('');
  lines.push(`> Version ${doc.info.version}`);
  lines.push('');

  // ── summary table ──
  lines.push('## Endpoints');
  lines.push('');
  lines.push('| Method | Path | Summary |');
  lines.push('|--------|------|---------|');

  const entries = []; // collect for per-endpoint sections
  for (const [routePath, methods] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      entries.push({ method, path: routePath, op });
      lines.push(
        `| \`${method.toUpperCase()}\` | \`${routePath}\` | ${op.summary || '—'} |`
      );
    }
  }

  lines.push('');

  // ── per-endpoint sections ──
  for (const { method, path: routePath, op } of entries) {
    lines.push('---');
    lines.push('');
    lines.push(`### ${method.toUpperCase()} \`${routePath}\``);
    lines.push('');
    if (op.summary) {
      lines.push(op.summary);
      lines.push('');
    }

    // Parameters table
    if (op.parameters && op.parameters.length > 0) {
      lines.push('#### Parameters');
      lines.push('');
      lines.push('| Name | In | Required | Type | Description |');
      lines.push('|------|----|----------|------|-------------|');
      for (const p of op.parameters) {
        const type = p.schema?.type || 'string';
        lines.push(
          `| \`${p.name}\` | ${p.in} | ${p.required ? 'Yes' : 'No'} | ${type} | ${p.description || '—'} |`
        );
      }
      lines.push('');
    }

    // Request body
    if (op.requestBody) {
      lines.push('#### Request Body');
      lines.push('');
      const content = op.requestBody.content;
      if (content) {
        for (const [mediaType, mediaObj] of Object.entries(content)) {
          lines.push(`**Content-Type:** \`${mediaType}\``);
          lines.push('');
          if (mediaObj.schema) {
            lines.push('```json');
            lines.push(JSON.stringify(mediaObj.schema, null, 2));
            lines.push('```');
            lines.push('');
          }
        }
      }
    }

    // Responses
    if (op.responses) {
      lines.push('#### Responses');
      lines.push('');
      lines.push('| Status | Description |');
      lines.push('|--------|-------------|');
      for (const [status, resp] of Object.entries(op.responses)) {
        lines.push(`| ${status} | ${resp.description || '—'} |`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── writeOutputs ───────────────────────────────────────────────────────────

/**
 * Write the OpenAPI spec as YAML and a human-readable API.md to `outDir`.
 *
 * @param {object} openapi – OpenAPI 3.0.3 document object
 * @param {string} outDir  – target directory (created if needed)
 * @returns {{ yamlPath: string, mdPath: string }}
 */
function writeOutputs(openapi, outDir) {
  const resolved = path.resolve(outDir);
  fs.mkdirSync(resolved, { recursive: true });

  // openapi.yaml
  const yamlStr = yaml.dump(openapi, {
    noRefs: true,
    lineWidth: 120,
    quotingType: '"',
    forceQuotes: false,
  });
  const yamlPath = path.join(resolved, 'openapi.yaml');
  fs.writeFileSync(yamlPath, yamlStr, 'utf-8');

  // API.md
  const mdStr = renderMarkdown(openapi);
  const mdPath = path.join(resolved, 'API.md');
  fs.writeFileSync(mdPath, mdStr, 'utf-8');

  return { yamlPath, mdPath };
}

module.exports = { buildOpenApi, writeOutputs };
