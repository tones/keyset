export interface KeyPress {
  id: number
  midiNote: number
  color: string
}

export interface KeySet {
  id: number
  position: number
  type: string
  name: string | null
  scaleDegree: number | null
  keyPresses: KeyPress[]
}
