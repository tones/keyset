import * as Tone from 'tone'

let synth: Tone.PolySynth | null = null

function getSynth(): Tone.PolySynth {
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 1 },
    }).toDestination()
  }
  return synth
}

export async function playChord(midiNotes: number[]): Promise<void> {
  if (midiNotes.length === 0) return
  await Tone.start()
  const noteNames = midiNotes.map((n) => Tone.Frequency(n, 'midi').toNote())
  getSynth().triggerAttackRelease(noteNames, '2n')
}
