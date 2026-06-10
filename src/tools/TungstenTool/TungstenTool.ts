// Stub for TungstenTool
export class TungstenTool {
  static toolName = 'Tungsten'
  
  static getDefinition() {
    return {
      name: 'Tungsten',
      description: 'Tungsten tool (disabled - stub)',
      input_schema: {
        type: 'object',
        properties: {},
      },
    }
  }
  
  async execute() {
    throw new Error('TungstenTool not available in this build')
  }
}

export default TungstenTool
