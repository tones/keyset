// Available key press colors
// Each entry maps a color name to its hex values for white and black keys
// mutedWhite/mutedBlack are pastel versions used for out-of-key highlighted keys in key mode
export const KEY_COLORS: Record<string, { white: string; black: string; mutedWhite: string; mutedBlack: string; label: string }> = {
  red:    { white: '#ef4444', black: '#dc2626', mutedWhite: '#fca5a5', mutedBlack: '#f87171', label: 'Red' },
  blue:   { white: '#3b82f6', black: '#2563eb', mutedWhite: '#93c5fd', mutedBlack: '#60a5fa', label: 'Blue' },
  green:  { white: '#22c55e', black: '#16a34a', mutedWhite: '#86efac', mutedBlack: '#4ade80', label: 'Green' },
  purple: { white: '#a855f7', black: '#9333ea', mutedWhite: '#d8b4fe', mutedBlack: '#c084fc', label: 'Purple' },
}

export const COLOR_NAMES = Object.keys(KEY_COLORS)
export const DEFAULT_COLOR = 'red'
