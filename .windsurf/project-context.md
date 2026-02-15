# Project Context — Key Sets

## Overview

A web app for managing "key sets" — collections of piano key selections organized by song. Each song contains ordered key sets, and each key set contains a set of MIDI note selections visualized on a piano keyboard.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Database:** Prisma ORM with SQLite
- **Drag-and-drop:** @dnd-kit (core, sortable, utilities)
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript
- **Testing:** Playwright E2E tests

## Data Model

```
Song (id, title, createdAt, updatedAt)
  └─ KeySet (id, name?, position, songId, createdAt, updatedAt)
       └─ KeyPress (id, midiNote, keySetId, createdAt)
```

- `KeySet` has a `@@unique([songId, position])` constraint — reordering requires a two-phase update (set positions to negative temps, then to final values) to avoid constraint violations.
- `KeyPress` stores MIDI note numbers (0–127). Cascade delete is configured: deleting a Song deletes its KeySets, deleting a KeySet deletes its KeyPresses.

## URI Scheme

- `/` — Home page, lists all songs
- `/song/:id` — Song detail page with key set cards

Uses **singular nouns** (`/song/`), not plurals.

## Key Components

- **`PianoKeyboard`** (`src/components/PianoKeyboard.tsx`) — Renders a piano keyboard with highlighted notes. Supports an optional `onToggle` callback for interactive mode. Uses absolute positioning with a boundary-based algorithm for black key placement. Has `data-testid="piano-keyboard"` for test selection and `data-note` attributes on each key.
- **`EditableTitle`** (`src/components/EditableTitle.tsx`) — Generic inline-editable title. Click to edit, Enter to save, Escape to cancel. Accepts an `onSave` callback prop.
- **`SongList`** (`src/components/SongList.tsx`) — Client component rendering song cards as clickable links on the home page. Includes trash icon with confirmation dialog for deleting songs.
- **`SortableKeySetList`** (`src/components/SortableKeySetList.tsx`) — Drag-and-drop sortable list of key set cards using @dnd-kit. Includes add (plus icon), delete (trash icon with confirmation) actions. Piano keys are toggled inline with optimistic UI updates and immediate server persistence.

## Important Gotchas

- **Next.js 16 `params` is a Promise** — In dynamic route pages, `params` must be `await`ed before accessing properties. Type as `{ params: Promise<{ id: string }> }`.
- **Piano key colors** — Inline styles use hex (`#ef4444`, `#ffffff`) but browsers normalize to `rgb()` in computed styles. Playwright tests must use `getComputedStyle()` to check colors.
- **KeySet position uniqueness** — The `@@unique([songId, position])` constraint means you can't naively update positions in a transaction. Use the two-phase negative-temp approach in `reorderKeySets`.

## Server Actions

- `src/app/actions.ts` — `createSong` (creates "Untitled Song", redirects to it), `deleteSong` (deletes song with cascade, revalidates home)
- `src/app/song/[id]/actions.ts` — `updateSongTitle`, `reorderKeySets`, `createKeySet`, `deleteKeySet`, `toggleKeyPress`

## Keeping This File Up to Date

When making changes to the codebase, **always** update the relevant `.windsurf/` files before committing:

- **`project-context.md`** — Update when adding/removing/renaming components, server actions, routes, data model fields, or gotchas.
- **`workflows/testing.md`** — Update when changing how tests are run, adding new test files, or changing test conventions.
