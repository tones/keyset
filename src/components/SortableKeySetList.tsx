'use client'

import { useState, useEffect } from 'react'
import { usePopover } from '@/hooks/usePopover'
import { KEY_COLORS, COLOR_NAMES, DEFAULT_COLOR, PRIMARY_COLORS } from '@/lib/colors'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import PianoKeyboard from '@/components/PianoKeyboard'
import StaffNotation, { staffWidth } from '@/components/StaffNotation'
import { identifyChord } from '@/lib/chordId'
import { playChord, preloadPiano } from '@/lib/playChord'
import { keyCenterPct, buildKeyLayout } from '@/lib/pianoLayout'
import { parseSongKey, getScalePitchClasses, getTriadPitchClasses, getTriadQuality, getTriadName } from '@/lib/scales'
import type { KeySet } from '@/types'

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const

function formatNumeral(degree: number, songKey?: string | null): string {
  const numeral = ROMAN_NUMERALS[degree - 1]
  const parsed = parseSongKey(songKey ?? null)
  if (!parsed) return numeral
  const quality = getTriadQuality(parsed.root, parsed.mode, degree)
  let formatted: string = (quality === 'minor' || quality === 'diminished') ? numeral.toLowerCase() : numeral
  if (quality === 'diminished') formatted += '°'
  return formatted
}

interface SortableKeySetListProps {
  keySets: KeySet[]
  compact?: boolean
  showStaff?: boolean
  showCommonTones?: boolean
  songKey?: string | null
  onAdd: () => void
  onDelete: (id: number) => void
  onDuplicate: (id: number) => void
  onToggleNote: (keySetId: number, midiNote: number, color: string) => void
  onShiftNotes: (keySetId: number, delta: number) => void
  onToggleType: (keySetId: number) => void
  onSetScaleDegree: (keySetId: number, degree: number | null) => void
  onRename: (keySetId: number, name: string | null) => void
  onReorder: (keySets: KeySet[]) => void
}

interface KeySetCardProps {
  keySet: KeySet
  songKey?: string | null
  showStaff?: boolean
  inKeyPitchClasses?: Set<number>
  triadPitchClasses?: Set<number>
  onDelete: (id: number) => void
  onDuplicate: (id: number) => void
  onToggleNote: (keySetId: number, midiNote: number, color: string) => void
  onShiftNotes: (keySetId: number, delta: number) => void
  onToggleType: (keySetId: number) => void
  onSetScaleDegree?: (keySetId: number, degree: number | null) => void
  onRename: (keySetId: number, name: string | null) => void
}


const defaultLayout = buildKeyLayout(36, 84)

function CommonToneLines({ above, below, padX = 24, padLeft, padRight, compact = false, visible = true }: { above: KeySet; below: KeySet; padX?: number; padLeft?: number; padRight?: number; compact?: boolean; visible?: boolean }) {
  const aboveNotes = new Set(above.keyPresses.map(kp => kp.midiNote))
  const common = below.keyPresses.filter(kp => aboveNotes.has(kp.midiNote)).map(kp => kp.midiNote)

  const h = compact ? 25 : 120
  const overlap = compact ? 0 : 38
  const bottomOverlap = compact ? 0 : 55
  const pl = padLeft ?? padX
  const pr = padRight ?? padX
  return (
    <div className="relative w-full pointer-events-none" style={{ height: h - overlap - bottomOverlap, paddingLeft: pl, paddingRight: pr, marginTop: -overlap, marginBottom: -bottomOverlap, zIndex: 3 }}>
      {visible && common.length > 0 && (
        <svg className="w-full" style={{ height: h, marginTop: -overlap }} viewBox={`0 0 1000 ${h}`} preserveAspectRatio="none">
          {common.map(note => {
            const x = keyCenterPct(note, defaultLayout) * 10
            return (
              <line
                key={note}
                x1={x} y1={0} x2={x} y2={h}
                stroke="#eab308"
                strokeWidth="3"
                strokeDasharray="5 3"
                opacity="0.8"
              />
            )
          })}
        </svg>
      )}
    </div>
  )
}

function CompactKeySetCard({ keySet, songKey, commonBelow = [], showGuides = true, showStaff = true, inKeyPitchClasses, triadPitchClasses }: { keySet: KeySet; songKey?: string | null; commonBelow?: number[]; showGuides?: boolean; showStaff?: boolean; inKeyPitchClasses?: Set<number>; triadPitchClasses?: Set<number> }) {
  const allNotes = keySet.keyPresses.map((kp) => kp.midiNote)
  const primaryPresses = keySet.keyPresses.filter(kp => PRIMARY_COLORS.has(kp.color))
  const primaryNotes = primaryPresses.map(kp => kp.midiNote)
  const chordName = identifyChord(primaryNotes, songKey)
  const displayedNotes = allNotes
  const displayedColors = Object.fromEntries(keySet.keyPresses.map(kp => [kp.midiNote, kp.color]))

  return (
    <div className={`flex items-center gap-2 px-3 py-3 ${keySet.type === 'flourish' ? 'bg-amber-50/50 dark:bg-amber-900/20' : ''}`} data-testid="keyset-card">
      <div className="w-16 shrink-0 flex flex-col items-start">
        <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-full" data-testid="chord-label">
          {keySet.name
            ? (() => { if (!keySet.scaleDegree) return keySet.name; const parsed = parseSongKey(songKey ?? null); const triadName = parsed ? getTriadName(parsed.root, parsed.mode, keySet.scaleDegree) : null; return <><span className="block">{keySet.name}</span><span className="text-blue-500 font-normal block">{formatNumeral(keySet.scaleDegree, songKey)}{triadName ? ` (${triadName})` : ''}</span></> })()
            : keySet.type === 'flourish'
            ? <span className="text-amber-600 italic">Flourish</span>
            : primaryPresses.length > 0 ? (() => { const name = identifyChord(primaryNotes, songKey); if (!keySet.scaleDegree) return name; const parsed = parseSongKey(songKey ?? null); const triadName = parsed ? getTriadName(parsed.root, parsed.mode, keySet.scaleDegree) : null; return <><span className="block">{name}</span><span className="text-blue-500 font-normal block">{formatNumeral(keySet.scaleDegree, songKey)}{triadName ? ` (${triadName})` : ''}</span></> })() : '\u00A0'}
        </h2>
        {primaryPresses.length > 0 && keySet.type !== 'flourish' && (
          <button
            onClick={() => playChord(primaryNotes)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors cursor-pointer mt-0.5"
            title="Play Chord"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex-1 min-w-0 relative">
        <PianoKeyboard
          highlightedNotes={displayedNotes}
          noteColors={displayedColors}
          inKeyPitchClasses={inKeyPitchClasses}
          triadPitchClasses={triadPitchClasses}
          showTriadSuggestions={false}
          height={50}
        />
        {showGuides && commonBelow.map(note => (
          <div key={`below-${note}`} className="absolute pointer-events-none" style={{
            left: `${keyCenterPct(note, defaultLayout)}%`,
            top: '100%',
            width: 4,
            height: 36,
            transform: 'translateX(-2px)',
            zIndex: 5,
            background: 'repeating-linear-gradient(to bottom, #f59e0b 0px, #f59e0b 4px, transparent 4px, transparent 7px)',
          }} />
        ))}
      </div>
      {showStaff && songKey && displayedNotes.length > 0 && (
        <StaffNotation midiNotes={displayedNotes} songKey={songKey} height={50} />
      )}
    </div>
  )
}

function SortableKeySetCard({ keySet, songKey, showStaff = true, inKeyPitchClasses, triadPitchClasses, onDelete, onDuplicate, onToggleNote, onShiftNotes, onToggleType, onSetScaleDegree, onRename }: KeySetCardProps) {
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR)
  const [lastDegree, setLastDegree] = useState<number | null>(keySet.scaleDegree)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const colorPicker = usePopover()
  const transposePicker = usePopover()
  const degreePicker = usePopover()

  const primaryNotes = keySet.keyPresses.filter(kp => PRIMARY_COLORS.has(kp.color)).map(kp => kp.midiNote)
  const derivedChord = keySet.type === 'flourish' ? 'Flourish' : (primaryNotes.length > 0 ? identifyChord(primaryNotes, songKey) : '')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: keySet.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`rounded-lg shadow p-6 border ${keySet.type === 'flourish' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-gray-900 border-transparent'}`} data-testid="keyset-card">
      <div className="flex items-center mb-4">
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
            title="Drag to reorder"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="7" cy="4" r="1.5" />
              <circle cx="13" cy="4" r="1.5" />
              <circle cx="7" cy="10" r="1.5" />
              <circle cx="13" cy="10" r="1.5" />
              <circle cx="7" cy="16" r="1.5" />
              <circle cx="13" cy="16" r="1.5" />
            </svg>
          </button>
          {editingName ? (
            <input
              autoFocus
              className="text-xl font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none min-w-[60px] max-w-[200px]"
              value={nameDraft}
              placeholder={derivedChord || '\u00A0'}
              onChange={e => setNameDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onRename(keySet.id, nameDraft.trim() || null); setEditingName(false) }
                if (e.key === 'Escape') setEditingName(false)
              }}
              onBlur={() => { onRename(keySet.id, nameDraft.trim() || null); setEditingName(false) }}
              data-testid="chord-label-input"
            />
          ) : (
            <h2
              className={`text-xl font-semibold cursor-text ${keySet.name ? 'text-gray-900 dark:text-gray-100' : keySet.type === 'flourish' ? 'text-amber-600 italic' : 'text-gray-900 dark:text-gray-100'}`}
              data-testid="chord-label"
              onClick={() => { setNameDraft(keySet.name ?? ''); setEditingName(true) }}
              title="Click to rename"
            >
              {keySet.name || (keySet.type === 'flourish' ? <span className="text-amber-600 italic">Flourish</span> : derivedChord || '\u00A0')}
            </h2>
          )}
          {keySet.keyPresses.length > 0 && keySet.type !== 'flourish' && (
            <button
              onClick={() => playChord(keySet.keyPresses.filter(kp => PRIMARY_COLORS.has(kp.color)).map(kp => kp.midiNote))}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
              title="Play Chord"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {inKeyPitchClasses && onSetScaleDegree && keySet.type !== 'flourish' && (
            <div ref={degreePicker.containerRef} className="relative" onMouseLeave={degreePicker.onMouseLeave} onMouseEnter={() => { degreePicker.onMouseEnter(); if (keySet.scaleDegree) degreePicker.show() }}>
              <button
                onClick={() => {
                  if (keySet.scaleDegree) {
                    setLastDegree(keySet.scaleDegree)
                    onSetScaleDegree(keySet.id, null)
                    degreePicker.hide()
                  } else if (lastDegree) {
                    onSetScaleDegree(keySet.id, lastDegree)
                    degreePicker.show()
                  } else {
                    degreePicker.toggle()
                  }
                }}
                className={`h-9 flex items-center justify-center cursor-pointer transition-colors whitespace-nowrap ${keySet.scaleDegree ? 'text-blue-500 hover:text-blue-700' : 'w-9 text-gray-400 hover:text-blue-500'}`}
                title={keySet.scaleDegree ? `Scale Degree: ${formatNumeral(keySet.scaleDegree, songKey)} (click to clear)` : 'Scale Degree'}
              >
                <span className="text-xs font-bold">{keySet.scaleDegree ? (() => { const parsed = parseSongKey(songKey ?? null); const triadName = parsed ? getTriadName(parsed.root, parsed.mode, keySet.scaleDegree) : null; return `${formatNumeral(keySet.scaleDegree, songKey)}${triadName ? ` (${triadName})` : ''}`; })() : '#'}</span>
              </button>
              {degreePicker.open && (
                <div className="absolute right-0 top-10 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Scale Degree</div>
                  <div className="flex flex-col gap-0.5">
                    {ROMAN_NUMERALS.map((_, i) => {
                      const degree = i + 1
                      const numeral = formatNumeral(degree, songKey)
                      const parsed = parseSongKey(songKey ?? null)
                      const triadName = parsed ? getTriadName(parsed.root, parsed.mode, degree) : null
                      const isActive = keySet.scaleDegree === degree
                      return (
                        <button key={degree} className={`text-xs px-2 py-1 rounded transition-colors cursor-pointer text-left ${isActive ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-semibold' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 dark:text-gray-300'}`} onClick={() => {
                          onSetScaleDegree(keySet.id, degree)
                          setLastDegree(degree)
                        }}><span className="inline-block w-6">{numeral}</span>{triadName && <span className="text-gray-400 dark:text-gray-500 ml-1">{triadName}</span>}</button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => onToggleType(keySet.id)}
            className={`w-9 h-9 flex items-center justify-center cursor-pointer transition-colors ${keySet.type === 'flourish' ? 'text-amber-500 hover:text-amber-700' : 'text-gray-400 hover:text-gray-600'}`}
            title={keySet.type === 'flourish' ? 'Switch to Chord' : 'Switch to Flourish'}
            data-testid="type-toggle"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </button>
          <div ref={colorPicker.containerRef} className="relative" onMouseLeave={colorPicker.onMouseLeave} onMouseEnter={colorPicker.onMouseEnter}>
            <button
              onClick={colorPicker.toggle}
              className="w-9 h-9 flex items-center justify-center cursor-pointer transition-colors text-gray-400 hover:text-gray-600"
              title={`Brush: ${KEY_COLORS[activeColor].label}`}
              data-testid="color-toggle"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.24-.3-.39-.65-.39-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.97-4.03-9-10-9z" />
              </svg>
              <svg width="8" height="8" viewBox="0 0 8 8" className="absolute bottom-0.5 right-0.5">
                <circle cx="4" cy="4" r="4" fill={KEY_COLORS[activeColor].white} />
              </svg>
            </button>
            {colorPicker.open && (
              <div className="absolute right-0 top-10 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3" data-testid="color-popover">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Brush Color</div>
                <div className="flex flex-col gap-1">
                  {COLOR_NAMES.map((color) => {
                    const handLabel = color === 'red' ? 'Right Hand' : color === 'blue' ? 'Left Hand' : null
                    const isActive = activeColor === color
                    return (
                      <button
                        key={color}
                        onClick={() => setActiveColor(color)}
                        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors whitespace-nowrap ${isActive ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                        title={KEY_COLORS[color].label}
                      >
                        <span className={`w-5 h-5 rounded-full shrink-0 ${isActive ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`} style={{ backgroundColor: KEY_COLORS[color].white }} />
                        <span className={`text-xs ${isActive ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                          {handLabel ?? KEY_COLORS[color].label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          {keySet.keyPresses.length > 0 && (
            <div ref={transposePicker.containerRef} className="relative" onMouseLeave={transposePicker.onMouseLeave} onMouseEnter={transposePicker.onMouseEnter}>
                <button
                  onClick={transposePicker.toggle}
                  className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                  title="Transpose"
                  data-testid="transpose-button"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 16l-4-4 4-4" />
                    <path d="M17 8l4 4-4 4" />
                    <path d="M3 12h18" />
                  </svg>
                </button>
                {transposePicker.open && (
                  <div className="absolute right-0 top-10 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[180px]" data-testid="transpose-popover">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Transpose</div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Step</span>
                      <div className="flex gap-1">
                        <button onClick={() => onShiftNotes(keySet.id, -1)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer transition-colors" title="Step Down">← 1</button>
                        <button onClick={() => onShiftNotes(keySet.id, 1)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer transition-colors" title="Step Up">1 →</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Octave</span>
                      <div className="flex gap-1">
                        <button onClick={() => onShiftNotes(keySet.id, -12)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer transition-colors" title="Octave Down">← 12</button>
                        <button onClick={() => onShiftNotes(keySet.id, 12)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer transition-colors" title="Octave Up">12 →</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
          )}
          <button
            onClick={() => onDuplicate(keySet.id)}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
            title="Duplicate Key Set"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(keySet.id)}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Delete Key Set"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <PianoKeyboard
            highlightedNotes={keySet.keyPresses.map((kp) => kp.midiNote)}
            noteColors={Object.fromEntries(keySet.keyPresses.map((kp) => [kp.midiNote, kp.color]))}
            inKeyPitchClasses={inKeyPitchClasses}
            triadPitchClasses={triadPitchClasses}
            onToggle={(midiNote) => onToggleNote(keySet.id, midiNote, activeColor)}
          />
        </div>
        {showStaff && songKey && keySet.keyPresses.length > 0 && (
          <StaffNotation midiNotes={keySet.keyPresses.map(kp => kp.midiNote)} songKey={songKey} height={110} />
        )}
      </div>
    </div>
  )
}

export default function SortableKeySetList({ keySets, compact, showStaff = true, showCommonTones = true, songKey, onAdd, onDelete, onDuplicate, onToggleNote, onShiftNotes, onToggleType, onSetScaleDegree, onRename, onReorder }: SortableKeySetListProps) {
  const parsed = parseSongKey(songKey ?? null)
  const inKeyPitchClasses = parsed ? getScalePitchClasses(parsed.root, parsed.mode) : undefined

  useEffect(() => {
    preloadPiano()
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = keySets.findIndex((ks) => ks.id === active.id)
    const newIndex = keySets.findIndex((ks) => ks.id === over.id)
    const newOrder = arrayMove(keySets, oldIndex, newIndex)
    onReorder(newOrder)
  }

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-800">
        {keySets.map((keySet, i) => {
          const belowNotes = i < keySets.length - 1 ? keySets[i + 1].keyPresses.map(kp => kp.midiNote) : []
          const myNotes = new Set(keySet.keyPresses.map(kp => kp.midiNote))
          const commonBelow = belowNotes.filter(n => myNotes.has(n))
          return (
            <CompactKeySetCard key={keySet.id} keySet={keySet} songKey={songKey} commonBelow={commonBelow} showGuides={showCommonTones} showStaff={showStaff} inKeyPitchClasses={inKeyPitchClasses} triadPitchClasses={parsed && keySet.scaleDegree ? getTriadPitchClasses(parsed.root, parsed.mode, keySet.scaleDegree) : undefined} />
          )
        })}
      </div>
    )
  }

  return (
    <>
    <DndContext id="keyset-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={keySets.map((ks) => ks.id)} strategy={verticalListSortingStrategy}>
        <div>
          {keySets.map((keySet, i) => (
            <div key={keySet.id}>
              {i > 0 && <div className="py-3"><CommonToneLines above={keySets[i - 1]} below={keySet} visible={showCommonTones} padRight={songKey && showStaff ? 24 + 8 + staffWidth(songKey, 110) : undefined} /></div>}
              <SortableKeySetCard keySet={keySet} songKey={songKey} showStaff={showStaff} inKeyPitchClasses={inKeyPitchClasses} triadPitchClasses={parsed && keySet.scaleDegree ? getTriadPitchClasses(parsed.root, parsed.mode, keySet.scaleDegree) : undefined} onDelete={onDelete} onDuplicate={onDuplicate} onToggleNote={onToggleNote} onShiftNotes={onShiftNotes} onToggleType={onToggleType} onSetScaleDegree={inKeyPitchClasses ? onSetScaleDegree : undefined} onRename={onRename} />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>

    <button
      onClick={onAdd}
      className="w-full mt-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-400 transition-colors cursor-pointer"
      title="Add Key Set"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </button>
    </>
  )
}
