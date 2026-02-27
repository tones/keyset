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
    model: 'claude-opus-4-6',
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
  const { requireAuth } = await import('@/lib/auth')
  await requireAuth()
  if (!chordDetail.trim()) {
    return { analysis: 'No chord key sets to analyze.', analysisUpdatedAt: new Date().toISOString(), suggestedKey: null, suggestedDegrees: [], confidence: null }
  }

  const { buildAnalysisPrompt } = await import('@/lib/analysisPrompt')
  const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const modes = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian']

  const prompt = buildAnalysisPrompt(songTitle, chordDetail, numKeySets)

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
