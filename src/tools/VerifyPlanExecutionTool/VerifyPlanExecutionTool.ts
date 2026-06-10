// Stub for VerifyPlanExecutionTool
export class VerifyPlanExecutionTool {
  static toolName = 'VerifyPlanExecution'
  
  static getDefinition() {
    return {
      name: 'VerifyPlanExecution',
      description: 'Verify plan execution (disabled - stub)',
      input_schema: {
        type: 'object',
        properties: {},
      },
    }
  }
  
  async execute() {
    throw new Error('VerifyPlanExecutionTool not available in this build')
  }
}

export default VerifyPlanExecutionTool
