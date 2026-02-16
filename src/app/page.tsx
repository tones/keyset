export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { createSong } from './actions'
import SongList from '@/components/SongList'
import ThemeToggle from '@/components/ThemeToggle'
import { fetchAlbumArt } from '@/lib/albumArt'

export default async function Home() {
  // Get all songs with their key sets from database
  const songs = await prisma.song.findMany({
    include: {
      keySets: {
        include: {
          keyPresses: true
        },
        orderBy: {
          position: 'asc'
        }
      }
    },
    orderBy: {
      title: 'asc'
    }
  })

  // Fetch album art for songs that don't have it yet
  const songsNeedingArt = songs.filter(s => !s.imageUrl && s.title !== 'Untitled Song')
  if (songsNeedingArt.length > 0) {
    await Promise.allSettled(
      songsNeedingArt.map(async (song) => {
        try {
          const url = await fetchAlbumArt(song.title)
          if (url) {
            await prisma.song.update({ where: { id: song.id }, data: { imageUrl: url } })
            song.imageUrl = url
          }
        } catch {}
      })
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Keysets</h1>
          <ThemeToggle />
        </div>
        
        <SongList songs={songs} />

        <form action={createSong}>
          <button
            type="submit"
            className="w-full mt-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-400 transition-colors cursor-pointer"
            title="Add Song"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
