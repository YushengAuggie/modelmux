# Testing

## Commands

- `npm test` runs Vitest in watch mode.
- `npm run test:ci` runs the suite once for CI.
- `npm run typecheck` runs `tsc -b`.
- `npm run build` performs typecheck plus the Vite production build.

## Scope

The test suite covers:

- request preview generation and response parsing in `src/adapters.ts`
- OpenRouter model fetch/cache parsing in `src/models.ts`
- template integrity in `src/templates.ts`
- Zustand store actions and history behavior in `src/store.ts`

## Test constraints

- All tests are unit-level and complete in under 5 seconds on a normal dev machine.
- Network access is mocked. Do not rely on live API calls in tests.
- `localStorage`, `fetch`, and store state are reset between tests where needed.

## CI

GitHub Actions runs on pushes to `main` and for all pull requests with:

1. `npm ci`
2. `npm run typecheck`
3. `npm run test:ci`
4. `npm run build`
