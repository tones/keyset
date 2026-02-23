# Project Context — Key Sets

## Overview

A web app for managing "key sets" — collections of piano key selections organized by song. Each song contains ordered key sets, and each key set contains a set of MIDI note selections visualized on a piano keyboard.

## Feature Implementation Workflow

When the user asks for a new feature or significant change:

1. **Plan first** — Describe your understanding of the request and your implementation plan. Ask the user to confirm before writing any code.
2. **Implement** — Once approved, make the changes.
3. **Show, don't commit** — Present the result for review. Do NOT commit until the user explicitly says to commit.
4. **Commit only on request** — Never commit, push, or deploy without the user's explicit instruction.

Keep the user in the loop at every step. Do not skip ahead.

## Setup (Fresh Clone)

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Database:** Prisma ORM with SQLite
- **LLM:** Anthropic Claude or OpenAI GPT-4o, swappable via `LLM_PROVIDER` env var (currently set to `anthropic`)
- **Drag-and-drop:** @dnd-kit (core, sortable, utilities)
- **Styling:** Tailwind CSS 4 with @tailwindcss/typography (prose classes)
- **Markdown:** react-markdown for rendering LLM analysis output
- **Music theory:** tonal (chord detection from MIDI notes)
- **Audio:** Tone.js (Sampler with Salamander piano samples for chord playback)
- **Language:** TypeScript
- **Testing:** Playwright E2E tests (`e2e/`)

## Data Model

```
Song (id, title, imageUrl?, youtubeUrl?, analysis?, analysisUpdatedAt?, compactView, showStaff, songKey?, createdAt, updatedAt)
  └─ KeySet (id, position, type, scaleDegree?, songId, createdAt, updatedAt)
       └─ KeyPress (id, midiNote, color, keySetId, createdAt)
```

- `KeySet` has a `@@unique([songId, position])` constraint — reordering requires a two-phase update (set positions to negative temps, then to final values) to avoid constraint violations.
- `KeyPress` stores MIDI note numbers (0–127). Cascade delete is configured: deleting a Song deletes its KeySets, deleting a KeySet deletes its KeyPresses.

## URI Scheme

- `/` — Home page, lists all songs
- `/song/:id` — Song detail page with key set cards

Uses **singular nouns** (`/song/`), not plurals.

## Key Components

- **`SongView`** (`src/components/SongView.tsx`) — Client wrapper that owns all draft state: key sets, analysis, AND songKey. Renders: (1) a top row with subtle "‹ Keysets" breadcrumb on the left, minimal save bar ("Edited" + dot, invisible when clean) in the center-right, and dark mode toggle (sun/moon icon) at the far right; (2) album art (160px, rounded, shadow) on the left with title/YouTube below it, Compact and Key toggles in the upper right — album art hidden on narrow screens (`hidden sm:block`), header stacks vertically below `sm` breakpoint (`flex-col sm:flex-row`); (3) `SortableKeySetList`; (4) `SongAnalysis` (hidden in compact mode). Toggle switches use contextual visibility: **Compact** (always visible, persisted to DB via `updateCompactView`), **Staff** (only visible when Key is on, persisted to DB via `updateShowStaff` — controls visibility of `StaffNotation` on all keysets), and **Key** (always visible, shows key name when active, e.g. "E Minor"; popover for root/mode selection). Guides toggle hidden but functionality preserved. Album art (`currentImageUrl`) is local state — refreshes in real time after title save via `refreshAlbumArt`. Analysis and songKey are part of deferred save — changes only update local state until user saves. The `saveKeySets` action persists key sets, analysis, and songKey atomically. Reset reverts all three to server state. `lastSongKey` state remembers the last chosen key when toggling off/on. Key picker popover opens on toggle-on and on hover when key mode is active. `buildChordDetail()` computes chord descriptions from live browser keySets (not DB), so analyze and chat always use current edits. Dirty detection uses `useRef` snapshot comparison over key sets, analysis, and songKey. Also provides: `beforeunload` warning, confirmation dialog on Reset, Cmd/Ctrl+S shortcut.
- **`PianoKeyboard`** (`src/components/PianoKeyboard.tsx`) — Renders a 4-octave piano keyboard (C2–C6, MIDI 36–84) with highlighted notes in per-key colors. Light gray octave labels (C2, C3, C4, C5) at the bottom of each C key. Accepts `noteColors` map (midiNote → color name) for multi-color support. Optional `height` prop (default 110px). Supports an optional `onToggle` callback for interactive mode. Accepts `inKeyPitchClasses` (Set of pitch classes 0–11) for In Key mode visual treatment: in-key white keys = bright white, out-of-key white keys = light gray (#e5e7eb); in-key black keys = pure black (#000000), out-of-key black keys = dark gray (#6b7280); highlighted in-key keys use full colors, highlighted out-of-key keys use muted/pastel colors. No opacity — all solid hex values. `showTriadSuggestions` prop (default `true`) controls whether unselected triad keys get yellow outlines; compact mode passes `false` to hide suggestion outlines while keeping them on selected keys. Uses shared layout math from `pianoLayout.ts`. Has `data-testid="piano-keyboard"` for test selection, `data-note` attributes on each key, and `data-highlighted="true"` on highlighted keys.
- **`EditableTitle`** (`src/components/EditableTitle.tsx`) — Generic inline-editable title. Click to edit, Enter to save, Escape to cancel. Accepts an `onSave` callback prop.
- **`SongList`** (`src/components/SongList.tsx`) — Client component rendering song cards in a responsive grid (`grid-cols-1 sm:grid-cols-2`) on the home page. Compact cards with 80px album art, smaller text/icons. Shows first 4 chord pills (key-aware via `songKey`) with "…" ellipsis if more exist. Songs with a key display it title-cased below the chord pills (e.g. "C Major"). Includes duplicate button and trash icon with confirmation dialog.
- **`SortableKeySetList`** (`src/components/SortableKeySetList.tsx`) — Pure presentation component: drag-and-drop sortable list of key set cards using @dnd-kit (`id="keyset-dnd"` for stable hydration). Receives `keySets`, `compact`, `showCommonTones`, `songKey`, and all mutation callbacks as props from `SongView`. Uses a named `KeySetCardProps` interface for card component props. Has no server action imports and no internal key set state. **Full mode:** each card has a control bar row split into left (reference: drag handle, chord label, play button) and right (edit actions: scale degree, type toggle, color picker, transpose, duplicate, delete — all icon buttons use w-9 h-9 wrappers for touch-friendly targets), plus an add button at the bottom. **Scale degree toggle:** shown only for chord keysets when a song key is set. Displays `#` when unset; when set, shows correctly-cased Roman numeral + triad name, e.g. `ii (Dm)`. Click toggles on/off (remembers last degree via `lastDegree` state). Popover shows vertical list of all 7 degrees with numeral and triad chord name. Numerals use `formatNumeral` helper (uppercase for major, lowercase for minor/dim, `°` suffix for diminished) powered by tonal's `getTriadQuality`. Common tone lines use SVG with negative margins. **Compact mode:** single white card with `divide-y` borders, chord label (w-16) left of 50px keyboard, play button below label (standard w-7 h-7 icon), no edit tools, no drag. Common tone guides use a single absolutely-positioned div per shared note, extending downward from the upper keyboard (`top: 100%`, height 36px) to span the full gap between cards — 4px amber-500 dashed lines. Play button hidden on flourish keysets in both modes. Key sets have a `type` field: "chord" (default) or "flourish". Flourish key sets show an italic amber "Flourish" label and warm amber background (`bg-amber-50/50` in compact).
- **`StaffNotation`** (`src/components/StaffNotation.tsx`) — Hand-rolled SVG component rendering a mini grand staff (treble + bass clef) showing chord notes as stacked note heads in a single column. Includes key signature (sharps/flats derived from `songKey` via tonal's `Key` module), accidentals only when not covered by key signature, natural signs when needed, and ledger lines. Adjacent notes (seconds) are nudged horizontally per standard notation. No external music notation library — pure SVG. Shown in both compact mode (50px height, right of piano) and full mode (110px height, right of piano) when `songKey` is set and keyset has notes (both chord and flourish types). Has `data-testid="staff-notation"`.
- **`playChord`** (`src/lib/playChord.ts`) — Plays a chord from MIDI notes using Tone.js `Sampler` with Salamander grand piano samples (~1MB from CDN). Exports `preloadPiano()` which is called on `SortableKeySetList` mount to load samples in the background. Falls back to `Tone.loaded()` await if samples aren't ready when user clicks play.
- **`types`** (`src/types.ts`) — Shared `KeyPress` and `KeySet` interfaces used by `SongView`, `SortableKeySetList`, and `SongList`. Single source of truth for data model types on the client side.
- **`colors`** (`src/lib/colors.ts`) — Defines the 4 available key press colors (red, blue, green, purple) with hex values for white/black keys plus muted/pastel variants (`mutedWhite`, `mutedBlack`) used for out-of-key highlighted keys in In Key mode. Orange and yellow were removed to avoid confusion with flourish amber and common tone yellow. Exports `KEY_COLORS`, `COLOR_NAMES`, `DEFAULT_COLOR`, `PRIMARY_COLORS`. **Primary colors** (red = "Right Hand", blue = "Left Hand") define the chord — only primary-color key presses are used for chord identification, audio playback, and LLM analysis. Green and purple are decoration colors (displayed on the keyboard but excluded from chord logic). The color picker popover shows "RH"/"LH" labels under red/blue swatches.
- **`scales`** (`src/lib/scales.ts`) — Scale definitions and utilities for In Key mode. Defines 12 roots (C through B) and 8 modes (major, minor, dorian, phrygian, lydian, mixolydian, aeolian, locrian) with semitone intervals. Exports `ROOTS`, `MODE_NAMES`, `MODES`, `parseSongKey`, `formatSongKey`, `getScalePitchClasses`, `isNoteInKey`, `getTriadPitchClasses`, `getTriadName` (chord name for a degree, e.g. "Dm"), `getTriadQuality` (major/minor/diminished for a degree), and enharmonic mapping (`tonalRoot`) to avoid double-sharp chord names when using tonal's Key functions with sharp roots (D#, G#, A#).
- **`ThemeToggle`** (`src/components/ThemeToggle.tsx`) — Sun/moon icon button for toggling dark mode. Uses `useTheme` hook. Shown on home page header (right of "Keysets" title) and song page breadcrumb row (far right). Has `data-testid="theme-toggle"`.
- **`useTheme`** (`src/hooks/useTheme.ts`) — Client hook for dark mode. Manages `dark` class on `<html>`. Default: OS `prefers-color-scheme`. Manual override stored in `localStorage` (`keyset-theme`). Listens for OS preference changes when no manual override. Returns `{ theme, toggleTheme }`.
- **`usePopover`** (`src/hooks/usePopover.ts`) — Reusable hook for popover open/close behavior. Provides: 500ms timer-based close on mouse leave (desktop), click-outside close via `pointerdown` listener (touch/iPad), cancel-on-re-enter. Returns `{ open, toggle, show, hide, containerRef, onMouseLeave, onMouseEnter }`. Used by key picker, color picker, and transpose popovers.
- **`pianoLayout`** (`src/lib/pianoLayout.ts`) — Shared piano key layout math used by both `PianoKeyboard` and `CommonToneLines`. Exports `isBlackKey`, `getNoteName`, `buildKeyLayout`, `blackKeyLeftPct`, `keyCenterPct`, and `BLACK_KEY_BIAS`. Single source of truth for key positioning. `keyCenterPct` accepts an optional pre-built `KeyLayout` to avoid rebuilding per call; `CommonToneLines` uses a module-level `defaultLayout` constant.
- **`albumArt`** (`src/lib/albumArt.ts`) — Fetches album art via Spotify API. Strips special characters from song title, searches Spotify tracks (limit=10), picks first non-compilation result (`album_type !== 'compilation'`), falls back to first result. No LLM needed. Spotify token cached in memory with expiry. Called from home page for songs missing `imageUrl`.
- **`midi`** (`src/lib/midi.ts`) — Shared `midiToNoteName(midi)` utility for converting MIDI note numbers to note names (e.g. 60 → "C4"). Used by `analyze.ts` and the song page.
- **`chordId`** (`src/lib/chordId.ts`) — Utility function `identifyChord(midiNotes, songKey?)` that identifies chords from MIDI notes using the `tonal` library (`Chord.detect`). When `songKey` is provided, uses tonal's `Key` module to determine sharps vs flats for correct enharmonic spelling. Handles inversions, extended chords (9ths, 11ths, 13ths), altered chords, slash chords, and more. Returns standard chord symbols like "CM", "Dm7", "G7".
- **`YouTubeLink`** (`src/components/YouTubeLink.tsx`) — Client component for inline-editable YouTube URL. Three states: empty ("Add YouTube link" placeholder), set (YouTube icon + link opens in new tab, pencil to edit), editing (text input with Enter/Escape/Save/Cancel). Saves via `updateYoutubeUrl` server action.
- **`SongAnalysis`** (`src/components/SongAnalysis.tsx`) — Pure presentation component for LLM analysis. Receives all state and callbacks as props from `SongView` (analysis text, loading, error, onAnalyze, onClear, onApplyKeyAndDegrees, suggestedKey, confidence). Shows Analyze/Re-analyze button with spinner during loading (previous analysis hidden via `visibility:hidden` to preserve layout height). Upper-right icon row: Apply Key & Degrees button (key icon with color-coded confidence badge — green ≥80%, amber 50-79%, red <50%; confirm dialog before applying), Claude discuss button, trash icon. No internal state — parent owns everything.

## Design Guidelines — Key Set Control Bar

All icon buttons in the key set control bar follow a consistent pattern:

- **Button wrapper:** `w-7 h-7 flex items-center justify-center` — uniform hit targets and vertical alignment.
- **Icon style:** All SVGs are 18×18, stroke-based (`fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"`). No filled icons, no Unicode text.
- **Color convention:** `text-gray-400 hover:text-blue-500` for most actions. `hover:text-red-500` for destructive (delete). Amber tones for flourish state on the type toggle.
- **Gap:** `gap-1` between buttons in the right-side action group.
- **Left vs. right split:** Left side = read-only reference (drag handle, chord label, play). Right side = edit actions (type, color, transpose, duplicate, delete).
- **Popover pattern:** For controls with multiple options (transpose, color picker, key picker), use the `usePopover` hook:
  - Opens on click of the icon button (via `toggle`).
  - Closes after 500ms when mouse leaves the shared container (trigger + popover). Re-entering cancels the timer.
  - Also closes on click-outside (via `pointerdown` listener) for touch/iPad support.
  - Container div gets `ref={popover.containerRef}`, `onMouseLeave={popover.onMouseLeave}`, `onMouseEnter={popover.onMouseEnter}`.
  - Popover panel positioned `absolute right-0 top-8 z-10` with `bg-white rounded-lg shadow-lg border border-gray-200 p-3`.
  - Has a small `text-xs font-medium text-gray-500 mb-2` title label.
  - Uses `data-testid` for both the trigger button and the popover div.
- **When adding a new control:** Follow the same `w-7 h-7` wrapper, 18×18 stroke SVG, and gray-400/blue-500 color scheme. If it needs options, use the popover pattern. Place it in the right group if it edits data, left group if it's read-only.

## Future Ideas (Parked)

### MIDI Controller Input
**Goal:** Toggle keyset notes using a hardware MIDI keyboard. A MIDI icon button per keyset would "arm" it to receive MIDI input.

**Desktop (Chrome/Edge):** Straightforward via the Web MIDI API (`navigator.requestMIDIAccess()`). Listen for `midimessage` "note on" events, call `onToggleNote` on the armed keyset. ~30 lines of code.

**iPad/Safari:** Not possible in a browser. Apple declined to implement Web MIDI API (privacy/fingerprinting concerns). All iOS browsers use Safari's WebKit engine, so no browser on iPad supports it. No viable polyfill exists.

**Options to enable iPad MIDI support (all require native iOS tooling + Apple Developer account $99/yr):**
- **Option A: WebView wrapper (~1-2 days)** — Wrap the existing web app in a native iOS WebView (Expo or Capacitor). Bridge CoreMIDI events from native → WebView via `postMessage`. Zero UI rewrite, but the app still depends on the Fly.io server.
- **Option B: Capacitor (~2-3 days)** — Use [Capacitor](https://capacitorjs.com/) to wrap the web app in a native shell with a custom MIDI plugin using iOS CoreMIDI. Cleanest native-wrapper approach, designed for this use case.
- **Option C: Full React Native rewrite (weeks-months)** — Rewrite all UI with React Native primitives. Not worth it for one feature.

**Decision (Feb 2026):** Parked. Not worth the native tooling overhead right now. Revisit if iPad MIDI becomes a priority.

## Important Gotchas

- **Next.js 16 `params` is a Promise** — In dynamic route pages, `params` must be `await`ed before accessing properties. Type as `{ params: Promise<{ id: string }> }`.
- **Piano key colors** — Inline styles use hex (`#ef4444`, `#ffffff`) but browsers normalize to `rgb()` in computed styles. Playwright tests must use `getComputedStyle()` to check colors.
- **KeySet position uniqueness** — The `@@unique([songId, position])` constraint means you can't naively update positions. The `saveKeySets` action avoids this by deleting all key sets first, then recreating them with correct positions in a single transaction.

## Server Actions

- `src/app/actions.ts` — `createSong` (creates "Untitled Song", redirects to it), `deleteSong` (deletes song with cascade, revalidates home), `duplicateSong` (copies song with all keysets/keypresses, appends "(copy)" to title, stays on home page)
- `src/app/song/[id]/actions.ts` — `saveKeySets` (atomic full-replace: deletes all key sets for a song then recreates from draft state in a single transaction; also persists analysis and songKey), `updateYoutubeUrl`, `updateSongTitle`, `updateCompactView(songId, compact)` (persists compact toggle immediately), `updateShowStaff(songId, showStaff)` (persists staff toggle immediately), `refreshAlbumArt(songId, title)` (fetches album art via Spotify, persists URL, returns it — called by `SongView` after title save for real-time image update)
- `src/app/song/[id]/analyze.ts` — `analyzeSong(songId, songTitle, chordDetail, numKeySets)` (calls OpenAI or Anthropic based on `LLM_PROVIDER` env var, returns analysis text, suggested key, scale degrees array, and confidence score without persisting — analysis is draft state saved via `saveKeySets`). Prompt requests structured JSON block with key, degrees, and confidence (0-100). JSON is parsed and stripped from displayed analysis text. No `clearAnalysis` — clearing is a local state change in `SongView`.

## Deployment (Fly.io)

- **App:** `keyset-app` → https://keyset-app.fly.dev/
- **Region:** `sjc` (San Jose)
- **Auth:** Cookie-based session auth via `src/proxy.ts` (Next.js 16 "proxy" convention) + `/login` page. On first visit, redirects to `/login` form. Successful login sets `auth_session` HttpOnly cookie (30-day expiry, HMAC-signed). Only active when `AUTH_PASSWORD` secret is set (production). No auth in local dev. `min_machines_running = 1` keeps machine always on (~$3/mo) to eliminate cold starts.
- **Database:** SQLite on a persistent Fly volume mounted at `/data`. `DATABASE_URL=file:/data/keyset.db`.
- **Secrets:** `AUTH_PASSWORD`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` (set via `fly secrets set`). `LLM_PROVIDER` defaults to `openai`.
- **Build:** Multi-stage Dockerfile with `output: "standalone"` in `next.config.ts`. Pages use `force-dynamic` to avoid DB access at build time.
- **Startup:** `scripts/start.sh` runs `prisma migrate deploy` then `node server.js`.
- **Redeploy:** `fly deploy --app keyset-app` from the project root.
- **Sync prod → local:** Always use `npm run db:pull` — it removes the old `dev.db`, pulls from production, and **restarts the dev server** so the new data is picked up. The dev server caches the Prisma/SQLite connection in `globalForPrisma`, so replacing the DB file without restarting will silently serve stale data. Requires `fly ssh issue --agent` if SSH cert has expired (certs last 24h).
- **⚠️ NEVER push local dev DB to production.** This risks overwriting/losing production data. Only pull (prod → local). To modify production data, use the app UI or run targeted SQL via `fly ssh console` with `better-sqlite3` (e.g. `node -e "const Database=require('better-sqlite3'); ..."`).
- **Backups:** Fly volume snapshots are enabled (5-day retention, automatic daily).

## Keeping Context and Tests Up to Date

After every feature, refactor, or bug fix — **before committing** — always do the following without waiting for the user to ask:

1. **Update `project-context.md`** — Add/remove/rename components, server actions, routes, data model fields, gotchas, or any other relevant details that changed.
2. **Update `workflows/testing.md`** — If how tests are run, structured, or conventioned has changed.
3. **Add or update Playwright tests** — Every new feature or behavior change should have a corresponding E2E test. Update existing tests if UI text, element structure, or behavior changed. Run `npm run test:e2e` to verify all tests pass before committing.
4. **Never skip these steps** — Treat context updates and test coverage as part of the implementation, not as a follow-up task.
