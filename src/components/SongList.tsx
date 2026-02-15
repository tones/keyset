'use client'

import Link from 'next/link'
import { deleteSong } from '@/app/actions'
import { identifyChord } from '@/lib/chordId'

interface KeyPress {
  id: number
  midiNote: number
}

interface KeySet {
  id: number
  position: number
  keyPresses: KeyPress[]
}

interface Song {
  id: number
  title: string
  keySets: KeySet[]
}

export default function SongList({ songs }: { songs: Song[] }) {
  async function handleDelete(e: React.MouseEvent, songId: number) {
    e.preventDefault()
    if (!confirm('Are you sure you want to delete this song?')) return
    await deleteSong(songId)
  }

  if (songs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No songs yet. Create your first song!</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {songs.map((song) => (
        <Link key={song.id} href={`/song/${song.id}`} className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{song.title}</h2>
            <button
              onClick={(e) => handleDelete(e, song.id)}
              className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Delete Song"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
          
          {song.keySets.length === 0 ? (
            <p className="text-sm text-gray-400">No key sets yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {song.keySets.map((keySet) => (
                <span key={keySet.id} className="inline-block bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
                  {keySet.keyPresses.length > 0 ? identifyChord(keySet.keyPresses.map(kp => kp.midiNote)) : '—'}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}
