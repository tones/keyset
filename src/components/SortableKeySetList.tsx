'use client'

import { useState, useEffect } from 'react'
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
import { reorderKeySets, deleteKeySet, createKeySet, duplicateKeySet, toggleKeyPress, shiftNotes, updateKeySetType } from '@/app/song/[id]/actions'

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

interface SortableKeySetListProps {
  songId: number
  keySets: KeySet[]
}

function SortableKeySetCard({ keySet, songId, onDelete, onDuplicate, onToggleNote, onShiftNotes, onToggleType }: { keySet: KeySet; songId: number; onDelete: (id: number) => void; onDuplicate: (id: number) => void; onToggleNote: (keySetId: number, midiNote: number, color: string) => void; onShiftNotes: (keySetId: number, delta: number) => void; onToggleType: (keySetId: number) => void }) {
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR)
  const [showTranspose, setShowTranspose] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

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
              : keySet.keyPresses.length > 0 ? identifyChord(keySet.keyPresses.map((kp) => kp.midiNote)) : '\u00A0'}
          </h2>
          {keySet.keyPresses.length > 0 && (
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
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-7 h-7 flex items-center justify-center cursor-pointer transition-colors text-gray-400 hover:text-gray-600"
              title={`Brush: ${KEY_COLORS[activeColor].label}`}
              data-testid="color-toggle"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.37 2.63a2.12 2.12 0 0 1 3 3L14 13l-4 1 1-4 7.37-7.37z" />
                <path d="M9 15l-4.5 4.5a2.12 2.12 0 0 1-3-3L6 12" />
              </svg>
              <svg width="8" height="8" viewBox="0 0 8 8" className="absolute bottom-0.5 right-0.5">
                <circle cx="4" cy="4" r="4" fill={KEY_COLORS[activeColor].white} />
              </svg>
            </button>
            {showColorPicker && (
              <div className="absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3" data-testid="color-popover" onMouseLeave={() => setShowColorPicker(false)}>
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
            <div className="relative">
                <button
                  onClick={() => setShowTranspose(!showTranspose)}
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
                {showTranspose && (
                  <div className="absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[180px]" data-testid="transpose-popover" onMouseLeave={() => setShowTranspose(false)}>
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
        onToggle={(midiNote) => onToggleNote(keySet.id, midiNote, activeColor)}
      />
    </div>
  )
}

export default function SortableKeySetList({ songId, keySets: initialKeySets }: SortableKeySetListProps) {
  const [keySets, setKeySets] = useState(initialKeySets)
  useEffect(() => {
    preloadPiano()
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  async function handleAdd() {
    const newKeySet = await createKeySet(songId)
    setKeySets((prev) => [...prev, { ...newKeySet, type: 'chord', keyPresses: [] }])
  }

  async function handleDuplicate(keySetId: number) {
    const copy = await duplicateKeySet(keySetId, songId)
    setKeySets((prev) => {
      const idx = prev.findIndex((ks) => ks.id === keySetId)
      const updated = [...prev]
      updated.splice(idx + 1, 0, copy)
      return updated
    })
  }

  async function handleDelete(keySetId: number) {
    if (!confirm('Are you sure you want to delete this key set?')) return
    setKeySets((prev) => prev.filter((ks) => ks.id !== keySetId))
    await deleteKeySet(keySetId, songId)
  }

  async function handleToggleNote(keySetId: number, midiNote: number, color: string) {
    setKeySets((prev) =>
      prev.map((ks) => {
        if (ks.id !== keySetId) return ks
        const existing = ks.keyPresses.find((kp) => kp.midiNote === midiNote)
        if (existing && existing.color === color) {
          // Same color: toggle off
          return { ...ks, keyPresses: ks.keyPresses.filter((kp) => kp.midiNote !== midiNote) }
        } else if (existing) {
          // Different color: update color
          return { ...ks, keyPresses: ks.keyPresses.map((kp) => kp.midiNote === midiNote ? { ...kp, color } : kp) }
        } else {
          // New note: add with color
          return { ...ks, keyPresses: [...ks.keyPresses, { id: -Date.now(), midiNote, color }] }
        }
      })
    )
    await toggleKeyPress(keySetId, midiNote, songId, color)
  }

  async function handleShiftNotes(keySetId: number, delta: number) {
    setKeySets((prev) =>
      prev.map((ks) => {
        if (ks.id !== keySetId) return ks
        const allValid = ks.keyPresses.every((kp) => {
          const newNote = kp.midiNote + delta
          return newNote >= 0 && newNote <= 127
        })
        if (!allValid) return ks
        return { ...ks, keyPresses: ks.keyPresses.map((kp) => ({ ...kp, midiNote: kp.midiNote + delta })) }
      })
    )
    await shiftNotes(keySetId, songId, delta)
  }

  async function handleToggleType(keySetId: number) {
    setKeySets((prev) =>
      prev.map((ks) => {
        if (ks.id !== keySetId) return ks
        return { ...ks, type: ks.type === 'flourish' ? 'chord' : 'flourish' }
      })
    )
    const ks = keySets.find((ks) => ks.id === keySetId)
    const newType = ks?.type === 'flourish' ? 'chord' : 'flourish'
    await updateKeySetType(keySetId, songId, newType)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = keySets.findIndex((ks) => ks.id === active.id)
    const newIndex = keySets.findIndex((ks) => ks.id === over.id)
    const newOrder = arrayMove(keySets, oldIndex, newIndex)

    setKeySets(newOrder)
    await reorderKeySets(songId, newOrder.map((ks) => ks.id))
  }

  return (
    <>
    <DndContext id="keyset-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={keySets.map((ks) => ks.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-6">
          {keySets.map((keySet) => (
            <SortableKeySetCard key={keySet.id} keySet={keySet} songId={songId} onDelete={handleDelete} onDuplicate={handleDuplicate} onToggleNote={handleToggleNote} onShiftNotes={handleShiftNotes} onToggleType={handleToggleType} />
          ))}
        </div>
      </SortableContext>
    </DndContext>

    <button
      onClick={handleAdd}
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
