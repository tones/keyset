'use client'

import Link from 'next/link'
import { deleteSong, duplicateSong } from '@/app/actions'
import { identifyChord } from '@/lib/chordId'
import type { KeySet } from '@/types'

interface Song {
  id: number
  title: string
  imageUrl: string | null
  songKey: string | null
  keySets: KeySet[]
}

export default function SongList({ songs }: { songs: Song[] }) {
  async function handleDelete(e: React.MouseEvent, songId: number) {
    e.preventDefault()
    if (!confirm('Are you sure you want to delete this song?')) return
    await deleteSong(songId)
  }

  async function handleDuplicate(e: React.MouseEvent, songId: number) {
    e.preventDefault()
    await duplicateSong(songId)
  }

  if (songs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No songs yet. Create your first song!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {songs.map((song) => (
        <Link key={song.id} href={`/song/${song.id}`} className="flex bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
          {song.imageUrl ? (
            <img src={song.imageUrl} alt="" className="w-20 h-20 object-cover shrink-0" />
          ) : (
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          )}
          <div className="flex-1 p-3 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{song.title}</h2>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <button
                onClick={(e) => handleDuplicate(e, song.id)}
                className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                title="Duplicate Song"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
              <button
                onClick={(e) => handleDelete(e, song.id)}
                className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Delete Song"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
          
          {song.keySets.length === 0 ? (
            <p className="text-xs text-gray-400">No key sets yet</p>
          ) : (
            <>
              <div className="flex gap-1 items-center">
                {song.keySets.slice(0, 4).map((keySet) => (
                  <span key={keySet.id} className={`shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${keySet.type === 'flourish' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 italic' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                    {keySet.type === 'flourish'
                      ? '♪'
                      : keySet.keyPresses.length > 0 ? identifyChord(keySet.keyPresses.map(kp => kp.midiNote), song.songKey) : '—'}
                  </span>
                ))}
                {song.keySets.length > 4 && <span className="text-[11px] text-gray-400">…</span>}
              </div>
              {song.songKey && <p className="text-[11px] text-gray-400 mt-0.5">{song.songKey.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</p>}
            </>
          )}
          </div>
        </Link>
      ))}
    </div>
  )
}
