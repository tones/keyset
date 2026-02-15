'use client'

import { useState } from 'react'

interface YouTubeLinkProps {
  initialUrl: string | null
  onSave: (url: string | null) => Promise<void>
}

export default function YouTubeLink({ initialUrl, onSave }: YouTubeLinkProps) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [editing, setEditing] = useState(false)

  async function handleSave() {
    const trimmed = url.trim()
    await onSave(trimmed || null)
    setUrl(trimmed)
    setEditing(false)
  }

  function handleCancel() {
    setUrl(initialUrl ?? '')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 shrink-0">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.55 12 19.55 12 19.55s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.42z" />
          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
        </svg>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
          placeholder="Paste YouTube URL..."
          className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-400"
          autoFocus
        />
        <button onClick={handleSave} className="text-sm text-blue-500 hover:text-blue-700 cursor-pointer">Save</button>
        <button onClick={handleCancel} className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer">Cancel</button>
      </div>
    )
  }

  if (url) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
          title="Open in YouTube"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.55 12 19.55 12 19.55s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.42z" />
            <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
          </svg>
          YouTube
        </a>
        <button
          onClick={() => setEditing(true)}
          className="text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
          title="Edit YouTube link"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
      title="Add YouTube link"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.55 12 19.55 12 19.55s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.42z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
      </svg>
      Add YouTube link
    </button>
  )
}
