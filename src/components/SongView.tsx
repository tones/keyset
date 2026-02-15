'use client'

import { useState } from 'react'
import SortableKeySetList from '@/components/SortableKeySetList'
import PerformView from '@/components/PerformView'
import EditableTitle from '@/components/EditableTitle'
import YouTubeLink from '@/components/YouTubeLink'

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

interface SongViewProps {
  songId: number
  keySets: KeySet[]
  initialTitle: string
  initialYoutubeUrl: string | null
  onSaveTitle: (title: string) => Promise<void>
  onSaveYoutubeUrl: (url: string | null) => Promise<void>
}

export default function SongView({ songId, keySets, initialTitle, initialYoutubeUrl, onSaveTitle, onSaveYoutubeUrl }: SongViewProps) {
  const [mode, setMode] = useState<'edit' | 'perform'>('edit')

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <EditableTitle initialTitle={initialTitle} onSave={onSaveTitle} />
          <div className="flex gap-1.5 shrink-0">
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
        </div>
        <div className="mt-1">
          <YouTubeLink initialUrl={initialYoutubeUrl} onSave={onSaveYoutubeUrl} />
        </div>
      </div>

      {mode === 'edit' ? (
        <SortableKeySetList songId={songId} keySets={keySets} />
      ) : (
        <PerformView keySets={keySets} />
      )}
    </>
  )
}
