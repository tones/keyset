export interface KeyPress {
  id: number
  midiNote: number
  color: string
}

export interface KeySet {
  id: number
  position: number
  type: string
  scaleDegree: number | null
  keyPresses: KeyPress[]
}
