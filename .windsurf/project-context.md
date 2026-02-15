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
Song (id, title, youtubeUrl?, analysis?, analysisUpdatedAt?, createdAt, updatedAt)
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

- **`SongView`** (`src/components/SongView.tsx`) — Client wrapper that renders the song header (title + Edit/Perform toggle on one row, YouTube link below as subtitle) and switches between `SortableKeySetList` (edit mode) and `PerformView` (perform mode). Accepts `initialTitle`, `initialYoutubeUrl`, `onSaveTitle`, `onSaveYoutubeUrl` props.
- **`PerformView`** (`src/components/PerformView.tsx`) — Dense read-only view of keyset cards in a 2-column grid with compact 70px keyboards. Shows chord label and play button only.
- **`PianoKeyboard`** (`src/components/PianoKeyboard.tsx`) — Renders a piano keyboard with highlighted notes in per-key colors. Accepts `noteColors` map (midiNote → color name) for multi-color support. Optional `height` prop (default 110px). Supports an optional `onToggle` callback for interactive mode. Uses absolute positioning with a boundary-based algorithm for black key placement. Has `data-testid="piano-keyboard"` for test selection and `data-note` attributes on each key.
- **`EditableTitle`** (`src/components/EditableTitle.tsx`) — Generic inline-editable title. Click to edit, Enter to save, Escape to cancel. Accepts an `onSave` callback prop.
- **`SongList`** (`src/components/SongList.tsx`) — Client component rendering song cards as clickable links on the home page. Includes duplicate button and trash icon with confirmation dialog.
- **`SortableKeySetList`** (`src/components/SortableKeySetList.tsx`) — Drag-and-drop sortable list of key set cards using @dnd-kit. Each card has a single control bar row: left (drag handle + chord label), right (type toggle, color toggle, play, octave down, octave up, trash). All key set controls go in this row. Key sets have a `type` field: "chord" (default) or "flourish". Flourish key sets show an italic amber "Flourish" label instead of chord name, and have a warm amber background/border. Chord/flourish toggle is a music note icon (♫/♪). Empty chord key sets show a blank label until notes are added. Piano keys are toggled inline with optimistic UI updates and immediate server persistence. Each chord card's heading shows the auto-detected chord label (via `chordId`) that updates live as notes are toggled. Binary red/blue color toggle lets users switch brush color for bass note distinction.
- **`playChord`** (`src/lib/playChord.ts`) — Plays a chord from MIDI notes using Tone.js `Sampler` with Salamander grand piano samples (~1MB from CDN). Exports `preloadPiano()` which is called on `SortableKeySetList` mount to load samples in the background. Falls back to `Tone.loaded()` await if samples aren't ready when user clicks play.
- **`colors`** (`src/lib/colors.ts`) — Defines the 6 available key press colors (red, blue, green, purple, orange, yellow) with hex values for white/black keys. Exports `KEY_COLORS`, `COLOR_NAMES`, `DEFAULT_COLOR`.
- **`midi`** (`src/lib/midi.ts`) — Shared `midiToNoteName(midi)` utility for converting MIDI note numbers to note names (e.g. 60 → "C4"). Used by `analyze.ts` and the song page.
- **`chordId`** (`src/lib/chordId.ts`) — Utility function `identifyChord(midiNotes)` that identifies chords from MIDI notes using the `tonal` library (`Chord.detect`). Handles inversions, extended chords (9ths, 11ths, 13ths), altered chords, slash chords, and more. Returns standard chord symbols like "CM", "Dm7", "G7".
- **`YouTubeLink`** (`src/components/YouTubeLink.tsx`) — Client component for inline-editable YouTube URL. Three states: empty ("Add YouTube link" placeholder), set (YouTube icon + link opens in new tab, pencil to edit), editing (text input with Enter/Escape/Save/Cancel). Saves via `updateYoutubeUrl` server action.
- **`SongAnalysis`** (`src/components/SongAnalysis.tsx`) — Client component that shows cached LLM analysis or triggers a new one via the Analyze button (shows provider name). Displays timestamp of when analysis was generated. Includes Claude discuss button (opens `claude.ai/new?q=` with pre-filled song context) and trash icon to delete analysis. Renders markdown via `react-markdown` with Tailwind `prose` classes.

## Important Gotchas

- **Next.js 16 `params` is a Promise** — In dynamic route pages, `params` must be `await`ed before accessing properties. Type as `{ params: Promise<{ id: string }> }`.
- **Piano key colors** — Inline styles use hex (`#ef4444`, `#ffffff`) but browsers normalize to `rgb()` in computed styles. Playwright tests must use `getComputedStyle()` to check colors.
- **KeySet position uniqueness** — The `@@unique([songId, position])` constraint means you can't naively update positions in a transaction. Use the two-phase negative-temp approach in `reorderKeySets`.

## Server Actions

- `src/app/actions.ts` — `createSong` (creates "Untitled Song", redirects to it), `deleteSong` (deletes song with cascade, revalidates home), `duplicateSong` (copies song with all keysets/keypresses, appends "(copy)" to title, stays on home page)
- `src/app/song/[id]/actions.ts` — `updateYoutubeUrl`, `updateSongTitle`, `reorderKeySets`, `createKeySet`, `deleteKeySet`, `toggleKeyPress`, `shiftOctave` (moves all notes ±12 semitones, clamped to 0–127), `updateKeySetType` (toggles between "chord" and "flourish")
- `src/app/song/[id]/analyze.ts` — `analyzeSong` (calls OpenAI or Anthropic based on `LLM_PROVIDER` env var, sends chord IDs + notes, caches result in Song.analysis), `clearAnalysis` (removes cached analysis from Song)

## Deployment (Fly.io)

- **App:** `keyset-app` → https://keyset-app.fly.dev/
- **Region:** `sjc` (San Jose)
- **Auth:** HTTP Basic Auth via `src/proxy.ts` (Next.js 16 "proxy" convention). Only active when `AUTH_PASSWORD` secret is set (production). No auth in local dev.
- **Database:** SQLite on a persistent Fly volume mounted at `/data`. `DATABASE_URL=file:/data/keyset.db`.
- **Secrets:** `AUTH_PASSWORD`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (set via `fly secrets set`). `LLM_PROVIDER` defaults to `openai`.
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
