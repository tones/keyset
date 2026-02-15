'use client'

import { KEY_COLORS, DEFAULT_COLOR } from '@/lib/colors'
import { isBlackKey, getNoteName, buildKeyLayout, blackKeyLeftPct } from '@/lib/pianoLayout'

interface PianoKeyboardProps {
  highlightedNotes: number[]
  noteColors?: Record<number, string>  // midiNote -> color name
  startNote?: number
  endNote?: number
  height?: number  // px, default 110
  onToggle?: (midiNote: number) => void
}

export default function PianoKeyboard({ highlightedNotes, noteColors = {}, startNote = 48, endNote = 84, height = 110, onToggle }: PianoKeyboardProps) {
  const highlightSet = new Set(highlightedNotes)
  const layout = buildKeyLayout(startNote, endNote)
  const { whiteKeys, wPct, bPct, blackKeys } = layout
  const BLACK_KEY_HEIGHT = 62              // % of container height

  return (
    <div data-testid="piano-keyboard" className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100" style={{ height: `${height}px` }}>
      {/* White keys */}
      {whiteKeys.map((note, i) => {
        const isHighlighted = highlightSet.has(note)
        const colorName = noteColors[note] ?? DEFAULT_COLOR
        const color = KEY_COLORS[colorName] ?? KEY_COLORS[DEFAULT_COLOR]
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
              backgroundColor: isHighlighted ? color.white : '#ffffff',
              zIndex: 1,
            }}
            onClick={onToggle ? () => onToggle(note) : undefined}
          />
        )
      })}

      {/* Black keys */}
      {blackKeys.map((note) => {
        const isHighlighted = highlightSet.has(note)
        const colorName = noteColors[note] ?? DEFAULT_COLOR
        const color = KEY_COLORS[colorName] ?? KEY_COLORS[DEFAULT_COLOR]
        return (
          <div
            key={note}
            data-note={note}
            title={getNoteName(note)}
            className={`absolute top-0 rounded-b-md shadow-md${onToggle ? ' cursor-pointer hover:brightness-90' : ''}`}
            style={{
              left: `${blackKeyLeftPct(note, layout)}%`,
              width: `${bPct}%`,
              height: `${BLACK_KEY_HEIGHT}%`,
              backgroundColor: isHighlighted ? color.black : '#1a1a1a',
              zIndex: 2,
            }}
            onClick={onToggle ? () => onToggle(note) : undefined}
          />
        )
      })}
    </div>
  )
}
