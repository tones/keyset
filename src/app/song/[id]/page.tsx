export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SongView from '@/components/SongView'
import SongAnalysis from '@/components/SongAnalysis'
import { identifyChord } from '@/lib/chordId'
import { midiToNoteName } from '@/lib/midi'

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
        <Link href="/" className="text-blue-500 hover:text-blue-700 text-sm">
          ← Back to Keysets
        </Link>

        <SongView
          songId={song.id}
          keySets={song.keySets}
          initialTitle={song.title}
          initialYoutubeUrl={song.youtubeUrl}
          onSaveTitle={async (title) => { 'use server'; const { updateSongTitle } = await import('./actions'); await updateSongTitle(song.id, title); }}
          onSaveYoutubeUrl={async (url) => { 'use server'; const { updateYoutubeUrl } = await import('./actions'); await updateYoutubeUrl(song.id, url); }}
        />

        <SongAnalysis
          songId={song.id}
          songTitle={song.title}
          chordDetail={song.keySets.filter((ks) => ks.type !== 'flourish').map((ks, i) => {
            const notes = ks.keyPresses.map((kp) => midiToNoteName(kp.midiNote)).join(', ')
            const chordName = ks.keyPresses.length > 0 ? identifyChord(ks.keyPresses.map((kp) => kp.midiNote)) : '(empty)'
            return `${i + 1}. ${chordName} — notes: ${notes || 'none'}`
          }).join('\n')}
          llmProvider={process.env.LLM_PROVIDER ?? 'openai'}
          cachedAnalysis={song.analysis}
          cachedAnalysisUpdatedAt={song.analysisUpdatedAt?.toISOString()}
        />
      </div>
    </div>
  )
}
