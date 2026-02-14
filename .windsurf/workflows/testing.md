---
description: How to run tests and the testing conventions for this project
---

# Testing

## Running Tests

```bash
npx playwright test          # headless (fast, for CI)
npx playwright test --headed # watch the browser run tests
```

The dev server must be running on `http://localhost:3000`, or Playwright will start one automatically via the `webServer` config in `playwright.config.ts`.

## Convention

Whenever a new behavior or feature is added to the app, **always** add a corresponding Playwright E2E test in the `e2e/` directory. If an existing behavior is changed, update the relevant test to match.

## Test Structure

- `e2e/home.spec.ts` — Home page tests (listing songs, creating new songs)
- `e2e/song.spec.ts` — Song page tests (rename, reorder key sets, add/delete key sets, navigation)
- `e2e/keyset.spec.ts` — Keyset editor tests (toggle keys, save, unsaved changes, rename, navigation)

## Writing New Tests

- Use `page.getByTestId()`, `page.getByRole()`, and `page.getByText()` for selectors — avoid fragile CSS selectors
- Piano key colors must be checked via `getComputedStyle()` since the browser normalizes inline hex styles to `rgb()` — see the helper functions in `keyset.spec.ts`
- Tests that mutate shared database state should clean up after themselves (e.g., restore renamed titles, delete added items)
- Keyset tests run serially (`test.describe.configure({ mode: 'serial' })`) because they share database state
