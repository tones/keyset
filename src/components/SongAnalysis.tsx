'use client'

import { useState } from 'react'
import { analyzeSong } from '@/app/song/[id]/analyze'

interface SongAnalysisProps {
  songId: number
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

export default function SongAnalysis({ songId, cachedAnalysis, cachedAnalysisUpdatedAt }: SongAnalysisProps) {
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
        {loading ? 'Analyzing...' : analysis ? 'Re-analyze Song' : 'Analyze Song'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-4 p-6 bg-white rounded-lg shadow border border-purple-100">
          {analysisUpdatedAt && (
            <p className="text-sm text-gray-400 mb-3">
              Analysis generated on {formatTimestamp(analysisUpdatedAt)}
            </p>
          )}
          <h3 className="text-lg font-semibold text-purple-900 mb-3">Music Theory Analysis</h3>
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {analysis}
          </div>
        </div>
      )}
    </div>
  )
}
