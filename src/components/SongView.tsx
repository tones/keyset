'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import SortableKeySetList from '@/components/SortableKeySetList'
import SongAnalysis from '@/components/SongAnalysis'
import EditableTitle from '@/components/EditableTitle'
import YouTubeLink from '@/components/YouTubeLink'
import { useRouter } from 'next/navigation'
import { saveKeySets, refreshAlbumArt, updateCompactView, updateShowStaff } from '@/app/song/[id]/actions'
import { usePopover } from '@/hooks/usePopover'
import { ROOTS, MODE_NAMES, parseSongKey, formatSongKey, type Root, type ModeName } from '@/lib/scales'
import { analyzeSong } from '@/app/song/[id]/analyze'
import { identifyChord } from '@/lib/chordId'
import { midiToNoteName } from '@/lib/midi'
import ThemeToggle from '@/components/ThemeToggle'
import type { KeySet } from '@/types'

function ToggleSwitch({ label, enabled, onToggle, activeColor = 'bg-gray-900' }: { label: string; enabled: boolean; onToggle: () => void; activeColor?: string }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <button
        onClick={onToggle}
        className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${enabled ? `${activeColor} dark:bg-blue-500` : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  )
}

interface SongViewProps {
  songId: number
  keySets: KeySet[]
  initialTitle: string
  imageUrl: string | null
  initialYoutubeUrl: string | null
  llmProvider: string
  cachedAnalysis: string | null
  cachedAnalysisUpdatedAt: string | null
  initialCompact: boolean
  initialShowStaff: boolean
  initialSongKey: string | null
  onSaveTitle: (title: string) => Promise<void>
  onSaveYoutubeUrl: (url: string | null) => Promise<void>
}

let nextTempId = -1

export default function SongView({ songId, keySets: serverKeySets, initialTitle, imageUrl: initialImageUrl, initialYoutubeUrl, llmProvider, cachedAnalysis, cachedAnalysisUpdatedAt, initialCompact, initialShowStaff, initialSongKey, onSaveTitle, onSaveYoutubeUrl }: SongViewProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'full' | 'compact'>(initialCompact ? 'compact' : 'full')
  const [showStaff, setShowStaff] = useState(initialShowStaff)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(initialImageUrl)
  const [showCommonTones, setShowCommonTones] = useState(true)
  const [songKey, setSongKey] = useState<string | null>(initialSongKey)
  const [lastSongKey, setLastSongKey] = useState<string>(initialSongKey ?? 'C major')
  const keyPicker = usePopover()
  const [keySets, setKeySets] = useState(serverKeySets)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<string | null>(cachedAnalysis)
  const [analysisUpdatedAt, setAnalysisUpdatedAt] = useState<string | null>(cachedAnalysisUpdatedAt)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [suggestedKey, setSuggestedKey] = useState<string | null>(null)
  const [suggestedDegrees, setSuggestedDegrees] = useState<(number | null)[]>([])
  const [confidence, setConfidence] = useState<number | null>(null)

  function serialize(ks: KeySet[], a: string | null, aAt: string | null, sk: string | null) {
    return JSON.stringify({
      ks: ks.map(k => ({ t: k.type, sd: k.scaleDegree, kp: k.keyPresses.map(p => [p.midiNote, p.color]) })),
      a, aAt, sk,
    })
  }

  const keySetsRef = useRef(keySets)
  keySetsRef.current = keySets
  const analysisRef = useRef(analysis)
  analysisRef.current = analysis
  const analysisUpdatedAtRef = useRef(analysisUpdatedAt)
  analysisUpdatedAtRef.current = analysisUpdatedAt

  const songKeyRef = useRef(songKey)
  songKeyRef.current = songKey

  const savedRef = useRef(serialize(serverKeySets, cachedAnalysis, cachedAnalysisUpdatedAt, initialSongKey))
  const isDirty = serialize(keySets, analysis, analysisUpdatedAt, songKey) !== savedRef.current

  const handleSaveRef = useRef<() => void>(() => {})

  function buildChordDetail(ks: KeySet[]) {
    return ks
      .filter(k => k.type !== 'flourish')
      .map((k, i) => {
        const notes = k.keyPresses.map(kp => midiToNoteName(kp.midiNote)).join(', ')
        const chordName = k.keyPresses.length > 0 ? identifyChord(k.keyPresses.map(kp => kp.midiNote), songKey) : '(empty)'
        return `${i + 1}. ${chordName} \u2014 notes: ${notes || 'none'}`
      })
      .join('\n')
  }

  async function handleAnalyze() {
    setAnalysisLoading(true)
    setAnalysisError(null)
    setSuggestedKey(null)
    setSuggestedDegrees([])
    try {
      const currentKeySets = keySetsRef.current
      const chordKeySets = currentKeySets.filter(k => k.type !== 'flourish')
      const chordDetail = buildChordDetail(currentKeySets)
      const result = await analyzeSong(songId, initialTitle, chordDetail, chordKeySets.length)
      setAnalysis(result.analysis)
      setAnalysisUpdatedAt(result.analysisUpdatedAt)
      setSuggestedKey(result.suggestedKey)
      setSuggestedDegrees(result.suggestedDegrees)
      setConfidence(result.confidence)
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalysisLoading(false)
    }
  }

  function handleClearAnalysis() {
    setAnalysis(null)
    setAnalysisUpdatedAt(null)
    setSuggestedKey(null)
    setSuggestedDegrees([])
    setConfidence(null)
  }

  function handleApplyKeyAndDegrees() {
    if (suggestedKey) {
      setSongKey(suggestedKey)
      setLastSongKey(suggestedKey)
    }
    if (suggestedDegrees.length > 0) {
      setKeySets(prev => {
        // Map degrees to chord keysets only (skip flourishes)
        let degreeIdx = 0
        return prev.map(ks => {
          if (ks.type === 'flourish') return ks
          const degree = degreeIdx < suggestedDegrees.length ? suggestedDegrees[degreeIdx] : null
          degreeIdx++
          return { ...ks, scaleDegree: degree }
        })
      })
    }
  }

  // Warn on browser close/refresh with unsaved changes + Ctrl/Cmd+S to save
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (serialize(keySets, analysis, analysisUpdatedAt, songKey) !== savedRef.current) {
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
  }, [keySets, analysis, analysisUpdatedAt, songKey])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const current = keySetsRef.current
    const currentAnalysis = analysisRef.current
    const currentAnalysisUpdatedAt = analysisUpdatedAtRef.current
    const currentSongKey = songKeyRef.current
    try {
      await saveKeySets(songId, current.map(ks => ({
        type: ks.type,
        scaleDegree: ks.scaleDegree,
        keyPresses: ks.keyPresses.map(kp => ({ midiNote: kp.midiNote, color: kp.color })),
      })), { text: currentAnalysis, updatedAt: currentAnalysisUpdatedAt }, currentSongKey)
      savedRef.current = serialize(current, currentAnalysis, currentAnalysisUpdatedAt, currentSongKey)
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
    setAnalysis(cachedAnalysis)
    setAnalysisUpdatedAt(cachedAnalysisUpdatedAt)
    setSongKey(initialSongKey)
    if (initialSongKey) setLastSongKey(initialSongKey)
    savedRef.current = serialize(serverKeySets, cachedAnalysis, cachedAnalysisUpdatedAt, initialSongKey)
  }

  // --- Key set mutation handlers (all local state only) ---

  const handleAdd = useCallback(() => {
    const tempId = nextTempId--
    setKeySets(prev => [...prev, { id: tempId, position: prev.length + 1, type: 'chord', scaleDegree: null, keyPresses: [] }])
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
        scaleDegree: original.scaleDegree,
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

  const handleSetScaleDegree = useCallback((keySetId: number, degree: number | null) => {
    setKeySets(prev =>
      prev.map(ks => {
        if (ks.id !== keySetId) return ks
        return { ...ks, scaleDegree: degree }
      })
    )
  }, [])

  const handleReorder = useCallback((reorderedKeySets: KeySet[]) => {
    setKeySets(reorderedKeySets)
  }, [])

  return (
    <>
      <div className="flex items-center justify-between mb-3 h-6">
        <a
          href="/"
          onClick={(e) => {
            if (isDirty && !confirm('You have unsaved changes. Leave without saving?')) {
              e.preventDefault()
              return
            }
            e.preventDefault()
            router.push('/')
          }}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-2"
        >
          ‹ Keysets
        </a>
        <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 ${isDirty ? '' : 'invisible'}`} data-testid="save-bar">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          <span className="text-xs text-gray-400 dark:text-gray-500">Edited</span>
          {saveError && <span className="text-xs text-red-500" data-testid="save-error">{saveError}</span>}
          <button
            onClick={handleReset}
            className="px-3 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            data-testid="reset-button"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-xs font-medium rounded bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 cursor-pointer transition-colors disabled:opacity-50"
            data-testid="save-button"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
        {currentImageUrl ? (
          <img src={currentImageUrl} alt="" className="hidden sm:block w-40 h-40 object-cover rounded-lg shadow shrink-0" data-testid="album-art" />
        ) : (
          <div className="hidden sm:flex w-40 h-40 bg-gray-200 dark:bg-gray-800 rounded-lg shadow shrink-0 items-center justify-center" data-testid="album-art-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0 flex justify-between gap-3 pt-1">
          <div className="min-w-0">
            <EditableTitle initialTitle={initialTitle} onSave={async (title) => {
              await onSaveTitle(title)
              setCurrentImageUrl(null)
              refreshAlbumArt(songId, title).then((url) => {
                if (url) setCurrentImageUrl(url)
              }).catch(() => {})
            }} />
            <div className="mt-1">
              <YouTubeLink initialUrl={initialYoutubeUrl} onSave={onSaveYoutubeUrl} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <ToggleSwitch label="Compact" enabled={mode === 'compact'} onToggle={() => {
              const newMode = mode === 'compact' ? 'full' : 'compact'
              setMode(newMode)
              updateCompactView(songId, newMode === 'compact').catch(() => {})
            }} />
            {songKey !== null && (
              <ToggleSwitch label="Staff" enabled={showStaff} onToggle={() => {
                const next = !showStaff
                setShowStaff(next)
                updateShowStaff(songId, next).catch(() => {})
              }} />
            )}
            <div ref={keyPicker.containerRef} className="relative" onMouseLeave={keyPicker.onMouseLeave} onMouseEnter={() => { keyPicker.onMouseEnter(); if (songKey) keyPicker.show() }}>
              <ToggleSwitch label={songKey ? (() => { const p = parseSongKey(songKey); return p ? `${p.root} ${p.mode.charAt(0).toUpperCase() + p.mode.slice(1)}` : 'Key' })() : 'Key'} enabled={songKey !== null} onToggle={() => {
                if (songKey !== null) {
                  setSongKey(null)
                  keyPicker.hide()
                } else {
                  setSongKey(lastSongKey)
                  keyPicker.show()
                }
              }} />
              {keyPicker.open && songKey !== null && (() => {
                const parsed = parseSongKey(songKey)
                return (
                <div className="absolute right-0 top-8 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 w-56">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Root</div>
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    {ROOTS.map(r => (
                        <button key={r} className={`text-xs px-2 py-1.5 rounded transition-colors cursor-pointer ${parsed?.root === r ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-semibold' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 dark:text-gray-300'}`} onClick={() => {
                          const key = formatSongKey(r, parsed?.mode ?? 'major')
                          setSongKey(key)
                          setLastSongKey(key)
                        }}>{r}</button>
                    ))}
                  </div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Mode</div>
                  <div className="grid grid-cols-2 gap-1">
                    {MODE_NAMES.map(m => (
                        <button key={m} className={`text-xs px-2 py-1.5 rounded text-left transition-colors cursor-pointer ${parsed?.mode === m ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-semibold' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 dark:text-gray-300'}`} onClick={() => {
                          const key = formatSongKey(parsed?.root ?? 'C', m)
                          setSongKey(key)
                          setLastSongKey(key)
                        }}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>
                    ))}
                  </div>
                </div>
                )
              })()}
            </div>
            {/* Guides toggle hidden but functionality preserved */}
          </div>
        </div>
      </div>

      <SortableKeySetList
        keySets={keySets}
        compact={mode === 'compact'}
        showStaff={showStaff}
        showCommonTones={showCommonTones}
        songKey={songKey}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onToggleNote={handleToggleNote}
        onShiftNotes={handleShiftNotes}
        onToggleType={handleToggleType}
        onSetScaleDegree={handleSetScaleDegree}
        onReorder={handleReorder}
      />

      {mode !== 'compact' && (
        <SongAnalysis
          songTitle={initialTitle}
          chordDetail={buildChordDetail(keySets)}
          llmProvider={llmProvider}
          analysis={analysis}
          analysisUpdatedAt={analysisUpdatedAt}
          onAnalyze={handleAnalyze}
          onClear={handleClearAnalysis}
          onApplyKeyAndDegrees={suggestedKey || suggestedDegrees.length > 0 ? handleApplyKeyAndDegrees : undefined}
          suggestedKey={suggestedKey}
          confidence={confidence}
          loading={analysisLoading}
          error={analysisError}
        />
      )}
    </>
  )
}
