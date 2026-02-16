import { Chord } from 'tonal'
import { Midi } from 'tonal'

export function identifyChord(midiNotes: number[]): string {
  if (midiNotes.length === 0) return ''

  const sorted = [...midiNotes].sort((a, b) => a - b)
  const noteNames = sorted.map((n) => Midi.midiToNoteName(n, { sharps: true }))

  if (midiNotes.length === 1) {
    // Single note — just return the pitch class without octave
    return Midi.midiToNoteName(midiNotes[0], { sharps: true, pitchClass: true })
  }

  const detected = Chord.detect(noteNames)
  if (detected.length === 0) {
    // No chord found — list pitch classes
    const pitchClasses = [...new Set(midiNotes.map((n) =>
      Midi.midiToNoteName(n, { sharps: true, pitchClass: true })
    ))]
    return pitchClasses.join('-')
  }

  return detected[0]
}
