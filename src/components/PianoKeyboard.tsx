'use client'

import { KEY_COLORS, DEFAULT_COLOR } from '@/lib/colors'
import { getNoteName, buildKeyLayout, blackKeyLeftPct } from '@/lib/pianoLayout'

interface PianoKeyboardProps {
  highlightedNotes: number[]
  noteColors?: Record<number, string>  // midiNote -> color name
  inKeyPitchClasses?: Set<number>  // pitch classes (0-11) that are in the selected key
  triadPitchClasses?: Set<number>  // pitch classes (0-11) of the scale degree triad to outline
  showTriadSuggestions?: boolean  // whether to outline unselected triad keys as suggestions (default true)
  startNote?: number
  endNote?: number
  height?: number  // px, default 110
  onToggle?: (midiNote: number) => void
}

export default function PianoKeyboard({ highlightedNotes, noteColors = {}, inKeyPitchClasses, triadPitchClasses, showTriadSuggestions = true, startNote = 36, endNote = 84, height = 110, onToggle }: PianoKeyboardProps) {
  const highlightSet = new Set(highlightedNotes)
  const highlightedPCs = new Set(highlightedNotes.map(n => n % 12))
  const layout = buildKeyLayout(startNote, endNote)
  const { whiteKeys, wPct, bPct, blackKeys } = layout
  const BLACK_KEY_HEIGHT = 62              // % of container height

  // Should this key get a triad outline?
  // - If the pitch class is in the triad and no key of that PC is pressed: outline (suggestion)
  // - If the pitch class is in the triad and this specific key IS pressed: outline (clarification)
  // - Otherwise: no outline
  function showTriadOutline(note: number): boolean {
    if (!triadPitchClasses?.has(note % 12)) return false
    if (highlightedPCs.has(note % 12)) return highlightSet.has(note)
    return showTriadSuggestions
  }

  return (
    <div data-testid="piano-keyboard" className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100" style={{ height: `${height}px` }}>
      {/* White keys */}
      {whiteKeys.map((note, i) => {
        const isHighlighted = highlightSet.has(note)
        const colorName = noteColors[note] ?? DEFAULT_COLOR
        const color = KEY_COLORS[colorName] ?? KEY_COLORS[DEFAULT_COLOR]
        const inKey = inKeyPitchClasses?.has(note % 12)
        let bg: string
        if (isHighlighted) {
          bg = inKeyPitchClasses ? (inKey ? color.white : color.mutedWhite) : color.white
        } else {
          bg = inKeyPitchClasses ? (inKey ? '#ffffff' : '#e5e7eb') : '#ffffff'
        }
        return (
          <div
            key={note}
            data-note={note}
            data-highlighted={isHighlighted ? 'true' : undefined}
            title={getNoteName(note)}
            className={`absolute top-0 border-r border-gray-300 rounded-b${onToggle ? ' cursor-pointer hover:brightness-90' : ''}`}
            style={{
              left: `${i * wPct}%`,
              width: `${wPct}%`,
              height: '100%',
              backgroundColor: bg,
              zIndex: 1,
              ...(showTriadOutline(note) ? { boxShadow: 'inset 0 0 0 2px #f59e0b' } : {}),
            }}
            onClick={onToggle ? () => onToggle(note) : undefined}
          />
        )
      })}

      {/* Octave labels on C keys */}
      {whiteKeys.filter(note => note % 12 === 0).map((note, _, arr) => {
        const i = whiteKeys.indexOf(note)
        const octave = Math.floor(note / 12) - 1
        return (
          <span
            key={`label-${note}`}
            className="absolute text-gray-400 font-medium pointer-events-none select-none"
            style={{
              left: `${i * wPct + wPct / 2}%`,
              bottom: 2,
              transform: 'translateX(-50%)',
              fontSize: height < 80 ? 8 : 9,
              zIndex: 3,
            }}
          >
            C{octave}
          </span>
        )
      })}

      {/* Black keys */}
      {blackKeys.map((note) => {
        const isHighlighted = highlightSet.has(note)
        const colorName = noteColors[note] ?? DEFAULT_COLOR
        const color = KEY_COLORS[colorName] ?? KEY_COLORS[DEFAULT_COLOR]
        const inKey = inKeyPitchClasses?.has(note % 12)
        let bg: string
        if (isHighlighted) {
          bg = inKeyPitchClasses ? (inKey ? color.black : color.mutedBlack) : color.black
        } else {
          bg = inKeyPitchClasses ? (inKey ? '#000000' : '#6b7280') : '#1a1a1a'
        }
        return (
          <div
            key={note}
            data-note={note}
            data-highlighted={isHighlighted ? 'true' : undefined}
            title={getNoteName(note)}
            className={`absolute top-0 rounded-b-md shadow-md${onToggle ? ' cursor-pointer hover:brightness-90' : ''}`}
            style={{
              left: `${blackKeyLeftPct(note, layout)}%`,
              width: `${bPct}%`,
              height: `${BLACK_KEY_HEIGHT}%`,
              backgroundColor: bg,
              zIndex: 2,
              ...(showTriadOutline(note) ? { boxShadow: 'inset 0 0 0 2px #f59e0b' } : {}),
            }}
            onClick={onToggle ? () => onToggle(note) : undefined}
          />
        )
      })}
    </div>
  )
}
