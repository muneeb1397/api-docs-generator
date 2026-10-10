// src/parser.js — parses LLM JSON into OpenAPI structures
'use strict';

const { callModel } = require('./model');

/**
 * Build the prompt that instructs the LLM to analyse a route file and return
 * a JSON array of OpenAPI-style route descriptors.
 *
 * @param {string} file    – filename (for context)
 * @param {string} code    – full source code of the route file
 * @returns {string}
 */
function buildPrompt(file, code) {
  return `\
Analyse the following Express route file and return ONLY a JSON array — no prose, \
no markdown code fences, no explanation. Each element must be an object with exactly \
these keys:

- "method"      (string, lowercase: get | post | put | patch | delete)
- "path"        (string, OpenAPI style, e.g. /users/{id}. Use the path as written \
in the code; the router mount prefix may be unknown, so just use the relative path.)
- "summary"     (string, one-line human description)
- "parameters"  (array of objects, each: { "name": string, "in": "path"|"query"|"header", \
"required": boolean, "schema": { "type": string }, "description": string }. \
Empty array [] if none.)
- "requestBody" (object with "content": { "application/json": { "schema": { "type": "object", \
"properties": { ... }, "required": [...] } } } } when the route reads req.body, \
or null if it does not)
- "responses"   (object keyed by HTTP status code strings, e.g. "200", "201", "204". \
Each value: { "description": string })

File: ${file}

\`\`\`javascript
${code}
\`\`\`

Return ONLY the JSON array.`;
}

/**
 * Clean raw LLM output and parse it into a JS array.
 *
 * Handles common model quirks:
 *   - wrapped in \`\`\`json … \`\`\` fences
 *   - leading/trailing prose before the first [ or after the last ]
 *
 * @param {string} text – raw model response
 * @returns {object[]}
 * @throws {Error} if the text cannot be parsed into a valid route array
 */
function parseModelOutput(text) {
  let cleaned = text.trim();

  // Strip ```json ... ``` fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Extract from first '[' to last ']'
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
    throw new Error('No JSON array found in model output');
  }

  cleaned = cleaned.slice(firstBracket, lastBracket + 1);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse JSON from model output: ${err.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Model output is not an array');
  }

  // Validate each element has at least method + path
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item || typeof item.method !== 'string' || typeof item.path !== 'string') {
      throw new Error(
        `Route at index ${i} is missing required "method" or "path" fields`
      );
    }
  }

  return parsed;
}

/**
 * Extract structured route definitions from a source file via the LLM.
 *
 * On failure the call is retried once. If both attempts fail the error is
 * logged and an empty array is returned so the pipeline can continue.
 *
 * @param {string} file – filename (for prompt context)
 * @param {string} code – full source of the route file
 * @returns {Promise<object[]>}
 */
async function extractRoutes(file, code) {
  const prompt = buildPrompt(file, code);
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callModel(prompt);
      return parseModelOutput(raw);
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        console.warn(
          `  ⚠ Attempt ${attempt} failed for ${file}: ${err.message} — retrying…`
        );
      } else {
        console.warn(
          `  ⚠ Could not extract routes from ${file} after ${MAX_ATTEMPTS} attempts: ${err.message}`
        );
        return [];
      }
    }
  }

  /* istanbul ignore next – unreachable, but keeps the linter happy */
  return [];
}

module.exports = { buildPrompt, parseModelOutput, extractRoutes };
