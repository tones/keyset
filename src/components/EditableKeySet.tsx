'use client'

import { useState } from 'react'
import PianoKeyboard from '@/components/PianoKeyboard'
import { saveKeyPresses } from '@/app/keyset/[id]/actions'

interface EditableKeySetProps {
  keySetId: number
  songId: number
  initialNotes: number[]
}

export default function EditableKeySet({ keySetId, songId, initialNotes }: EditableKeySetProps) {
  const [notes, setNotes] = useState<number[]>(initialNotes)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  function handleToggle(midiNote: number) {
    setNotes((prev) => {
      if (prev.includes(midiNote)) {
        return prev.filter((n) => n !== midiNote)
      } else {
        return [...prev, midiNote].sort((a, b) => a - b)
      }
    })
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveKeyPresses(keySetId, songId, notes)
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PianoKeyboard highlightedNotes={notes} onToggle={handleToggle} />

      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className={`px-4 py-2 rounded text-white ${
            dirty
              ? 'bg-blue-500 hover:bg-blue-600'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {dirty && (
          <span className="text-sm text-amber-600">Unsaved changes</span>
        )}
      </div>
    </div>
  )
}
