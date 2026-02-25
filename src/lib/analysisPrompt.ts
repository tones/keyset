const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const modes = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian']

function basePrompt(songTitle: string, chordDetail: string): string {
  return `You are a music theory expert. Analyze the following chord progression.

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
}

export function buildAnalysisPrompt(songTitle: string, chordDetail: string, numKeySets: number): string {
  return basePrompt(songTitle, chordDetail) + `

IMPORTANT: After your analysis, on a new line, output EXACTLY one JSON code block with your suggested key and scale degrees for each chord. The song has ${numKeySets} chord key sets (numbered 1-${numKeySets} above). Use this exact format:
\`\`\`json
{"key": "<root> <mode>", "degrees": [<degree_or_null>, ...], "confidence": <0-100>}
\`\`\`
- "key" must use one of these roots: ${roots.join(', ')} and one of these modes: ${modes.join(', ')}. Use sharps not flats (e.g. "C# minor" not "Db minor").
- "degrees" is an array of length ${numKeySets}, one per key set in order. Each is an integer 1-7 or null if the chord doesn't fit a simple scale degree.
- "confidence" is your confidence (0-100) in the key and degree assignments being correct.`
}

export function buildChatPrompt(songTitle: string, chordDetail: string): string {
  return basePrompt(songTitle, chordDetail)
}
