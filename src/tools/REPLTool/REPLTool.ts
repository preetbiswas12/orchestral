// Stub for REPLTool
export class REPLTool {
  static toolName = 'REPL'
  
  static getDefinition() {
    return {
      name: 'REPL',
      description: 'Interactive REPL (disabled - stub)',
      input_schema: {
        type: 'object',
        properties: {},
      },
    }
  }
  
  async execute() {
    throw new Error('REPLTool not available in this build')
  }
}

export default REPLTool
