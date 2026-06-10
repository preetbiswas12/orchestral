/**
 * Stub for @anthropic-ai/foundry-sdk
 */

export class AnthropicFoundry {
  constructor(config?: any) {}
  
  messages = {
    create: async (params: any) => {
      throw new Error('Foundry SDK not available - install @anthropic-ai/foundry-sdk')
    },
    stream: async (params: any) => {
      throw new Error('Foundry SDK not available - install @anthropic-ai/foundry-sdk')
    }
  }
}

export default AnthropicFoundry
