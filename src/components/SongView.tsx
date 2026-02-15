'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import SortableKeySetList from '@/components/SortableKeySetList'
import EditableTitle from '@/components/EditableTitle'
import YouTubeLink from '@/components/YouTubeLink'
import { saveKeySets } from '@/app/song/[id]/actions'

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
  imageUrl: string | null
  initialYoutubeUrl: string | null
  onSaveTitle: (title: string) => Promise<void>
  onSaveYoutubeUrl: (url: string | null) => Promise<void>
}

let nextTempId = -1

export default function SongView({ songId, keySets: serverKeySets, initialTitle, imageUrl, initialYoutubeUrl, onSaveTitle, onSaveYoutubeUrl }: SongViewProps) {
  const [mode, setMode] = useState<'full' | 'compact'>('full')
  const [keySets, setKeySets] = useState(serverKeySets)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function serialize(ks: KeySet[]) {
    return JSON.stringify(ks.map(k => ({ t: k.type, kp: k.keyPresses.map(p => [p.midiNote, p.color]) })))
  }

  const keySetsRef = useRef(keySets)
  keySetsRef.current = keySets

  const savedRef = useRef(serialize(serverKeySets))
  const isDirty = serialize(keySets) !== savedRef.current

  const handleSaveRef = useRef<() => void>(() => {})

  // Warn on browser close/refresh with unsaved changes + Ctrl/Cmd+S to save
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (serialize(keySets) !== savedRef.current) {
        e.preventDefault()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSaveRef.current()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [keySets])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const current = keySetsRef.current
    try {
      await saveKeySets(songId, current.map(ks => ({
        type: ks.type,
        keyPresses: ks.keyPresses.map(kp => ({ midiNote: kp.midiNote, color: kp.color })),
      })))
      savedRef.current = serialize(current)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }
  handleSaveRef.current = handleSave

  function handleReset() {
    if (!confirm('Discard unsaved changes?')) return
    setKeySets(serverKeySets)
    savedRef.current = serialize(serverKeySets)
  }

  function handleModeSwitch(newMode: 'full' | 'compact') {
    setMode(newMode)
  }

  // --- Key set mutation handlers (all local state only) ---

  const handleAdd = useCallback(() => {
    const tempId = nextTempId--
    setKeySets(prev => [...prev, { id: tempId, position: prev.length + 1, type: 'chord', keyPresses: [] }])
  }, [])

  const handleDuplicate = useCallback((keySetId: number) => {
    const tempId = nextTempId--
    setKeySets(prev => {
      const idx = prev.findIndex(ks => ks.id === keySetId)
      if (idx === -1) return prev
      const original = prev[idx]
      const copy = {
        id: tempId,
        position: original.position + 1,
        type: original.type,
        keyPresses: original.keyPresses.map(kp => ({ ...kp, id: nextTempId-- })),
      }
      const updated = [...prev]
      updated.splice(idx + 1, 0, copy)
      return updated
    })
  }, [])

  const handleDelete = useCallback((keySetId: number) => {
    if (!confirm('Are you sure you want to delete this key set?')) return
    setKeySets(prev => prev.filter(ks => ks.id !== keySetId))
  }, [])

  const handleToggleNote = useCallback((keySetId: number, midiNote: number, color: string) => {
    setKeySets(prev =>
      prev.map(ks => {
        if (ks.id !== keySetId) return ks
        const existing = ks.keyPresses.find(kp => kp.midiNote === midiNote)
        if (existing && existing.color === color) {
          return { ...ks, keyPresses: ks.keyPresses.filter(kp => kp.midiNote !== midiNote) }
        } else if (existing) {
          return { ...ks, keyPresses: ks.keyPresses.map(kp => kp.midiNote === midiNote ? { ...kp, color } : kp) }
        } else {
          return { ...ks, keyPresses: [...ks.keyPresses, { id: nextTempId--, midiNote, color }] }
        }
      })
    )
  }, [])

  const handleShiftNotes = useCallback((keySetId: number, delta: number) => {
    setKeySets(prev =>
      prev.map(ks => {
        if (ks.id !== keySetId) return ks
        const allValid = ks.keyPresses.every(kp => {
          const newNote = kp.midiNote + delta
          return newNote >= 0 && newNote <= 127
        })
        if (!allValid) return ks
        return { ...ks, keyPresses: ks.keyPresses.map(kp => ({ ...kp, midiNote: kp.midiNote + delta })) }
      })
    )
  }, [])

  const handleToggleType = useCallback((keySetId: number) => {
    setKeySets(prev =>
      prev.map(ks => {
        if (ks.id !== keySetId) return ks
        return { ...ks, type: ks.type === 'flourish' ? 'chord' : 'flourish' }
      })
    )
  }, [])

  const handleReorder = useCallback((reorderedKeySets: KeySet[]) => {
    setKeySets(reorderedKeySets)
  }, [])

  return (
    <>
      <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
        <div className="flex">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-28 h-28 object-cover shrink-0" />
          ) : (
            <div className="w-28 h-28 bg-gray-100 shrink-0 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          )}
          <div className="flex-1 p-4 min-w-0 flex flex-col justify-between">
            <div>
              <EditableTitle initialTitle={initialTitle} onSave={onSaveTitle} />
              <div className="mt-1">
                <YouTubeLink initialUrl={initialYoutubeUrl} onSave={onSaveYoutubeUrl} />
              </div>
            </div>
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => handleModeSwitch('full')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${mode === 'full' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
              >
                Full
              </button>
              <button
                onClick={() => handleModeSwitch('compact')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${mode === 'compact' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
              >
                Compact
              </button>
            </div>
          </div>
        </div>
        <div className="h-10 border-t border-gray-100 px-4 flex items-center justify-between">
          {isDirty ? (
            <div className="flex items-center justify-between w-full" data-testid="save-bar">
              <span className="text-sm text-amber-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Unsaved changes
              </span>
              <div className="flex items-center gap-2">
                {saveError && <span className="text-sm text-red-600" data-testid="save-error">{saveError}</span>}
                <button
                  onClick={handleReset}
                  className="px-3 py-1 text-sm font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
                  data-testid="reset-button"
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 cursor-pointer transition-colors disabled:opacity-50"
                  data-testid="save-button"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <span />
          )}
        </div>
      </div>

      <SortableKeySetList
        keySets={keySets}
        compact={mode === 'compact'}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onToggleNote={handleToggleNote}
        onShiftNotes={handleShiftNotes}
        onToggleType={handleToggleType}
        onReorder={handleReorder}
      />
    </>
  )
}
