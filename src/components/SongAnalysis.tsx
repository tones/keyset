'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { analyzeSong, clearAnalysis } from '@/app/song/[id]/analyze'

interface SongAnalysisProps {
  songId: number
  songTitle: string
  chordSummary: string
  llmProvider: string
  cachedAnalysis?: string | null
  cachedAnalysisUpdatedAt?: string | null
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function SongAnalysis({ songId, songTitle, chordSummary, llmProvider, cachedAnalysis, cachedAnalysisUpdatedAt }: SongAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(cachedAnalysis ?? null)
  const [analysisUpdatedAt, setAnalysisUpdatedAt] = useState<string | null>(cachedAnalysisUpdatedAt ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    setLoading(true)
    setError(null)
    try {
      const result = await analyzeSong(songId)
      setAnalysis(result.analysis)
      setAnalysisUpdatedAt(result.analysisUpdatedAt)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8">
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Analyzing...' : `${analysis ? 'Re-analyze' : 'Analyze'} with ${llmProvider === 'anthropic' ? 'Claude' : 'ChatGPT'}`}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-4 p-6 bg-white rounded-lg shadow border border-purple-100">
          <div className="flex justify-between items-start mb-3">
            <div>
              {analysisUpdatedAt && (
                <p className="text-sm text-gray-400">
                  Analysis generated on {formatTimestamp(analysisUpdatedAt)}
                </p>
              )}
              <h3 className="text-lg font-semibold text-purple-900">Music Theory Analysis</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const prompt = `I'm studying the song "${songTitle}". Here are the chords: ${chordSummary}\n\nHere is a music theory analysis that was previously generated:\n\n${analysis}\n\nI'd like to discuss the music theory of this song with you. Please help me understand the chord progressions, harmonic relationships, and any interesting patterns.`
                  window.open(`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`, '_blank')
                }}
                className="text-gray-400 hover:text-purple-500 transition-colors cursor-pointer"
                title="Discuss in ChatGPT"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Delete this analysis?')) return
                  setAnalysis(null)
                  setAnalysisUpdatedAt(null)
                  await clearAnalysis(songId)
                }}
                className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Delete Analysis"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
          <div className="prose prose-sm prose-purple max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
