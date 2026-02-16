import { Chord, Key } from 'tonal'
import { Midi } from 'tonal'

/** Determine whether a key uses sharps or flats based on its scale */
function keyUseSharps(songKey: string): boolean {
  const parts = songKey.split(' ')
  if (parts.length !== 2) return true
  const [root, mode] = parts
  const scale = mode === 'minor'
    ? Key.minorKey(root)?.natural?.scale
    : Key.majorKey(root)?.scale
  if (!scale || scale.length === 0) return true
  // If any note in the scale has a flat, use flats
  return !scale.some((n: string) => n.includes('b'))
}

export function identifyChord(midiNotes: number[], songKey?: string | null): string {
  if (midiNotes.length === 0) return ''

  const useSharps = songKey ? keyUseSharps(songKey) : true
  const sorted = [...midiNotes].sort((a, b) => a - b)
  const noteNames = sorted.map((n) => Midi.midiToNoteName(n, { sharps: useSharps }))

  if (midiNotes.length === 1) {
    // Single note — just return the pitch class without octave
    return Midi.midiToNoteName(midiNotes[0], { sharps: useSharps, pitchClass: true })
  }

  const detected = Chord.detect(noteNames)
  if (detected.length === 0) {
    // No chord found — list pitch classes
    const pitchClasses = [...new Set(midiNotes.map((n) =>
      Midi.midiToNoteName(n, { sharps: useSharps, pitchClass: true })
    ))]
    return pitchClasses.join('-')
  }

  return detected[0]
}
