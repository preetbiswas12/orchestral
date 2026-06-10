/**
 * Stub for @ant/computer-use-input
 * This is an internal Anthropic package not available publicly (Rust/enigo based)
 */

export interface ComputerUseInputAPI {
  click: (x: number, y: number) => void
  doubleClick: (x: number, y: number) => void
  type: (text: string) => void
  key: (key: string) => void
  keys: (keys: string[]) => void
  scroll: (x: number, y: number, amount: number) => void
  moveMouse: (x: number, y: number) => void
  getFrontmostApp: () => string | null
  isSupported: true
}

export interface ComputerUseInputUnsupported {
  isSupported: false
}

export type ComputerUseInput = ComputerUseInputAPI | ComputerUseInputUnsupported

export function getComputerUseInput(): ComputerUseInput {
  return { isSupported: false }
}
