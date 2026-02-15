'use client'

import { useState } from 'react'
import SortableKeySetList from '@/components/SortableKeySetList'
import PerformView from '@/components/PerformView'

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

export default function SongView({ songId, keySets }: { songId: number; keySets: KeySet[] }) {
  const [mode, setMode] = useState<'edit' | 'perform'>('edit')

  return (
    <>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('edit')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${mode === 'edit' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
        >
          Edit
        </button>
        <button
          onClick={() => setMode('perform')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${mode === 'perform' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
        >
          Perform
        </button>
      </div>

      {mode === 'edit' ? (
        <SortableKeySetList songId={songId} keySets={keySets} />
      ) : (
        <PerformView keySets={keySets} />
      )}
    </>
  )
}
