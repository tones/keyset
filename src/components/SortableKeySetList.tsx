'use client'

import { useState, useEffect } from 'react'
import { usePopover } from '@/hooks/usePopover'
import { KEY_COLORS, COLOR_NAMES, DEFAULT_COLOR } from '@/lib/colors'
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
import { identifyChord } from '@/lib/chordId'
import { playChord, preloadPiano } from '@/lib/playChord'
import { keyCenterPct, buildKeyLayout } from '@/lib/pianoLayout'
import { parseSongKey, getScalePitchClasses, getTriadPitchClasses } from '@/lib/scales'
import type { KeySet } from '@/types'

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const

function formatDegreeLabel(chordName: string, degree: number): string {
  const numeral = ROMAN_NUMERALS[degree - 1]
  // Lowercase numeral for minor-ish chords (contains 'm' but not 'maj')
  const isMinor = /m(?!aj)/i.test(chordName)
  const formatted = isMinor ? numeral.toLowerCase() : numeral
  return `${chordName} (${formatted})`
}

interface SortableKeySetListProps {
  keySets: KeySet[]
  compact?: boolean
  showCommonTones?: boolean
  songKey?: string | null
  onAdd: () => void
  onDelete: (id: number) => void
  onDuplicate: (id: number) => void
  onToggleNote: (keySetId: number, midiNote: number, color: string) => void
  onShiftNotes: (keySetId: number, delta: number) => void
  onToggleType: (keySetId: number) => void
  onSetScaleDegree: (keySetId: number, degree: number | null) => void
  onReorder: (keySets: KeySet[]) => void
}

interface KeySetCardProps {
  keySet: KeySet
  inKeyPitchClasses?: Set<number>
  triadPitchClasses?: Set<number>
  onDelete: (id: number) => void
  onDuplicate: (id: number) => void
  onToggleNote: (keySetId: number, midiNote: number, color: string) => void
  onShiftNotes: (keySetId: number, delta: number) => void
  onToggleType: (keySetId: number) => void
  onSetScaleDegree?: (keySetId: number, degree: number | null) => void
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

function CompactKeySetCard({ keySet, commonAbove = [], commonBelow = [], showGuides = true, inKeyPitchClasses }: { keySet: KeySet; commonAbove?: number[]; commonBelow?: number[]; showGuides?: boolean; inKeyPitchClasses?: Set<number> }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-3 ${keySet.type === 'flourish' ? 'bg-amber-50/50' : ''}`} data-testid="keyset-card">
      <div className="w-16 shrink-0 flex flex-col items-start">
        <h2 className="text-xs font-semibold text-gray-900 truncate max-w-full" data-testid="chord-label">
          {keySet.type === 'flourish'
            ? <span className="text-amber-600 italic">Flourish</span>
            : keySet.keyPresses.length > 0 ? (() => { const name = identifyChord(keySet.keyPresses.map((kp) => kp.midiNote)); return keySet.scaleDegree ? formatDegreeLabel(name, keySet.scaleDegree) : name })() : '\u00A0'}
        </h2>
        {keySet.keyPresses.length > 0 && keySet.type !== 'flourish' && (
          <button
            onClick={() => playChord(keySet.keyPresses.map((kp) => kp.midiNote))}
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
          highlightedNotes={keySet.keyPresses.map((kp) => kp.midiNote)}
          noteColors={Object.fromEntries(keySet.keyPresses.map((kp) => [kp.midiNote, kp.color]))}
          inKeyPitchClasses={inKeyPitchClasses}
          height={50}
        />
        {showGuides && commonAbove.map(note => (
          <div key={`above-${note}`} className="absolute pointer-events-none" style={{
            left: `${keyCenterPct(note, defaultLayout)}%`,
            bottom: '100%',
            width: 4,
            height: 12,
            transform: 'translateX(-2px)',
            background: 'repeating-linear-gradient(to bottom, #f59e0b 0px, #f59e0b 4px, transparent 4px, transparent 7px)',
          }} />
        ))}
        {showGuides && commonBelow.map(note => (
          <div key={`below-${note}`} className="absolute pointer-events-none" style={{
            left: `${keyCenterPct(note, defaultLayout)}%`,
            top: '100%',
            width: 4,
            height: 12,
            transform: 'translateX(-2px)',
            background: 'repeating-linear-gradient(to bottom, #f59e0b 0px, #f59e0b 4px, transparent 4px, transparent 7px)',
          }} />
        ))}
      </div>
    </div>
  )
}

function SortableKeySetCard({ keySet, inKeyPitchClasses, triadPitchClasses, onDelete, onDuplicate, onToggleNote, onShiftNotes, onToggleType, onSetScaleDegree }: KeySetCardProps) {
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR)
  const [lastDegree, setLastDegree] = useState<number | null>(keySet.scaleDegree)
  const colorPicker = usePopover()
  const transposePicker = usePopover()
  const degreePicker = usePopover()

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
    <div ref={setNodeRef} style={style} className={`rounded-lg shadow p-6 border ${keySet.type === 'flourish' ? 'bg-amber-50 border-amber-200' : 'bg-white border-transparent'}`} data-testid="keyset-card">
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
          <h2 className="text-xl font-semibold text-gray-900" data-testid="chord-label">
            {keySet.type === 'flourish'
              ? <span className="text-amber-600 italic">Flourish</span>
              : keySet.keyPresses.length > 0 ? (() => { const name = identifyChord(keySet.keyPresses.map((kp) => kp.midiNote)); return keySet.scaleDegree ? formatDegreeLabel(name, keySet.scaleDegree) : name })() : '\u00A0'}
          </h2>
          {keySet.keyPresses.length > 0 && keySet.type !== 'flourish' && (
            <button
              onClick={() => playChord(keySet.keyPresses.map((kp) => kp.midiNote))}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
              title="Play Chord"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {inKeyPitchClasses && onSetScaleDegree && (
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
                className={`w-7 h-7 flex items-center justify-center cursor-pointer transition-colors ${keySet.scaleDegree ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-blue-500'}`}
                title={keySet.scaleDegree ? `Scale Degree: ${ROMAN_NUMERALS[keySet.scaleDegree - 1]} (click to clear)` : 'Scale Degree'}
              >
                <span className="text-xs font-bold">{keySet.scaleDegree ? ROMAN_NUMERALS[keySet.scaleDegree - 1] : '#'}</span>
              </button>
              {degreePicker.open && (
                <div className="absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                  <div className="text-xs font-medium text-gray-500 mb-2">Scale Degree</div>
                  <div className="flex gap-1">
                    {ROMAN_NUMERALS.map((numeral, i) => {
                      const degree = i + 1
                      const isActive = keySet.scaleDegree === degree
                      return (
                        <button key={degree} className={`text-xs px-1.5 py-1 rounded transition-colors cursor-pointer ${isActive ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-blue-50 hover:text-blue-700'}`} onClick={() => {
                          onSetScaleDegree(keySet.id, degree)
                          setLastDegree(degree)
                        }}>{numeral}</button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => onToggleType(keySet.id)}
            className={`w-7 h-7 flex items-center justify-center cursor-pointer transition-colors ${keySet.type === 'flourish' ? 'text-amber-500 hover:text-amber-700' : 'text-gray-400 hover:text-gray-600'}`}
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
              className="w-7 h-7 flex items-center justify-center cursor-pointer transition-colors text-gray-400 hover:text-gray-600"
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
              <div className="absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3" data-testid="color-popover">
                <div className="text-xs font-medium text-gray-500 mb-2">Brush Color</div>
                <div className="flex gap-1.5">
                  {COLOR_NAMES.map((color) => (
                    <button
                      key={color}
                      onClick={() => setActiveColor(color)}
                      className={`w-7 h-7 rounded-full cursor-pointer transition-all ${activeColor === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: KEY_COLORS[color].white }}
                      title={KEY_COLORS[color].label}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          {keySet.keyPresses.length > 0 && (
            <div ref={transposePicker.containerRef} className="relative" onMouseLeave={transposePicker.onMouseLeave} onMouseEnter={transposePicker.onMouseEnter}>
                <button
                  onClick={transposePicker.toggle}
                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
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
                  <div className="absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[180px]" data-testid="transpose-popover">
                    <div className="text-xs font-medium text-gray-500 mb-2">Transpose</div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">Step</span>
                      <div className="flex gap-1">
                        <button onClick={() => onShiftNotes(keySet.id, -1)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded cursor-pointer transition-colors" title="Step Down">← 1</button>
                        <button onClick={() => onShiftNotes(keySet.id, 1)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded cursor-pointer transition-colors" title="Step Up">1 →</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Octave</span>
                      <div className="flex gap-1">
                        <button onClick={() => onShiftNotes(keySet.id, -12)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded cursor-pointer transition-colors" title="Octave Down">← 12</button>
                        <button onClick={() => onShiftNotes(keySet.id, 12)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded cursor-pointer transition-colors" title="Octave Up">12 →</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
          )}
          <button
            onClick={() => onDuplicate(keySet.id)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
            title="Duplicate Key Set"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(keySet.id)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
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

      <PianoKeyboard
        highlightedNotes={keySet.keyPresses.map((kp) => kp.midiNote)}
        noteColors={Object.fromEntries(keySet.keyPresses.map((kp) => [kp.midiNote, kp.color]))}
        inKeyPitchClasses={inKeyPitchClasses}
        triadPitchClasses={triadPitchClasses}
        onToggle={(midiNote) => onToggleNote(keySet.id, midiNote, activeColor)}
      />
    </div>
  )
}

export default function SortableKeySetList({ keySets, compact, showCommonTones = true, songKey, onAdd, onDelete, onDuplicate, onToggleNote, onShiftNotes, onToggleType, onSetScaleDegree, onReorder }: SortableKeySetListProps) {
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
      <div className="bg-white rounded-lg shadow overflow-hidden divide-y divide-gray-200">
        {keySets.map((keySet, i) => {
          const aboveNotes = i > 0 ? keySets[i - 1].keyPresses.map(kp => kp.midiNote) : []
          const belowNotes = i < keySets.length - 1 ? keySets[i + 1].keyPresses.map(kp => kp.midiNote) : []
          const myNotes = new Set(keySet.keyPresses.map(kp => kp.midiNote))
          const commonAbove = aboveNotes.filter(n => myNotes.has(n))
          const commonBelow = belowNotes.filter(n => myNotes.has(n))
          return (
            <CompactKeySetCard key={keySet.id} keySet={keySet} commonAbove={commonAbove} commonBelow={commonBelow} showGuides={showCommonTones} inKeyPitchClasses={inKeyPitchClasses} />
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
              {i > 0 && <div className="py-3"><CommonToneLines above={keySets[i - 1]} below={keySet} visible={showCommonTones} /></div>}
              <SortableKeySetCard keySet={keySet} inKeyPitchClasses={inKeyPitchClasses} triadPitchClasses={parsed && keySet.scaleDegree ? getTriadPitchClasses(parsed.root, parsed.mode, keySet.scaleDegree) : undefined} onDelete={onDelete} onDuplicate={onDuplicate} onToggleNote={onToggleNote} onShiftNotes={onShiftNotes} onToggleType={onToggleType} onSetScaleDegree={inKeyPitchClasses ? onSetScaleDegree : undefined} />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>

    <button
      onClick={onAdd}
      className="w-full mt-6 border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-400 transition-colors cursor-pointer"
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
