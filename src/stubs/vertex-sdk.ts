/**
 * Stub for @anthropic-ai/vertex-sdk
 */

export class AnthropicVertex {
  constructor(config?: any) {}
  
  messages = {
    create: async (params: any) => {
      throw new Error('Vertex SDK not available - install @anthropic-ai/vertex-sdk')
    },
    stream: async (params: any) => {
      throw new Error('Vertex SDK not available - install @anthropic-ai/vertex-sdk')
    }
  }
}

export default AnthropicVertex
