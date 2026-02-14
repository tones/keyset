import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { createSong } from './actions'

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
      createdAt: 'desc'
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Songs</h1>
        </div>
        
        {songs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No songs yet. Create your first song!</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {songs.map((song) => (
              <div key={song.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold">{song.title}</h2>
                  <Link 
                    href={`/song/${song.id}`}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    View →
                  </Link>
                </div>
                
                <div className="space-y-2">
                  {song.keySets.length === 0 ? (
                    <p className="text-sm text-gray-400">No key sets yet</p>
                  ) : (
                    song.keySets.map((keySet) => (
                      <div key={keySet.id} className="border-l-4 border-blue-500 pl-4">
                        <h3 className="font-medium text-gray-800">
                          {keySet.name || `Key Set ${keySet.position}`}
                        </h3>
                        <div className="text-sm text-gray-600 font-mono">
                          {keySet.keyPresses.map(kp => kp.midiNote).join(', ')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <form action={createSong}>
          <button
            type="submit"
            className="w-full mt-6 border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-400 transition-colors"
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
