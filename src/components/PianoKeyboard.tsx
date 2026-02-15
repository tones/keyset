'use client'

interface PianoKeyboardProps {
  highlightedNotes: number[]
  startNote?: number
  endNote?: number
  onToggle?: (midiNote: number) => void
}

function isBlackKey(midiNote: number): boolean {
  return [1, 3, 6, 8, 10].includes(midiNote % 12)
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function getNoteName(midiNote: number): string {
  const octave = Math.floor(midiNote / 12) - 1
  return `${NOTE_NAMES[midiNote % 12]}${octave}`
}

// Where each black key sits relative to the boundary between its two neighboring white keys.
// 0.5 = centered on the boundary. < 0.5 shifts left, > 0.5 shifts right.
const BLACK_KEY_BIAS: Record<number, number> = {
  1: 0.4,   // C#
  3: 0.6,   // D#
  6: 0.35,  // F#
  8: 0.5,   // G#
  10: 0.6,  // A#
}

export default function PianoKeyboard({ highlightedNotes, startNote = 48, endNote = 84, onToggle }: PianoKeyboardProps) {
  const highlightSet = new Set(highlightedNotes)

  // Collect all white keys in range and assign each an index
  const whiteKeys: number[] = []
  const whiteKeyIndex = new Map<number, number>()
  for (let n = startNote; n <= endNote; n++) {
    if (!isBlackKey(n)) {
      whiteKeyIndex.set(n, whiteKeys.length)
      whiteKeys.push(n)
    }
  }

  const totalWhite = whiteKeys.length
  const wPct = 100 / totalWhite           // white key width in %
  const bPct = wPct * 0.58                 // black key width in %
  const BLACK_KEY_HEIGHT = 62              // % of container height

  // For a black key, find the white key immediately below and above it,
  // then interpolate between their left edges using the bias.
  function blackKeyLeftPct(midiNote: number): number {
    const noteInOctave = midiNote % 12
    const bias = BLACK_KEY_BIAS[noteInOctave] ?? 0.5

    // The white key just below this black key
    const lowerWhite = midiNote - 1 - (isBlackKey(midiNote - 1) ? 1 : 0)
    // The white key just above this black key
    const upperWhite = midiNote + 1 + (isBlackKey(midiNote + 1) ? 1 : 0)

    const lowerIdx = whiteKeyIndex.get(lowerWhite)
    const upperIdx = whiteKeyIndex.get(upperWhite)

    if (lowerIdx === undefined || upperIdx === undefined) {
      if (lowerIdx !== undefined) return (lowerIdx + 1) * wPct - bPct / 2
      if (upperIdx !== undefined) return upperIdx * wPct - bPct / 2
      return 0
    }

    // The boundary between the two neighboring white keys
    const boundaryPct = (lowerIdx + 1) * wPct
    // Shift the center based on bias (0.5 = centered on boundary)
    const shift = (bias - 0.5) * wPct * 0.5
    return boundaryPct + shift - bPct / 2
  }

  // Collect black keys in range
  const blackKeys: number[] = []
  for (let n = startNote; n <= endNote; n++) {
    if (isBlackKey(n)) blackKeys.push(n)
  }

  return (
    <div data-testid="piano-keyboard" className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100" style={{ height: '110px' }}>
      {/* White keys */}
      {whiteKeys.map((note, i) => {
        const isHighlighted = highlightSet.has(note)
        return (
          <div
            key={note}
            data-note={note}
            title={getNoteName(note)}
            className={`absolute top-0 border-r border-gray-300 rounded-b${onToggle ? ' cursor-pointer hover:brightness-90' : ''}`}
            style={{
              left: `${i * wPct}%`,
              width: `${wPct}%`,
              height: '100%',
              backgroundColor: isHighlighted ? '#ef4444' : '#ffffff',
              zIndex: 1,
            }}
            onClick={onToggle ? () => onToggle(note) : undefined}
          />
        )
      })}

      {/* Black keys */}
      {blackKeys.map((note) => {
        const isHighlighted = highlightSet.has(note)
        return (
          <div
            key={note}
            data-note={note}
            title={getNoteName(note)}
            className={`absolute top-0 rounded-b-md shadow-md${onToggle ? ' cursor-pointer hover:brightness-90' : ''}`}
            style={{
              left: `${blackKeyLeftPct(note)}%`,
              width: `${bPct}%`,
              height: `${BLACK_KEY_HEIGHT}%`,
              backgroundColor: isHighlighted ? '#dc2626' : '#1a1a1a',
              zIndex: 2,
            }}
            onClick={onToggle ? () => onToggle(note) : undefined}
          />
        )
      })}
    </div>
  )
}
