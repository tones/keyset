'use server'

// Switch between 'openai' and 'anthropic' via env var (default: openai)
const LLM_PROVIDER = process.env.LLM_PROVIDER ?? 'openai'

async function callOpenAI(prompt: string): Promise<string> {
  const OpenAI = (await import('openai')).default
  const client = new OpenAI()
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.choices[0]?.message?.content ?? 'No analysis available.'
}

async function callAnthropic(prompt: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })
  const textBlock = message.content.find((block) => block.type === 'text')
  return textBlock?.text ?? 'No analysis available.'
}

export interface AnalysisResult {
  analysis: string
  analysisUpdatedAt: string
  suggestedKey: string | null       // e.g. "C minor"
  suggestedDegrees: (number | null)[] // scale degrees (1-7) per keyset, null if uncertain
  confidence: number | null         // 0-100, LLM's self-assessed confidence in key & degrees
}

export async function analyzeSong(songId: number, songTitle: string, chordDetail: string, numKeySets: number): Promise<AnalysisResult> {
  if (!chordDetail.trim()) {
    return { analysis: 'No chord key sets to analyze.', analysisUpdatedAt: new Date().toISOString(), suggestedKey: null, suggestedDegrees: [], confidence: null }
  }

  const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const modes = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian']

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

Keep the response concise and practical.

IMPORTANT: After your analysis, on a new line, output EXACTLY one JSON code block with your suggested key and scale degrees for each chord. The song has ${numKeySets} chord key sets (numbered 1-${numKeySets} above). Use this exact format:
\`\`\`json
{"key": "<root> <mode>", "degrees": [<degree_or_null>, ...], "confidence": <0-100>}
\`\`\`
- "key" must use one of these roots: ${roots.join(', ')} and one of these modes: ${modes.join(', ')}. Use sharps not flats (e.g. "C# minor" not "Db minor").
- "degrees" is an array of length ${numKeySets}, one per key set in order. Each is an integer 1-7 or null if the chord doesn't fit a simple scale degree.
- "confidence" is your confidence (0-100) in the key and degree assignments being correct.`

  const rawText = LLM_PROVIDER === 'anthropic'
    ? await callAnthropic(prompt)
    : await callOpenAI(prompt)

  // Parse structured JSON from the response
  let suggestedKey: string | null = null
  let suggestedDegrees: (number | null)[] = []
  let confidence: number | null = null
  let analysisText = rawText

  const jsonMatch = rawText.match(/```json\s*\n?([\s\S]*?)\n?```/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      if (parsed.key && typeof parsed.key === 'string') {
        const [root, mode] = parsed.key.split(' ')
        if (roots.includes(root) && modes.includes(mode)) {
          suggestedKey = parsed.key
        }
      }
      if (Array.isArray(parsed.degrees)) {
        suggestedDegrees = parsed.degrees.map((d: unknown) =>
          typeof d === 'number' && d >= 1 && d <= 7 ? d : null
        )
      }
      if (typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 100) {
        confidence = Math.round(parsed.confidence)
      }
    } catch {
      // JSON parse failed — ignore, keep analysis text as-is
    }
    // Remove the JSON block from the displayed analysis
    analysisText = rawText.replace(/\n*```json\s*\n?[\s\S]*?\n?```\s*$/, '').trim()
  }

  return { analysis: analysisText, analysisUpdatedAt: new Date().toISOString(), suggestedKey, suggestedDegrees, confidence }
}
