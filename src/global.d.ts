/**
 * Global TypeScript declarations
 */

// MACRO is injected at build time by the bundler
declare const MACRO: {
  VERSION: string
  BUILD_TIME?: string
  VERSION_CHANGELOG?: Array<{
    version: string
    date: string
    changes: string[]
  }>
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test'
      USER_TYPE?: 'ant' | 'external'
      CLAUDE_CODE_ENABLE_CFC?: string
      CLAUDE_CODE_STREAM_CLOSE_TIMEOUT?: string
      ANTHROPIC_API_KEY?: string
      OPENAI_API_KEY?: string
      GEMINI_API_KEY?: string
      OPENROUTER_API_KEY?: string
      [key: string]: string | undefined
    }
  }
}

export {}
