'use server'

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

export async function analyzeSong(songId: number, songTitle: string, chordDetail: string): Promise<{ analysis: string; analysisUpdatedAt: string }> {
  if (!chordDetail.trim()) {
    return { analysis: 'No chord key sets to analyze.', analysisUpdatedAt: new Date().toISOString() }
  }

  const prompt = `You are a music theory expert. Analyze the following chord progression.

Song: "${songTitle}"

Chord progression (chord names were identified by our app from the notes):
${chordDetail}

Please provide:
1. The likely key of the song
2. A description of the chord progression and any interesting harmonic relationships (you may refine the chord names if you think our app's identification could be improved, but explain your reasoning)
3. Suggestions for the musician (voicings, extensions, substitutions, etc.)
4. What do you know specifically about "${songTitle}"?
   a. **Original recording:** Stick to facts only — album name, year, label, and musicians who played on it. No editorializing or subjective descriptions.
   b. **Chord accuracy:** Compare the chords provided above with what is generally understood or published about this song's harmony. If the chords I've entered seem wrong, incomplete, or could be improved, point that out with specifics.

Keep the response concise and practical.`

  const analysisText = LLM_PROVIDER === 'anthropic'
    ? await callAnthropic(prompt)
    : await callOpenAI(prompt)

  return { analysis: analysisText, analysisUpdatedAt: new Date().toISOString() }
}
