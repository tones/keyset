import { Key, Chord, Note } from 'tonal'

// Scale definitions and utilities for "in key mode"

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export type Root = typeof ROOTS[number]
export { ROOTS }

export const MODES = {
  'major':      [0, 2, 4, 5, 7, 9, 11],
  'minor':      [0, 2, 3, 5, 7, 8, 10],
  'dorian':     [0, 2, 3, 5, 7, 9, 10],
  'phrygian':   [0, 1, 3, 5, 7, 8, 10],
  'lydian':     [0, 2, 4, 6, 7, 9, 11],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'aeolian':    [0, 2, 3, 5, 7, 8, 10],
  'locrian':    [0, 1, 3, 5, 6, 8, 10],
} as const

export type ModeName = keyof typeof MODES
export const MODE_NAMES = Object.keys(MODES) as ModeName[]

/** Parse a songKey string like "E minor" into { root, mode } or null */
export function parseSongKey(songKey: string | null): { root: Root; mode: ModeName } | null {
  if (!songKey) return null
  const parts = songKey.split(' ')
  if (parts.length !== 2) return null
  const root = parts[0] as Root
  const mode = parts[1] as ModeName
  if (!ROOTS.includes(root) || !MODE_NAMES.includes(mode)) return null
  return { root, mode }
}

/** Format root + mode into a songKey string */
export function formatSongKey(root: Root, mode: ModeName): string {
  return `${root} ${mode}`
}

/** Get the set of pitch classes (0–11) that are in the given key */
export function getScalePitchClasses(root: Root, mode: ModeName): Set<number> {
  const rootIndex = ROOTS.indexOf(root)
  const intervals = MODES[mode]
  return new Set(intervals.map(i => (rootIndex + i) % 12))
}

/** Check if a MIDI note is in the given key */
export function isNoteInKey(midiNote: number, root: Root, mode: ModeName): boolean {
  const pitchClass = midiNote % 12
  return getScalePitchClasses(root, mode).has(pitchClass)
}

/** Get the triad chord name (e.g. 'C', 'Dm', 'Bdim') for a scale degree using tonal's Key data */
export function getTriadName(root: Root, mode: ModeName, degree: number): string | null {
  const keyData = mode === 'minor'
    ? Key.minorKey(root)?.natural
    : Key.majorKey(root)
  const triads = keyData?.triads as string[] | undefined
  if (!triads || degree < 1 || degree > 7) return null
  return triads[degree - 1]
}

/** Get the triad quality ('major' | 'minor' | 'diminished') for a scale degree using tonal's Key data */
export function getTriadQuality(root: Root, mode: ModeName, degree: number): 'major' | 'minor' | 'diminished' {
  const keyData = mode === 'minor'
    ? Key.minorKey(root)?.natural
    : Key.majorKey(root)
  const triads = keyData?.triads as string[] | undefined
  if (!triads || degree < 1 || degree > 7) return 'major'
  const triad = triads[degree - 1]
  if (triad.endsWith('dim')) return 'diminished'
  if (triad.endsWith('m')) return 'minor'
  return 'major'
}

/** Get the 3 pitch classes (0–11) of the triad built on a scale degree (1–7) in the given key */
export function getTriadPitchClasses(root: Root, mode: ModeName, degree: number): Set<number> {
  const rootIndex = ROOTS.indexOf(root)
  const intervals = MODES[mode]
  // Degrees are 1-indexed; triad = scale degrees [degree, degree+2, degree+4] (1-indexed, wrapping)
  const d = degree - 1 // 0-indexed
  return new Set([0, 2, 4].map(offset => (rootIndex + intervals[(d + offset) % 7]) % 12))
}

/** Get the triad pitch classes for a keyset, using scaleDegree if set, otherwise falling back to chord name root.
 *  Returns null if no triad can be determined. */
export function getSimplifyTriadPitchClasses(
  chordName: string,
  songKey: string,
  scaleDegree: number | null,
): Set<number> | null {
  const parsed = parseSongKey(songKey)
  if (!parsed) return null

  // If scaleDegree is set, use it directly
  if (scaleDegree) {
    return getTriadPitchClasses(parsed.root, parsed.mode, scaleDegree)
  }

  // Fall back: extract root from chord name and find matching scale degree
  // Chord.get gives us the root note name, e.g. "Dm9" -> root "D"
  const chordData = Chord.get(chordName)
  if (chordData.tonic) {
    const rootPc = Note.chroma(chordData.tonic)
    if (rootPc !== undefined && rootPc !== null) {
      // Find which scale degree has this root
      const keyRootIndex = ROOTS.indexOf(parsed.root)
      const intervals = MODES[parsed.mode]
      for (let d = 0; d < 7; d++) {
        if ((keyRootIndex + intervals[d]) % 12 === rootPc) {
          return getTriadPitchClasses(parsed.root, parsed.mode, d + 1)
        }
      }
    }
  }

  return null
}
