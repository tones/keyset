'use server'

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[midi % 12]}${octave}`
}

export async function analyzeSong(songId: number): Promise<{ analysis: string; analysisUpdatedAt: string }> {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: {
      keySets: {
        include: { keyPresses: { orderBy: { midiNote: 'asc' } } },
        orderBy: { position: 'asc' },
      },
    },
  })

  if (!song) throw new Error('Song not found')
  if (song.keySets.length === 0) {
    return { analysis: 'No key sets to analyze.', analysisUpdatedAt: new Date().toISOString() }
  }

  const description = song.keySets
    .map((ks, i) => {
      const name = ks.name || `Key Set ${ks.position}`
      const notes = ks.keyPresses.map((kp) => midiToNoteName(kp.midiNote)).join(', ')
      return `${i + 1}. "${name}": ${notes || '(no notes)'}`
    })
    .join('\n')

  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a music theory expert. Analyze the following song sections. Each section has a name and a set of notes being played simultaneously (as a chord or key set).

Song: "${song.title}"

Sections:
${description}

Please provide:
1. The likely key of the song
2. For each section, identify the chord (e.g., C major, F minor 7, G dominant 7, etc.)
3. Describe the chord progression and any interesting harmonic relationships
4. Any suggestions for the musician

Keep the response concise and practical.`,
      },
    ],
  })

  const textBlock = message.content.find((block) => block.type === 'text')
  const analysisText = textBlock?.text ?? 'No analysis available.'
  const now = new Date()

  await prisma.song.update({
    where: { id: songId },
    data: { analysis: analysisText, analysisUpdatedAt: now },
  })

  revalidatePath(`/song/${songId}`)

  return { analysis: analysisText, analysisUpdatedAt: now.toISOString() }
}
