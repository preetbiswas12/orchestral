/**
 * Stub for @anthropic-ai/bedrock-sdk
 */

export class AnthropicBedrock {
  constructor(config?: any) {}
  
  messages = {
    create: async (params: any) => {
      throw new Error('Bedrock SDK not available - install @anthropic-ai/bedrock-sdk')
    },
    stream: async (params: any) => {
      throw new Error('Bedrock SDK not available - install @anthropic-ai/bedrock-sdk')
    }
  }
}

export default AnthropicBedrock
