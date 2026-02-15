# Project Context — Key Sets

## Overview

A web app for managing "key sets" — collections of piano key selections organized by song. Each song contains ordered key sets, and each key set contains a set of MIDI note selections visualized on a piano keyboard.

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
- **Testing:** Playwright E2E tests

## Data Model

```
Song (id, title, imageUrl?, youtubeUrl?, analysis?, analysisUpdatedAt?, createdAt, updatedAt)
  └─ KeySet (id, position, type, songId, createdAt, updatedAt)
       └─ KeyPress (id, midiNote, color, keySetId, createdAt)
```

- `KeySet` has a `@@unique([songId, position])` constraint — reordering requires a two-phase update (set positions to negative temps, then to final values) to avoid constraint violations.
- `KeyPress` stores MIDI note numbers (0–127). Cascade delete is configured: deleting a Song deletes its KeySets, deleting a KeySet deletes its KeyPresses.

## URI Scheme

- `/` — Home page, lists all songs
- `/song/:id` — Song detail page with key set cards

Uses **singular nouns** (`/song/`), not plurals.

## Key Components

- **`SongView`** (`src/components/SongView.tsx`) — Client wrapper that owns all key set draft state. Renders: (1) a top row with "← Back to Keysets" link on the left and save bar (invisible when clean, visible when dirty) on the right; (2) a header card with album art on the left, title/YouTube/toggle switches on the right; (3) `SortableKeySetList` with a `compact` prop. Two toggle switches in the header: **Compact** (dark when on) shrinks keyboards to 70px read-only cards in a seamless single-card layout; **Common Tones** (yellow when on) shows/hides connecting lines between adjacent keysets. Switching between Full/Compact is a view-only change — no discard warning, unsaved edits are preserved. Key set mutations (add, delete, duplicate, toggle note, shift notes, toggle type, reorder) update local state only — nothing is persisted until the user clicks Save. Dirty detection uses `useRef` snapshot comparison. Also provides: `beforeunload` warning on browser close with unsaved changes, confirmation dialog on Reset, and Cmd/Ctrl+S keyboard shortcut for save.
- **`PianoKeyboard`** (`src/components/PianoKeyboard.tsx`) — Renders a piano keyboard with highlighted notes in per-key colors. Accepts `noteColors` map (midiNote → color name) for multi-color support. Optional `height` prop (default 110px). Supports an optional `onToggle` callback for interactive mode. Uses shared layout math from `pianoLayout.ts`. Has `data-testid="piano-keyboard"` for test selection and `data-note` attributes on each key.
- **`EditableTitle`** (`src/components/EditableTitle.tsx`) — Generic inline-editable title. Click to edit, Enter to save, Escape to cancel. Accepts an `onSave` callback prop.
- **`SongList`** (`src/components/SongList.tsx`) — Client component rendering song cards as clickable links on the home page. Includes duplicate button and trash icon with confirmation dialog.
- **`SortableKeySetList`** (`src/components/SortableKeySetList.tsx`) — Pure presentation component: drag-and-drop sortable list of key set cards using @dnd-kit (`id="keyset-dnd"` for stable hydration). Receives `keySets`, `compact`, `showCommonTones`, and all mutation callbacks as props from `SongView`. Uses a named `KeySetCardProps` interface for card component props. Has no server action imports and no internal key set state. **Full mode:** each card has a control bar row split into left (reference: drag handle, chord label, play button) and right (edit actions: type toggle, color picker, transpose, duplicate, delete), plus an add button at the bottom. **Compact mode:** seamless single white card, smaller 70px keyboards, chord label + play button only, no edit tools, no drag. **Common tone lines:** `CommonToneLines` component renders yellow dashed SVG lines between adjacent keyset cards for shared MIDI notes, using `keyCenterPct` from `pianoLayout.ts` for exact horizontal alignment. Lines use negative margins to overlap into cards above/below. The spacer div is always rendered (for stable layout); only the SVG lines toggle visibility. Key sets have a `type` field: "chord" (default) or "flourish". Flourish key sets show an italic amber "Flourish" label and warm amber background/border.
- **`playChord`** (`src/lib/playChord.ts`) — Plays a chord from MIDI notes using Tone.js `Sampler` with Salamander grand piano samples (~1MB from CDN). Exports `preloadPiano()` which is called on `SortableKeySetList` mount to load samples in the background. Falls back to `Tone.loaded()` await if samples aren't ready when user clicks play.
- **`types`** (`src/types.ts`) — Shared `KeyPress` and `KeySet` interfaces used by `SongView`, `SortableKeySetList`, and `SongList`. Single source of truth for data model types on the client side.
- **`colors`** (`src/lib/colors.ts`) — Defines the 4 available key press colors (red, blue, green, purple) with hex values for white/black keys. Orange and yellow were removed to avoid confusion with flourish amber and common tone yellow. Exports `KEY_COLORS`, `COLOR_NAMES`, `DEFAULT_COLOR`.
- **`pianoLayout`** (`src/lib/pianoLayout.ts`) — Shared piano key layout math used by both `PianoKeyboard` and `CommonToneLines`. Exports `isBlackKey`, `getNoteName`, `buildKeyLayout`, `blackKeyLeftPct`, `keyCenterPct`, and `BLACK_KEY_BIAS`. Single source of truth for key positioning. `keyCenterPct` accepts an optional pre-built `KeyLayout` to avoid rebuilding per call; `CommonToneLines` uses a module-level `defaultLayout` constant.
- **`albumArt`** (`src/lib/albumArt.ts`) — Fetches album art via Spotify API. Strips special characters from song title, searches Spotify tracks, grabs album art from result #1. No LLM needed. Spotify token cached in memory with expiry. Called from home page for songs missing `imageUrl`.
- **`midi`** (`src/lib/midi.ts`) — Shared `midiToNoteName(midi)` utility for converting MIDI note numbers to note names (e.g. 60 → "C4"). Used by `analyze.ts` and the song page.
- **`chordId`** (`src/lib/chordId.ts`) — Utility function `identifyChord(midiNotes)` that identifies chords from MIDI notes using the `tonal` library (`Chord.detect`). Handles inversions, extended chords (9ths, 11ths, 13ths), altered chords, slash chords, and more. Returns standard chord symbols like "CM", "Dm7", "G7".
- **`YouTubeLink`** (`src/components/YouTubeLink.tsx`) — Client component for inline-editable YouTube URL. Three states: empty ("Add YouTube link" placeholder), set (YouTube icon + link opens in new tab, pencil to edit), editing (text input with Enter/Escape/Save/Cancel). Saves via `updateYoutubeUrl` server action.
- **`SongAnalysis`** (`src/components/SongAnalysis.tsx`) — Client component that shows cached LLM analysis or triggers a new one via the Analyze button (shows provider name). Displays timestamp of when analysis was generated. Includes Claude discuss button (opens `claude.ai/new?q=` with pre-filled song context) and trash icon to delete analysis. Renders markdown via `react-markdown` with Tailwind `prose` classes.

## Design Guidelines — Key Set Control Bar

All icon buttons in the key set control bar follow a consistent pattern:

- **Button wrapper:** `w-7 h-7 flex items-center justify-center` — uniform hit targets and vertical alignment.
- **Icon style:** All SVGs are 18×18, stroke-based (`fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"`). No filled icons, no Unicode text.
- **Color convention:** `text-gray-400 hover:text-blue-500` for most actions. `hover:text-red-500` for destructive (delete). Amber tones for flourish state on the type toggle.
- **Gap:** `gap-1` between buttons in the right-side action group.
- **Left vs. right split:** Left side = read-only reference (drag handle, chord label, play). Right side = edit actions (type, color, transpose, duplicate, delete).
- **Popover pattern:** For controls with multiple options (transpose, color picker), use a popover that:
  - Opens on click of the icon button.
  - Closes on `onMouseLeave` of the popover div (stays open while mouse is inside, allowing repeated clicks).
  - Positioned `absolute right-0 top-8 z-10` with `bg-white rounded-lg shadow-lg border border-gray-200 p-3`.
  - Has a small `text-xs font-medium text-gray-500 mb-2` title label.
  - Uses `data-testid` for both the trigger button and the popover div.
- **When adding a new control:** Follow the same `w-7 h-7` wrapper, 18×18 stroke SVG, and gray-400/blue-500 color scheme. If it needs options, use the popover pattern. Place it in the right group if it edits data, left group if it's read-only.

## Important Gotchas

- **Next.js 16 `params` is a Promise** — In dynamic route pages, `params` must be `await`ed before accessing properties. Type as `{ params: Promise<{ id: string }> }`.
- **Piano key colors** — Inline styles use hex (`#ef4444`, `#ffffff`) but browsers normalize to `rgb()` in computed styles. Playwright tests must use `getComputedStyle()` to check colors.
- **KeySet position uniqueness** — The `@@unique([songId, position])` constraint means you can't naively update positions. The `saveKeySets` action avoids this by deleting all key sets first, then recreating them with correct positions in a single transaction.

## Server Actions

- `src/app/actions.ts` — `createSong` (creates "Untitled Song", redirects to it), `deleteSong` (deletes song with cascade, revalidates home), `duplicateSong` (copies song with all keysets/keypresses, appends "(copy)" to title, stays on home page)
- `src/app/song/[id]/actions.ts` — `saveKeySets` (atomic full-replace: deletes all key sets for a song then recreates from draft state in a single transaction), `updateYoutubeUrl`, `updateSongTitle`
- `src/app/song/[id]/analyze.ts` — `analyzeSong` (calls OpenAI or Anthropic based on `LLM_PROVIDER` env var, sends chord IDs + notes, caches result in Song.analysis), `clearAnalysis` (removes cached analysis from Song)

## Deployment (Fly.io)

- **App:** `keyset-app` → https://keyset-app.fly.dev/
- **Region:** `sjc` (San Jose)
- **Auth:** HTTP Basic Auth via `src/proxy.ts` (Next.js 16 "proxy" convention). Only active when `AUTH_PASSWORD` secret is set (production). No auth in local dev.
- **Database:** SQLite on a persistent Fly volume mounted at `/data`. `DATABASE_URL=file:/data/keyset.db`.
- **Secrets:** `AUTH_PASSWORD`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` (set via `fly secrets set`). `LLM_PROVIDER` defaults to `openai`.
- **Build:** Multi-stage Dockerfile with `output: "standalone"` in `next.config.ts`. Pages use `force-dynamic` to avoid DB access at build time.
- **Startup:** `scripts/start.sh` runs `prisma migrate deploy` then `node server.js`.
- **Redeploy:** `fly deploy --app keyset-app` from the project root.
- **Sync prod → local:** `npm run db:pull` (overwrites `dev.db` at project root with production DB, then restart dev server). Requires `fly ssh issue --agent` if SSH cert has expired (certs last 24h).
- **Backups:** Fly volume snapshots are enabled (5-day retention, automatic daily).

## Keeping Context and Tests Up to Date

After every feature, refactor, or bug fix — **before committing** — always do the following without waiting for the user to ask:

1. **Update `project-context.md`** — Add/remove/rename components, server actions, routes, data model fields, gotchas, or any other relevant details that changed.
2. **Update `workflows/testing.md`** — If how tests are run, structured, or conventioned has changed.
3. **Add or update Playwright tests** — Every new feature or behavior change should have a corresponding E2E test. Update existing tests if UI text, element structure, or behavior changed. Run `npm run test:e2e` to verify all tests pass before committing.
4. **Never skip these steps** — Treat context updates and test coverage as part of the implementation, not as a follow-up task.
