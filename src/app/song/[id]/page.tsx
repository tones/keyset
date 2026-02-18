export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import SongView from '@/components/SongView'

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <SongView
          songId={song.id}
          keySets={song.keySets}
          initialTitle={song.title}
          imageUrl={song.imageUrl}
          initialYoutubeUrl={song.youtubeUrl}
          llmProvider={process.env.LLM_PROVIDER ?? 'openai'}
          cachedAnalysis={song.analysis ?? null}
          cachedAnalysisUpdatedAt={song.analysisUpdatedAt?.toISOString() ?? null}
          initialCompact={song.compactView}
          initialShowStaff={song.showStaff}
          initialSongKey={song.songKey ?? null}
          onSaveTitle={async (title) => { 'use server'; const { updateSongTitle } = await import('./actions'); await updateSongTitle(song.id, title); }}
          onSaveYoutubeUrl={async (url) => { 'use server'; const { updateYoutubeUrl } = await import('./actions'); await updateYoutubeUrl(song.id, url); }}
        />
      </div>
    </div>
  )
}
