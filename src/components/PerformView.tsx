'use client'

import PianoKeyboard from '@/components/PianoKeyboard'
import { identifyChord } from '@/lib/chordId'
import { playChord } from '@/lib/playChord'

interface KeyPress {
  id: number
  midiNote: number
  color: string
}

interface KeySet {
  id: number
  position: number
  type: string
  keyPresses: KeyPress[]
}

export default function PerformView({ keySets }: { keySets: KeySet[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {keySets.map((keySet) => (
        <div key={keySet.id} className={`rounded-lg shadow p-3 border ${keySet.type === 'flourish' ? 'bg-amber-50 border-amber-200' : 'bg-white border-transparent'}`}>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-semibold text-gray-900">
              {keySet.type === 'flourish'
                ? <span className="text-amber-600 italic">Flourish</span>
                : keySet.keyPresses.length > 0 ? identifyChord(keySet.keyPresses.map((kp) => kp.midiNote)) : '\u00A0'}
            </h2>
            {keySet.keyPresses.length > 0 && (
              <button
                onClick={() => playChord(keySet.keyPresses.map((kp) => kp.midiNote))}
                className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                title="Play Chord"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}
          </div>
          <PianoKeyboard
            highlightedNotes={keySet.keyPresses.map((kp) => kp.midiNote)}
            noteColors={Object.fromEntries(keySet.keyPresses.map((kp) => [kp.midiNote, kp.color]))}
            height={70}
          />
        </div>
      ))}
    </div>
  )
}
