'use client'

import { useState } from 'react'
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
import EditableTitle from '@/components/EditableTitle'
import { reorderKeySets, deleteKeySet, createKeySet, toggleKeyPress, updateKeySetName } from '@/app/song/[id]/actions'

interface KeyPress {
  id: number
  midiNote: number
}

interface KeySet {
  id: number
  name: string | null
  position: number
  keyPresses: KeyPress[]
}

interface SortableKeySetListProps {
  songId: number
  keySets: KeySet[]
}

function SortableKeySetCard({ keySet, songId, onDelete, onToggleNote, onRename }: { keySet: KeySet; songId: number; onDelete: (id: number) => void; onToggleNote: (keySetId: number, midiNote: number) => void; onRename: (keySetId: number, name: string) => Promise<void> }) {
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
    <div ref={setNodeRef} style={style} className="bg-white rounded-lg shadow p-6" data-testid="keyset-card">
      <div className="flex justify-between items-center mb-4">
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
          <EditableTitle
            initialTitle={keySet.name || `Key Set ${keySet.position}`}
            onSave={(name) => onRename(keySet.id, name)}
            tag="h2"
            className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-gray-600 transition-colors"
            inputClassName="text-xl font-semibold bg-white border border-blue-400 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
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
        onToggle={(midiNote) => onToggleNote(keySet.id, midiNote)}
      />
    </div>
  )
}

export default function SortableKeySetList({ songId, keySets: initialKeySets }: SortableKeySetListProps) {
  const [keySets, setKeySets] = useState(initialKeySets)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  async function handleAdd() {
    const newKeySet = await createKeySet(songId)
    setKeySets((prev) => [...prev, { ...newKeySet, keyPresses: [] }])
  }

  async function handleDelete(keySetId: number) {
    if (!confirm('Are you sure you want to delete this key set?')) return
    setKeySets((prev) => prev.filter((ks) => ks.id !== keySetId))
    await deleteKeySet(keySetId, songId)
  }

  async function handleRename(keySetId: number, name: string) {
    setKeySets((prev) =>
      prev.map((ks) => (ks.id === keySetId ? { ...ks, name } : ks))
    )
    await updateKeySetName(keySetId, name, songId)
  }

  async function handleToggleNote(keySetId: number, midiNote: number) {
    setKeySets((prev) =>
      prev.map((ks) => {
        if (ks.id !== keySetId) return ks
        const hasNote = ks.keyPresses.some((kp) => kp.midiNote === midiNote)
        return {
          ...ks,
          keyPresses: hasNote
            ? ks.keyPresses.filter((kp) => kp.midiNote !== midiNote)
            : [...ks.keyPresses, { id: -Date.now(), midiNote }],
        }
      })
    )
    await toggleKeyPress(keySetId, midiNote, songId)
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
            <SortableKeySetCard key={keySet.id} keySet={keySet} songId={songId} onDelete={handleDelete} onToggleNote={handleToggleNote} onRename={handleRename} />
          ))}
        </div>
      </SortableContext>
    </DndContext>

    <button
      onClick={handleAdd}
      className="w-full mt-6 border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-400 transition-colors"
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
