// Shared piano key layout math used by PianoKeyboard and CommonToneLines

export function isBlackKey(midiNote: number): boolean {
  return [1, 3, 6, 8, 10].includes(midiNote % 12)
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function getNoteName(midiNote: number): string {
  const octave = Math.floor(midiNote / 12) - 1
  return `${NOTE_NAMES[midiNote % 12]}${octave}`
}

// Where each black key sits relative to the boundary between its two neighboring white keys.
// 0.5 = centered on the boundary. < 0.5 shifts left, > 0.5 shifts right.
export const BLACK_KEY_BIAS: Record<number, number> = {
  1: 0.4,   // C#
  3: 0.6,   // D#
  6: 0.35,  // F#
  8: 0.5,   // G#
  10: 0.6,  // A#
}

export interface KeyLayout {
  whiteKeys: number[]
  whiteKeyIndex: Map<number, number>
  wPct: number   // white key width in %
  bPct: number   // black key width in %
  blackKeys: number[]
}

export function buildKeyLayout(startNote: number, endNote: number): KeyLayout {
  const whiteKeys: number[] = []
  const whiteKeyIndex = new Map<number, number>()
  const blackKeys: number[] = []
  for (let n = startNote; n <= endNote; n++) {
    if (!isBlackKey(n)) {
      whiteKeyIndex.set(n, whiteKeys.length)
      whiteKeys.push(n)
    } else {
      blackKeys.push(n)
    }
  }
  const totalWhite = whiteKeys.length
  const wPct = 100 / totalWhite
  const bPct = wPct * 0.58
  return { whiteKeys, whiteKeyIndex, wPct, bPct, blackKeys }
}

export function blackKeyLeftPct(midiNote: number, layout: KeyLayout): number {
  const noteInOctave = midiNote % 12
  const bias = BLACK_KEY_BIAS[noteInOctave] ?? 0.5
  const { whiteKeyIndex, wPct, bPct } = layout

  const lowerWhite = midiNote - 1 - (isBlackKey(midiNote - 1) ? 1 : 0)
  const upperWhite = midiNote + 1 + (isBlackKey(midiNote + 1) ? 1 : 0)

  const lowerIdx = whiteKeyIndex.get(lowerWhite)
  const upperIdx = whiteKeyIndex.get(upperWhite)

  if (lowerIdx === undefined || upperIdx === undefined) {
    if (lowerIdx !== undefined) return (lowerIdx + 1) * wPct - bPct / 2
    if (upperIdx !== undefined) return upperIdx * wPct - bPct / 2
    return 0
  }

  const boundaryPct = (lowerIdx + 1) * wPct
  const shift = (bias - 0.5) * wPct * 0.5
  return boundaryPct + shift - bPct / 2
}

// Returns the horizontal center % of a piano key within the keyboard
export function keyCenterPct(midiNote: number, layout?: KeyLayout): number {
  const l = layout ?? buildKeyLayout(48, 84)
  if (!isBlackKey(midiNote)) {
    const idx = l.whiteKeyIndex.get(midiNote) ?? 0
    return idx * l.wPct + l.wPct / 2
  } else {
    return blackKeyLeftPct(midiNote, l) + l.bPct / 2
  }
}
