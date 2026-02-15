export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditableTitle from '@/components/EditableTitle'
import SongView from '@/components/SongView'
import SongAnalysis from '@/components/SongAnalysis'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const song = await prisma.song.findUnique({ where: { id: parseInt(id) } })
  return { title: song?.title ?? 'Song' }
}

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const song = await prisma.song.findUnique({
    where: { id: parseInt(id) },
    include: {
      keySets: {
        include: {
          keyPresses: true
        },
        orderBy: {
          position: 'asc'
        }
      }
    }
  })

  if (!song) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-500 hover:text-blue-700 mb-4">
            ← Back to Keysets
          </Link>
          <EditableTitle initialTitle={song.title} onSave={async (title) => { 'use server'; const { updateSongTitle } = await import('./actions'); await updateSongTitle(song.id, title); }} />
        </div>

        <SongView songId={song.id} keySets={song.keySets} />

        <SongAnalysis
          songId={song.id}
          cachedAnalysis={song.analysis}
          cachedAnalysisUpdatedAt={song.analysisUpdatedAt?.toISOString()}
        />
      </div>
    </div>
  )
}
