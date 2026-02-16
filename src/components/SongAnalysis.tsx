'use client'

import ReactMarkdown from 'react-markdown'

interface SongAnalysisProps {
  songTitle: string
  chordDetail: string
  llmProvider: string
  analysis: string | null
  analysisUpdatedAt: string | null
  onAnalyze: () => Promise<void>
  onClear: () => void
  onApplyKeyAndDegrees?: () => void
  suggestedKey?: string | null
  confidence?: number | null
  loading: boolean
  error: string | null
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export default function SongAnalysis({ songTitle, chordDetail, llmProvider, analysis, analysisUpdatedAt, onAnalyze, onClear, onApplyKeyAndDegrees, suggestedKey, confidence, loading, error }: SongAnalysisProps) {

  return (
    <div className="mt-8">
      <button
        onClick={onAnalyze}
        disabled={loading}
        className="px-5 py-2.5 rounded-xl font-sans text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        style={{ backgroundColor: '#1a1a18', color: '#F5F5F0' }}
        onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.backgroundColor = '#393937' } }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1a1a18' }}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            Analyzing…
          </span>
        ) : `${analysis ? 'Re-analyze' : 'Analyze'} with ${llmProvider === 'anthropic' ? 'Claude' : 'ChatGPT'}`}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-4 p-6 rounded-lg shadow border font-serif" style={{ backgroundColor: '#F5F5F0', borderColor: '#DDD9CE', visibility: loading ? 'hidden' : 'visible' }}>
          <div className="float-right flex items-center gap-2 ml-4">
            {onApplyKeyAndDegrees && (
              <button
                onClick={() => {
                  if (!confirm(`Apply suggested key${suggestedKey ? ` (${suggestedKey})` : ''} and scale degrees to your key sets?${confidence != null ? ` (${confidence}% confidence)` : ''}`)) return
                  onApplyKeyAndDegrees()
                }}
                className="flex items-center gap-1 transition-colors cursor-pointer group"
                title={`Apply Key${suggestedKey ? ` (${suggestedKey})` : ''} & Scale Degrees`}
              >
                <svg className="group-hover:text-amber-500" style={{ color: '#9a9893' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
                  <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
                </svg>
                {confidence != null && (
                  <span className="text-xs font-sans font-medium group-hover:text-amber-600" style={{ color: confidence >= 80 ? '#16a34a' : confidence >= 50 ? '#d97706' : '#dc2626' }}>{confidence}%</span>
                )}
              </button>
            )}
            <button
              onClick={() => {
                const prompt = `I'm studying the song "${songTitle}". Here is the chord progression with individual notes:\n\n${chordDetail}\n\nHere is a music theory analysis that was previously generated:\n\n${analysis}\n\nI'd like to discuss the music theory of this song with you. Please help me understand the chord progressions, harmonic relationships, inversions, and any interesting patterns.`
                window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`, '_blank')
              }}
              className="transition-colors cursor-pointer" style={{ color: '#9a9893' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ae5630'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9a9893'}
              title="Discuss in Claude"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (!confirm('Delete this analysis?')) return
                onClear()
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
          <div className="prose prose-sm max-w-none" style={{ '--tw-prose-headings': '#2b2a27', '--tw-prose-body': '#393937', '--tw-prose-bold': '#1f1e1b', '--tw-prose-bullets': '#6b6a68' } as React.CSSProperties}>
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
          {analysisUpdatedAt && (
            <p className="text-sm mt-4" style={{ color: '#9a9893' }}>
              Analysis generated on {formatTimestamp(analysisUpdatedAt)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
