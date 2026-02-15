'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import SortableKeySetList from '@/components/SortableKeySetList'
import EditableTitle from '@/components/EditableTitle'
import YouTubeLink from '@/components/YouTubeLink'
import Link from 'next/link'
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
  const [showCommonTones, setShowCommonTones] = useState(true)
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
      <div className="flex items-center justify-between mb-2 h-8">
        <Link href="/" className="text-blue-500 hover:text-blue-700 text-sm">
          ← Back to Keysets
        </Link>
        <div className={`flex items-center gap-3 ${isDirty ? '' : 'invisible'}`} data-testid="save-bar">
          <span className="text-sm text-amber-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Unsaved changes
          </span>
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
            <div className="flex items-start justify-between gap-3">
              <EditableTitle initialTitle={initialTitle} onSave={onSaveTitle} />
              <div className="flex flex-col items-end gap-2 shrink-0">
                <YouTubeLink initialUrl={initialYoutubeUrl} onSave={onSaveYoutubeUrl} />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <span className="text-xs font-medium text-gray-500">Compact</span>
                    <button
                      onClick={() => handleModeSwitch(mode === 'compact' ? 'full' : 'compact')}
                      className={`relative w-9 h-5 rounded-full transition-colors ${mode === 'compact' ? 'bg-gray-900' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${mode === 'compact' ? 'translate-x-4' : ''}`} />
                    </button>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <span className="text-xs font-medium text-gray-500">Common Tones</span>
                    <button
                      onClick={() => setShowCommonTones(!showCommonTones)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${showCommonTones ? 'bg-yellow-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showCommonTones ? 'translate-x-4' : ''}`} />
                    </button>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SortableKeySetList
        keySets={keySets}
        compact={mode === 'compact'}
        showCommonTones={showCommonTones}
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
