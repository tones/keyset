'use client'

import { useState, useRef, useEffect } from 'react'

interface EditableTitleProps {
  initialTitle: string
  onSave: (title: string) => Promise<void>
  className?: string
  inputClassName?: string
  tag?: 'h1' | 'h2' | 'h3'
}

export default function EditableTitle({ initialTitle, onSave, className, inputClassName, tag: Tag = 'h1' }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  async function handleSave() {
    if (!title.trim() || title.trim() === initialTitle) {
      setTitle(initialTitle)
      setIsEditing(false)
      return
    }

    setSaving(true)
    try {
      await onSave(title.trim())
      setIsEditing(false)
    } catch {
      setTitle(initialTitle)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setTitle(initialTitle)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={saving}
          className={inputClassName ?? "text-3xl font-bold bg-white dark:bg-gray-800 dark:text-gray-100 border border-blue-400 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 w-full"}
        />
      </div>
    )
  }

  return (
    <Tag
      className={className ?? "text-3xl font-bold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors"}
      onClick={() => setIsEditing(true)}
      title="Click to edit title"
    >
      {title}
    </Tag>
  )
}
