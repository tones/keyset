'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { identifyChord } from '@/lib/chordId'
import { midiToNoteName } from '@/lib/midi'

// Switch between 'openai' and 'anthropic' via env var (default: openai)
const LLM_PROVIDER = process.env.LLM_PROVIDER ?? 'openai'

async function callOpenAI(prompt: string): Promise<string> {
  const OpenAI = (await import('openai')).default
  const client = new OpenAI()
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.choices[0]?.message?.content ?? 'No analysis available.'
}

async function callAnthropic(prompt: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  const textBlock = message.content.find((block) => block.type === 'text')
  return textBlock?.text ?? 'No analysis available.'
}

export async function clearAnalysis(songId: number): Promise<void> {
  await prisma.song.update({
    where: { id: songId },
    data: { analysis: null, analysisUpdatedAt: null },
  })
  revalidatePath(`/song/${songId}`)
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
      const midiNotes = ks.keyPresses.map((kp) => kp.midiNote)
      const notes = ks.keyPresses.map((kp) => midiToNoteName(kp.midiNote)).join(', ')
      const chordId = midiNotes.length > 0 ? identifyChord(midiNotes) : null
      return `${i + 1}. ${chordId ?? 'Key Set ' + ks.position} — notes: ${notes || 'none'}`
    })
    .join('\n')

  const prompt = `You are a music theory expert. Analyze the following chord progression.

Song: "${song.title}"

Chord progression (chord names were identified by our app from the notes):
${description}

Please provide:
1. The likely key of the song
2. A description of the chord progression and any interesting harmonic relationships (you may refine the chord names if you think our app's identification could be improved, but explain your reasoning)
3. Suggestions for the musician (voicings, extensions, substitutions, etc.)
4. What do you know specifically about "${song.title}"?
   a. **Original recording:** Stick to facts only — album name, year, label, and musicians who played on it. No editorializing or subjective descriptions.
   b. **Chord accuracy:** Compare the chords provided above with what is generally understood or published about this song's harmony. If the chords I've entered seem wrong, incomplete, or could be improved, point that out with specifics.

Keep the response concise and practical.`

  const analysisText = LLM_PROVIDER === 'anthropic'
    ? await callAnthropic(prompt)
    : await callOpenAI(prompt)

  const now = new Date()

  await prisma.song.update({
    where: { id: songId },
    data: { analysis: analysisText, analysisUpdatedAt: now },
  })

  revalidatePath(`/song/${songId}`)

  return { analysis: analysisText, analysisUpdatedAt: now.toISOString() }
}
