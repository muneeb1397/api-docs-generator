// src/model.js — sends route code to LLM and returns JSON
'use strict';

require('dotenv').config();

const PROVIDER = process.env.PROVIDER || 'groq';
const MODEL = process.env.MODEL || 'allam-2-7b';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 5000;

const SYSTEM_MESSAGE = {
  role: 'system',
  content:
    'You are an expert API documentation assistant. ' +
    'Respond only with the requested content, no extra commentary.',
};

/**
 * Resolve the API endpoint URL based on the configured provider.
 * @returns {string}
 */
function getEndpointUrl() {
  switch (PROVIDER) {
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions';
    case 'ollama':
      return `${OLLAMA_URL.replace(/\/+$/, '')}/v1/chat/completions`;
    default:
      throw new Error(
        `Unknown PROVIDER "${PROVIDER}". Supported: groq, ollama.`
      );
  }
}

/**
 * Build request headers for the configured provider.
 * @returns {Record<string, string>}
 */
function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };

  if (PROVIDER === 'groq') {
    if (!GROQ_API_KEY) {
      throw new Error(
        'GROQ_API_KEY is not set. Add it to your .env file or environment.'
      );
    }
    headers['Authorization'] = `Bearer ${GROQ_API_KEY}`;
  }

  return headers;
}

/**
 * Sleep for `ms` milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call the configured LLM with a user prompt and return the response text.
 *
 * @param {string} prompt – the user message to send
 * @returns {Promise<string>} – the assistant's reply (message.content)
 */
async function callModel(prompt) {
  const url = getEndpointUrl();
  const headers = getHeaders();

  const body = JSON.stringify({
    model: MODEL,
    messages: [SYSTEM_MESSAGE, { role: 'user', content: prompt }],
    temperature: 0,
  });

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { method: 'POST', headers, body });

    // --- success ---
    if (res.ok) {
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error(
          'LLM returned an empty response. Raw: ' + JSON.stringify(data)
        );
      }
      return content.trim();
    }

    // --- rate-limited: wait & retry ---
    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after');
      const delayMs = retryAfter
        ? parseFloat(retryAfter) * 1000
        : DEFAULT_RETRY_DELAY_MS;

      console.warn(
        `Rate-limited (429). Retry ${attempt}/${MAX_RETRIES} in ${(delayMs / 1000).toFixed(1)}s…`
      );

      if (attempt < MAX_RETRIES) {
        await sleep(delayMs);
        continue;
      }
    }

    // --- other HTTP errors ---
    const errBody = await res.text();
    lastError = new Error(
      `LLM request failed (HTTP ${res.status}): ${errBody}`
    );

    // Don't retry non-429 errors
    if (res.status !== 429) break;
  }

  throw lastError;
}

module.exports = { callModel };
