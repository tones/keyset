---
description: How to run tests and the testing conventions for this project
---

# Testing

## Running Tests

```bash
npm run test:e2e              # recommended: seeds a separate test.db, starts server on port 3001, runs all tests
npm run test:e2e -- --headed  # same but watch the browser run tests
```

This uses `scripts/test-e2e.sh` which:
1. Sets `DATABASE_URL` to `file:./test.db` (your `dev.db` is never touched)
2. Runs `prisma migrate deploy` and seeds the test database
3. Runs `npx playwright test`, which starts a Next.js dev server on port 3001

You can pass any Playwright CLI flags after `--`, e.g. `npm run test:e2e -- --grep "rename"`.

## Convention

Whenever a new behavior or feature is added to the app, **always** add a corresponding Playwright E2E test in the `e2e/` directory. If an existing behavior is changed, update the relevant test to match.

## Test Structure

- `e2e/home.spec.ts` — Home page tests (listing songs, creating new songs, deleting songs)
- `e2e/song.spec.ts` — Song page tests (rename, reorder key sets, add/delete key sets, LLM analysis display/delete, navigation)

## Writing New Tests

- Use `page.getByTestId()`, `page.getByRole()`, and `page.getByText()` for selectors — avoid fragile CSS selectors
- Piano key colors must be checked via `getComputedStyle()` since the browser normalizes inline hex styles to `rgb()`
- Tests that mutate shared database state should clean up after themselves (e.g., restore renamed titles, delete added items)
- Both test files run serially (`test.describe.configure({ mode: 'serial' })`) because they share database state
