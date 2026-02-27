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
2. Sets `AUTH_PASSWORD` to `test-password` (auth is enabled during tests)
3. Runs `prisma migrate deploy` and seeds the test database
4. Runs `npx playwright test`, which starts a Next.js dev server on port 3001

You can pass any Playwright CLI flags after `--`, e.g. `npm run test:e2e -- --grep "rename"`.

### Cascade: How to Run Tests

- **Do NOT pipe output** through `tail`, `head`, `grep`, etc. — piping causes the command to hang silently. Always run `npm run test:e2e 2>&1` with no pipe.
- Run as a **non-blocking** command with `WaitMsBeforeAsync: 10000`, then poll with `command_status` using `WaitDurationSeconds: 45`. If it hasn't finished in ~90 seconds total, assume it hung — kill and retry.
- **Always reboot the dev server** after running tests: `lsof -ti:3000 | xargs kill -9 2>/dev/null; npm run dev`
- The test suite normally completes in ~30 seconds.
- **Cold-compile flakiness:** The first run after `git pull`, `npm install`, or clearing `.next/` may fail due to slow Turbopack compilation on the initial request. Early tests (e.g. album art visibility) can time out waiting for elements that haven't rendered yet. If the first run fails but the error looks timing-related, **re-run the suite once** before investigating — the second run uses cached compilation and is reliable.

## Convention

Whenever a new behavior or feature is added to the app, **always** add a corresponding Playwright E2E test in the `e2e/` directory. If an existing behavior is changed, update the relevant test to match.

## Test Structure

Playwright is configured with three projects in `playwright.config.ts`:
- **setup** (`e2e/auth.setup.ts`) — Logs in via `/login` and saves the session cookie to `e2e/.auth/session.json`
- **authenticated** — Runs `home.spec.ts` and `song.spec.ts` with the stored auth session (full edit access)
- **public** — Runs `auth.spec.ts` without any session (read-only access)

Test files:
- `e2e/auth.setup.ts` — Login setup, saves auth state for authenticated tests
- `e2e/auth.spec.ts` — Public read-only access tests (no login wall, hidden edit controls, login/logout flow, wrong password)
- `e2e/home.spec.ts` — Home page tests (listing songs, creating new songs, deleting songs)
- `e2e/song.spec.ts` — Song page tests (rename song, rename keyset, reorder key sets, add/delete key sets, color palette, LLM analysis display/delete, navigation, staff toggle, guide line alignment, scale degrees, compact mode)

## Writing New Tests

- Use `page.getByTestId()`, `page.getByRole()`, and `page.getByText()` for selectors — avoid fragile CSS selectors
- Piano key colors must be checked via `getComputedStyle()` since the browser normalizes inline hex styles to `rgb()`
- Tests that mutate shared database state should clean up after themselves (e.g., restore renamed titles, delete added items)
- All three test files run serially (`test.describe.configure({ mode: 'serial' })`) because they share database state
