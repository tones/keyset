'use client'

import { useState, useEffect } from 'react'
import { Key } from 'tonal'
import { Midi } from 'tonal'

/**
 * StaffNotation — renders a mini grand staff (treble + bass) showing note heads
 * for the given MIDI notes, with key signature and accidentals.
 *
 * Only shown in compact mode when a songKey is set (key mode).
 */

// Staff position: 0 = middle C (B0 on treble = ledger line below treble staff)
// Each step = one line or space. Positive = up, negative = down.
// Treble staff lines (bottom to top): E4=0, G4=2, B4=4, D5=6, F5=8 (relative to treble bottom)
// Bass staff lines (bottom to top): G2=0, B2=2, D3=4, F3=6, A3=8 (relative to bass bottom)

// Note names in order for mapping: C D E F G A B
const NOTE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const

// Map from note letter to its diatonic position within an octave (C=0, D=1, E=2, F=3, G=4, A=5, B=6)
function letterIndex(letter: string): number {
  return NOTE_ORDER.indexOf(letter as typeof NOTE_ORDER[number])
}

// Get the diatonic staff position for a MIDI note relative to middle C (MIDI 60 = C4)
// Middle C = position 0, D4 = 1, E4 = 2, etc. Each octave = 7 positions.
function staffPosition(midiNote: number, useSharps: boolean): { pos: number; accidental: string } {
  const noteName = Midi.midiToNoteName(midiNote, { sharps: useSharps })
  // Parse note name like "C4", "C#4", "Bb3"
  const match = noteName.match(/^([A-G])(#{1,2}|b{1,2})?(-?\d+)$/)
  if (!match) return { pos: 0, accidental: '' }
  const [, letter, acc, octStr] = match
  const octave = parseInt(octStr)
  // Position relative to C4 (middle C)
  const pos = (octave - 4) * 7 + letterIndex(letter)
  return { pos, accidental: acc || '' }
}

// Get the scale note names for a key (to determine which accidentals are "in key")
function getKeyScale(songKey: string): string[] {
  const parts = songKey.split(' ')
  if (parts.length !== 2) return []
  const [root, mode] = parts
  const scale = mode === 'minor'
    ? Key.minorKey(root)?.natural?.scale
    : Key.majorKey(root)?.scale
  return scale ? [...scale] : []
}

// Get key signature accidentals (e.g. F#, C# for D major)
function getKeySignatureAccidentals(songKey: string): { note: string; accidental: string }[] {
  const parts = songKey.split(' ')
  if (parts.length !== 2) return []
  const [root, mode] = parts
  const keyData = mode === 'minor'
    ? Key.minorKey(root)?.natural
    : Key.majorKey(root)
  if (!keyData) return []

  // keySignature is like "##" or "bbb" — count of sharps or flats
  const sig = (keyData as { keySignature?: string }).keySignature || ''
  if (!sig) return []

  const isFlat = sig.includes('b')
  const count = sig.length

  // Order of sharps: F C G D A E B
  // Order of flats: B E A D G C F
  const sharpOrder = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
  const flatOrder = ['B', 'E', 'A', 'D', 'G', 'C', 'F']

  const order = isFlat ? flatOrder : sharpOrder
  const acc = isFlat ? 'b' : '#'

  return order.slice(0, count).map(note => ({ note, accidental: acc }))
}

// Check if a note's accidental is already covered by the key signature
function isAccidentalInKey(letter: string, accidental: string, keyAccidentals: { note: string; accidental: string }[]): boolean {
  return keyAccidentals.some(ka => ka.note === letter && ka.accidental === accidental)
}

interface StaffNotationProps {
  midiNotes: number[]
  songKey: string
  height?: number
}

export default function StaffNotation({ midiNotes, songKey, height = 50 }: StaffNotationProps) {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  if (midiNotes.length === 0) return null

  const lineColor = isDark ? '#4b5563' : '#d1d5db'
  const clefColor = isDark ? '#6b7280' : '#9ca3af'
  const noteColor = isDark ? '#d1d5db' : '#374151'
  const keySigColor = isDark ? '#6b7280' : '#9ca3af'

  const scale = getKeyScale(songKey)
  const useSharps = !scale.some(n => n.includes('b'))
  const keyAccidentals = getKeySignatureAccidentals(songKey)

  // Compute note positions
  const notes = midiNotes.map(midi => {
    const { pos, accidental } = staffPosition(midi, useSharps)
    const letter = Midi.midiToNoteName(midi, { sharps: useSharps }).match(/^([A-G])/)?.[1] || ''
    // Check if accidental is already in key signature
    const showAccidental = accidental && !isAccidentalInKey(letter, accidental, keyAccidentals)
    // Natural sign needed if the note is natural but the key signature has an accidental for this letter
    const needsNatural = !accidental && keyAccidentals.some(ka => ka.note === letter)
    return { midi, pos, accidental, showAccidental, needsNatural, letter }
  })

  // Layout constants
  const STAFF_GAP = 14        // gap between treble and bass staves (in staff-space units * spacing)
  const LINE_SPACING = 3.5    // px between staff lines
  const TREBLE_TOP = 6        // px from top of SVG to top treble line
  const STAFF_LINES = 5
  const STAFF_HEIGHT = (STAFF_LINES - 1) * LINE_SPACING // 14px per staff

  // Treble staff: lines at positions F5=8, D5=6, B4=4, G4=2, E4=0 (relative to middle C)
  // So treble bottom line (E4) = pos 2, top line (F5) = pos 10
  // Bass staff: lines at positions A3=-2, F3=-4, D3=-6, B2=-8, G2=-10
  // So bass top line (A3) = pos -2, bottom line (G2) = pos -10

  const trebleBottomY = TREBLE_TOP + STAFF_HEIGHT  // Y of bottom treble line (E4, pos=2)
  const bassTopY = trebleBottomY + STAFF_GAP       // Y of top bass line (A3, pos=-2)
  const bassBottomY = bassTopY + STAFF_HEIGHT       // Y of bottom bass line (G2, pos=-10)

  // Convert staff position to Y coordinate
  // Treble: pos 2 (E4) = trebleBottomY, pos 10 (F5) = TREBLE_TOP
  // Bass: pos -2 (A3) = bassTopY, pos -10 (G2) = bassBottomY
  // Each position step = LINE_SPACING / 2 (half a line space)
  const HALF_SPACE = LINE_SPACING / 2

  // Middle C (pos 0) Y: one ledger line below treble = trebleBottomY + LINE_SPACING
  // which is also one ledger line above bass = bassTopY - LINE_SPACING
  const middleCY = trebleBottomY + LINE_SPACING  // pos 0

  function posToY(pos: number): number {
    return middleCY - pos * HALF_SPACE
  }

  // Key signature rendering positions (treble clef)
  // Sharps order on treble: F5, C5, G5, D5, A4, E5, B4
  const sharpTreblePos = [10, 7, 11, 8, 5, 9, 6]
  // Flats order on treble: B4, E5, A4, D5, G4, C5, F4
  const flatTreblePos = [4, 9, 3, 8, 2, 7, 1]
  // Sharps order on bass: F3, C3, G3, D3, A2, E3, B2
  const sharpBassPos = [-4, -7, -3, -6, -9, -5, -8]
  // Flats order on bass: B2, E3, A2, D3, G2, C3, F2
  const flatBassPos = [-8, -5, -9, -6, -10, -7, -11]

  const isFlat = keyAccidentals.length > 0 && keyAccidentals[0].accidental === 'b'

  // Sort notes by position for second-detection (adjacent notes need horizontal offset)
  const sortedNotes = [...notes].sort((a, b) => a.pos - b.pos)
  // Mark notes that are a second apart (adjacent positions) — nudge right
  const nudged = new Set<number>()
  for (let i = 1; i < sortedNotes.length; i++) {
    if (Math.abs(sortedNotes[i].pos - sortedNotes[i - 1].pos) === 1) {
      nudged.add(sortedNotes[i].midi)
    }
  }

  // SVG dimensions
  const keySigWidth = keyAccidentals.length * 5
  const NOTE_AREA_X = 18 + keySigWidth // after clef + key sig
  const NOTE_COL_X = NOTE_AREA_X + 8   // single column for all notes
  const svgWidth = NOTE_COL_X + 14      // note + accidental space + margin
  const svgHeight = bassBottomY + 8

  // Scale to fit height
  const scale_factor = height / svgHeight

  return (
    <svg
      width={svgWidth * scale_factor}
      height={height}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="shrink-0"
      data-testid="staff-notation"
    >
      {/* Treble staff lines */}
      {[0, 1, 2, 3, 4].map(i => (
        <line key={`t${i}`} x1={0} y1={TREBLE_TOP + i * LINE_SPACING} x2={svgWidth} y2={TREBLE_TOP + i * LINE_SPACING} stroke={lineColor} strokeWidth={0.5} />
      ))}
      {/* Bass staff lines */}
      {[0, 1, 2, 3, 4].map(i => (
        <line key={`b${i}`} x1={0} y1={bassTopY + i * LINE_SPACING} x2={svgWidth} y2={bassTopY + i * LINE_SPACING} stroke={lineColor} strokeWidth={0.5} />
      ))}

      {/* Treble clef - simplified */}
      <text x={1} y={trebleBottomY - LINE_SPACING} fontSize={18} fill={clefColor} fontFamily="serif" dominantBaseline="central">𝄞</text>
      {/* Bass clef - simplified */}
      <text x={1} y={bassTopY + LINE_SPACING * 1.5} fontSize={14} fill={clefColor} fontFamily="serif" dominantBaseline="central">𝄢</text>

      {/* Key signature */}
      {keyAccidentals.map((ka, i) => {
        const treblePos = isFlat ? flatTreblePos[i] : sharpTreblePos[i]
        const bassPos = isFlat ? flatBassPos[i] : sharpBassPos[i]
        const symbol = isFlat ? '♭' : '♯'
        const xOff = 14 + i * 5
        return (
          <g key={`ks${i}`}>
            <text x={xOff} y={posToY(treblePos)} fontSize={6} fill={keySigColor} textAnchor="middle" dominantBaseline="central">{symbol}</text>
            <text x={xOff} y={posToY(bassPos)} fontSize={6} fill={keySigColor} textAnchor="middle" dominantBaseline="central">{symbol}</text>
          </g>
        )
      })}

      {/* Note heads — all in same column (chord voicing) */}
      {notes.map((note) => {
        const y = posToY(note.pos)
        const isNudged = nudged.has(note.midi)
        const x = NOTE_COL_X + (isNudged ? 5.5 : 0)

        // Ledger lines
        const ledgerLines: number[] = []
        // Middle C ledger line (pos 0) — needed if note is at pos 0 or between staves
        if (note.pos === 0) ledgerLines.push(0)
        // Ledger lines above treble (pos > 10)
        for (let p = 12; p <= note.pos; p += 2) ledgerLines.push(p)
        // Ledger lines below bass (pos < -10)
        for (let p = -12; p >= note.pos; p -= 2) ledgerLines.push(p)

        return (
          <g key={note.midi}>
            {/* Ledger lines */}
            {ledgerLines.map(lp => (
              <line key={`l${lp}`} x1={NOTE_COL_X - 5} y1={posToY(lp)} x2={NOTE_COL_X + 5} y2={posToY(lp)} stroke={lineColor} strokeWidth={0.5} />
            ))}
            {/* Note head (filled ellipse) */}
            <ellipse cx={x} cy={y} rx={2.8} ry={2} fill={noteColor} transform={`rotate(-15 ${x} ${y})`} />
            {/* Accidental */}
            {note.showAccidental && (
              <text x={x - 4.5} y={y} fontSize={5} fill={noteColor} textAnchor="end" dominantBaseline="central">
                {note.accidental === '#' ? '♯' : note.accidental === 'b' ? '♭' : note.accidental === '##' ? '𝄪' : '♭♭'}
              </text>
            )}
            {note.needsNatural && (
              <text x={x - 4.5} y={y} fontSize={5} fill={noteColor} textAnchor="end" dominantBaseline="central">♮</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
