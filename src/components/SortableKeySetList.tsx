'use client'

import { useState, useEffect } from 'react'
import { KEY_COLORS, DEFAULT_COLOR } from '@/lib/colors'
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
import { reorderKeySets, deleteKeySet, createKeySet, toggleKeyPress, shiftOctave, updateKeySetType } from '@/app/song/[id]/actions'

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

function SortableKeySetCard({ keySet, songId, onDelete, onToggleNote, onShiftOctave, onToggleType }: { keySet: KeySet; songId: number; onDelete: (id: number) => void; onToggleNote: (keySetId: number, midiNote: number, color: string) => void; onShiftOctave: (keySetId: number, direction: 'up' | 'down') => void; onToggleType: (keySetId: number) => void }) {
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR)
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
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => onToggleType(keySet.id)}
            className={`cursor-pointer transition-colors text-xs font-medium px-2 py-0.5 rounded-full ${keySet.type === 'flourish' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            title={keySet.type === 'flourish' ? 'Switch to Chord' : 'Switch to Flourish'}
            data-testid="type-toggle"
          >
            {keySet.type === 'flourish' ? '♪' : '♫'}
          </button>
          <button
            onClick={() => setActiveColor(activeColor === 'red' ? 'blue' : 'red')}
            className="cursor-pointer transition-all hover:scale-110"
            title={`Color: ${activeColor === 'red' ? 'Red' : 'Blue'} (click to toggle)`}
            data-testid="color-toggle"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" fill={KEY_COLORS[activeColor].white} />
            </svg>
          </button>
          {keySet.keyPresses.length > 0 && (
            <>
              <button
                onClick={() => playChord(keySet.keyPresses.map((kp) => kp.midiNote))}
                className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                title="Play Chord"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <button
                onClick={() => onShiftOctave(keySet.id, 'down')}
                className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                title="Octave Down"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14" />
                  <path d="M19 12l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={() => onShiftOctave(keySet.id, 'up')}
                className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                title="Octave Up"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
              </button>
            </>
          )}
          <button
            onClick={() => onDelete(keySet.id)}
            className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Delete Key Set"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  async function handleShiftOctave(keySetId: number, direction: 'up' | 'down') {
    const delta = direction === 'up' ? 12 : -12
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
    await shiftOctave(keySetId, songId, direction)
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={keySets.map((ks) => ks.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-6">
          {keySets.map((keySet) => (
            <SortableKeySetCard key={keySet.id} keySet={keySet} songId={songId} onDelete={handleDelete} onToggleNote={handleToggleNote} onShiftOctave={handleShiftOctave} onToggleType={handleToggleType} />
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
