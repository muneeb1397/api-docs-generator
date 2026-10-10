# Test Results

> Run `npm test` to regenerate, validate, and check endpoints.

## Endpoint Check

| Endpoint             | Expected | Actual | Result | Issues |
|----------------------|----------|--------|--------|--------|
| GET /users           |          |        |        |        |
| POST /users          |          |        |        |        |
| GET /users/{id}      |          |        |        |        |
| PUT /users/{id}      |          |        |        |        |
| DELETE /users/{id}   |          |        |        |        |
| GET /products        |          |        |        |        |

## Limitations

- **LLM non-determinism**: The model may return slightly different summaries, parameter descriptions, or response codes across runs. The check script only asserts method + path presence, not content.
- **Mount prefix heuristic**: The prefix is derived from the route filename (e.g. `users.js` → `/users`). Nested directories or unconventional naming may produce incorrect prefixes.
- **No body/response schema validation**: The check script does not verify the correctness of `requestBody` schemas or `responses` content — only that endpoints exist.
- **Single model tested**: Only the configured `MODEL` (via `.env`) is exercised; switching models may change output quality.
