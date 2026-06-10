// Stub for assistant command
export default {
  type: 'local-jsx',
  name: 'assistant',
  description: 'Assistant (disabled - stub)',
  immediate: false,
  load: () => Promise.resolve({ call: async () => null }),
}
