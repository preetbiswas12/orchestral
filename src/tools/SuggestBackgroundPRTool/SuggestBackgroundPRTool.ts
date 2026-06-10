// Stub for SuggestBackgroundPRTool
export class SuggestBackgroundPRTool {
  static toolName = 'SuggestBackgroundPR'
  
  static getDefinition() {
    return {
      name: 'SuggestBackgroundPR',
      description: 'Suggest background PR (disabled - stub)',
      input_schema: {
        type: 'object',
        properties: {},
      },
    }
  }
  
  async execute() {
    throw new Error('SuggestBackgroundPRTool not available in this build')
  }
}

export default SuggestBackgroundPRTool
