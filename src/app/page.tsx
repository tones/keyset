export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { createSong } from './actions'
import SongList from '@/components/SongList'
import ThemeToggle from '@/components/ThemeToggle'
import { fetchAlbumArt } from '@/lib/albumArt'
import { isAuthenticated } from '@/lib/auth'
import { logout } from '@/app/login/actions'

export default async function Home() {
  const canEdit = await isAuthenticated()

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Keysets
            {process.env.NEXT_PUBLIC_GIT_SHA && (
              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-600 align-middle">{process.env.NEXT_PUBLIC_GIT_SHA}</span>
            )}
          </h1>
          <div className="flex items-center gap-2">
            {process.env.AUTH_PASSWORD && (canEdit ? (
              <form action={logout}>
                <button type="submit" className="text-xs text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors cursor-pointer" title="Sign out">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 5-5 5 5 0 0 1 5 5" /></svg>
                </button>
              </form>
            ) : (
              <a href="/login" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Sign in to edit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </a>
            ))}
            <ThemeToggle />
          </div>
        </div>
        
        <SongList songs={songs} canEdit={canEdit} />

        {canEdit && (
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
        )}
      </div>
    </div>
  )
}
