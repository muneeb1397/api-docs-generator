# Test Results

Run `npm test` to regenerate, validate, and check endpoints.

- Model: ALLaM 2 7B (`allam-2-7b`) via Groq, temperature 0
- Target: `examples/sample-api/routes` (6 routes in `users.js` and `products.js`)
- Pipeline: generate, then `swagger-cli validate`, then `test/check.js`

## Endpoint Check

| Endpoint | Expected | Actual | Result | Issues |
|----------|----------|--------|--------|--------|
| GET /users | present | present | PASS | none |
| POST /users | present | present | PASS | none |
| GET /users/{id} | present | present | PASS | model returned `:id`; normalised |
| PUT /users/{id} | present | present | PASS | model returned `:id`; normalised |
| DELETE /users/{id} | present | present | PASS | model returned `:id`; normalised |
| GET /products | present | present | PASS | none |

Spec validation: `docs/openapi.yaml is valid` (swagger-cli). Unexpected extra endpoints: 0.

## Findings (raw model output vs. final spec)

| Issue seen in raw output | Fix |
|--------------------------|-----|
| Express `:id` instead of `{id}` | `normaliseRoutePath()` in `src/generator.js` |
| Paths missing mount prefix (`/`, `/{id}`) | `applyMountPrefix()` in `index.js` (from file name) |
| Malformed `parameters` entries (request body schema mixed in) | `isValidParam()` / `sanitiseParam()` |
| `responses` nested inside `requestBody` | `sanitiseRequestBody()` |
| Without these fixes the spec failed validation | all fixes applied before writing YAML |

## Limitations

- **LLM non-determinism**: summaries, parameter descriptions and response codes can vary between runs. The check script asserts only method + path presence.
- **Mount prefix heuristic**: derived from the route file name (`users.js` becomes `/users`). Nested directories or unconventional names may give wrong prefixes.
- **No body/response schema validation**: `requestBody` and `responses` content is not verified for correctness.
- **Single model tested**: only `allam-2-7b` was exercised. The Ollama path (`qwen2.5-coder:7b`) is untested.
