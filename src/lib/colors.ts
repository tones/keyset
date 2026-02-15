// Available key press colors
// Each entry maps a color name to its hex values for white and black keys
export const KEY_COLORS: Record<string, { white: string; black: string; label: string }> = {
  red:    { white: '#ef4444', black: '#dc2626', label: 'Red' },
  blue:   { white: '#3b82f6', black: '#2563eb', label: 'Blue' },
  green:  { white: '#22c55e', black: '#16a34a', label: 'Green' },
  purple: { white: '#a855f7', black: '#9333ea', label: 'Purple' },
}

export const COLOR_NAMES = Object.keys(KEY_COLORS)
export const DEFAULT_COLOR = 'red'
