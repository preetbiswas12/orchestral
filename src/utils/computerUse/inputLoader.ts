import type {
  ComputerUseInput,
  ComputerUseInputAPI,
} from '../../stubs/ant-computer-use-input.js'

let cached: ComputerUseInputAPI | undefined

/**
 * Computer use input is disabled - internal Anthropic package not available.
 */
export function requireComputerUseInput(): ComputerUseInputAPI {
  throw new Error('@ant/computer-use-input is not available (internal Anthropic package)')
}
