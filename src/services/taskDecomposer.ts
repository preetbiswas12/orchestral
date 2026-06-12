/**
 * Task Decomposer
 *
 * Converts natural language task descriptions into structured command chains
 * using the AI model. Understands all available commands and their capabilities.
 */

export interface CommandStep {
  command: string
  args: string
  description: string
  dependsOn?: number  // Index of step this depends on
}

export interface CommandChain {
  steps: CommandStep[]
  summary: string
  estimatedTime: string
}

// Available commands with descriptions for the AI
export const AVAILABLE_COMMANDS: Record<string, { description: string; args: string; category: string }> = {
  'code-review': {
    description: 'Review code for bugs, security, performance, and style issues',
    args: '--scope=<staged|branch|pr|file|directory> --dimension=<all|bugs|security|performance|style>',
    category: 'analysis',
  },
  'test': {
    description: 'Run the project test suite with auto-detected framework',
    args: '[--framework=<jest|vitest|pytest|go-test|cargo-test|mocha>] [--watch] [--coverage]',
    category: 'testing',
  },
  'scaffold': {
    description: 'Create a new project from templates (React, Next.js, Node, Python, Rust, Go, Vue, Svelte)',
    args: '--template=<template-name> --name=<project-name>',
    category: 'project',
  },
  'commit-gen': {
    description: 'Generate conventional commit messages from staged changes using AI',
    args: '[--scope=<scope>] [--type=<feat|fix|docs|style|refactor|perf|test|build|chore>]',
    category: 'git',
  },
  'changelog': {
    description: 'Auto-generate changelog from git history and conventional commits',
    args: '--format=<markdown|json|plain> [--since=<date|tag>]',
    category: 'git',
  },
  'batch': {
    description: 'Apply operations across multiple files (document, refactor, review, add types, generate tests)',
    args: '--op=<document|refactor|review|types|tests|custom> --files=<pattern> [--prompt=<custom-prompt>]',
    category: 'automation',
  },
  'docs': {
    description: 'Auto-generate documentation (README, API docs, JSDoc/TSDoc, architecture overview)',
    args: '--mode=<readme|api|jsdoc|architecture>',
    category: 'documentation',
  },
  'token-analytics': {
    description: 'View token usage analytics, costs, and budget tracking',
    args: '[--period=<daily|weekly|monthly>]',
    category: 'analytics',
  },
  'snippets': {
    description: 'Manage code snippets library (search, save, insert)',
    args: '--action=<list|search|add|insert> [--query=<search-term>]',
    category: 'productivity',
  },
  'sessions': {
    description: 'Browse and manage past sessions',
    args: '--action=<list|search|export|import>',
    category: 'management',
  },
  'provider-setup': {
    description: 'Configure AI providers (API keys, models, connection testing)',
    args: '[--provider=<provider-id>]',
    category: 'config',
  },
  'compact': {
    description: 'Compact conversation context to free up tokens',
    args: '[--aggressive]',
    category: 'session',
  },
  'diff': {
    description: 'View changes between working tree, staged, or branches',
    args: '[--staged] [--branch=<branch>] [--file=<path>]',
    category: 'git',
  },
  'model': {
    description: 'Switch the active AI model',
    args: '--model=<model-id> [--provider=<provider-id>]',
    category: 'config',
  },
}

/**
 * Build the system prompt for task decomposition
 */
function buildDecomposerPrompt(userTask: string): string {
  const commandList = Object.entries(AVAILABLE_COMMANDS)
    .map(([name, info]) => `- **${name}**: ${info.description}\n  Usage: \`${name} ${info.args}\``)
    .join('\n')

  return `You are a command orchestrator for Claude Code. Convert the user's natural language task into a structured command chain using ONLY the available commands.

Available Commands:
${commandList}

User Task: "${userTask}"

Respond with a JSON object in this exact format:
{
  "steps": [
    {
      "command": "<command-name>",
      "args": "<arguments>",
      "description": "<what this step does>",
      "dependsOn": null
    }
  ],
  "summary": "<one sentence summary of the plan>",
  "estimatedTime": "<rough time estimate like '10-30 seconds' or '1-2 minutes'>"
}

Rules:
1. Use ONLY the commands listed above
2. Order steps logically (e.g., review before fix, scaffold before test)
3. Add "dependsOn" (step index) when a step needs output from a previous step
4. Keep the chain short (max 5 steps)
5. If the task is simple, use just 1 step
6. If the task is ambiguous, make reasonable assumptions
7. Always include the JSON object, no markdown formatting`
}

/**
 * Parse the LLM response into a CommandChain
 */
function parseDecomposerResponse(response: string): CommandChain {
  // Try to extract JSON from the response
  const jsonMatch = response.match(/\{[\s\S]*"steps"[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse command chain from AI response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as CommandChain;
    if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      throw new Error('No steps in command chain');
    }
    return parsed;
  } catch (err) {
    throw new Error(`Failed to parse command chain: ${err}`);
  }
}

/**
 * Decompose a natural language task into a command chain.
 * This is the main entry point — it builds a prompt and uses the LLM.
 */
export async function decomposeTask(userTask: string): Promise<CommandChain> {
  const prompt = buildDecomposerPrompt(userTask);

  // For now, use a rule-based approach (no LLM call needed)
  // This can be upgraded to use the actual LLM for more complex tasks
  return ruleBasedDecompose(userTask);
}

/**
 * Rule-based task decomposition (fallback / fast path).
 * Handles common patterns without needing an LLM call.
 */
export function ruleBasedDecompose(userTask: string): CommandChain {
  const task = userTask.toLowerCase();

  // Pattern: review + fix
  if ((task.includes('review') || task.includes('check') || task.includes('audit')) &&
      (task.includes('fix') || task.includes('resolve') || task.includes('address'))) {
    const scope = task.includes('staged') ? '--scope=staged' :
                  task.includes('branch') ? '--scope=branch' :
                  task.includes('pr') || task.includes('pull request') ? '--scope=pr' :
                  '--scope=staged';
    const dim = task.includes('security') ? '--dimension=security' :
                task.includes('performance') ? '--dimension=performance' :
                task.includes('style') ? '--dimension=style' :
                '--dimension=all';
    return {
      steps: [
        { command: 'code-review', args: `${scope} ${dim}`, description: 'Review code for issues' },
        { command: 'batch', args: '--op=fix', description: 'Apply fixes to identified issues', dependsOn: 0 },
      ],
      summary: 'Review code and automatically fix identified issues',
      estimatedTime: '30-60 seconds',
    };
  }

  // Pattern: create/scaffold project
  if ((task.includes('create') || task.includes('scaffold') || task.includes('set up') || task.includes('initialize')) &&
      (task.includes('project') || task.includes('app'))) {
    const template = task.includes('react') && task.includes('next') ? 'nextjs' :
                     task.includes('react') ? 'react' :
                     task.includes('node') || task.includes('express') ? 'express' :
                     task.includes('python') || task.includes('fastapi') ? 'fastapi' :
                     task.includes('rust') ? 'rust' :
                     task.includes('go') || task.includes('golang') ? 'go' :
                     task.includes('vue') ? 'vue' :
                     task.includes('svelte') ? 'svelte' :
                     'react';
    return {
      steps: [
        { command: 'scaffold', args: `--template=${template}`, description: `Create new ${template} project` },
        { command: 'test', args: '', description: 'Run initial tests', dependsOn: 0 },
      ],
      summary: `Create a new ${template} project and verify it works`,
      estimatedTime: '10-30 seconds',
    };
  }

  // Pattern: release / changelog
  if (task.includes('release') || task.includes('changelog') || task.includes('prepare release')) {
    const steps: CommandStep[] = [];
    if (task.includes('commit') || task.includes('message')) {
      steps.push({ command: 'commit-gen', args: '', description: 'Generate commit messages' });
    }
    steps.push({ command: 'changelog', args: '--format=markdown', description: 'Generate changelog' });
    return {
      steps,
      summary: 'Prepare release artifacts',
      estimatedTime: '10-20 seconds',
    };
  }

  // Pattern: document
  if (task.includes('document') || task.includes('jsdoc') || task.includes('jsdoc') || task.includes('readme')) {
    const mode = task.includes('readme') ? 'readme' :
                 task.includes('api') ? 'api' :
                 task.includes('architecture') || task.includes('arch') ? 'architecture' :
                 task.includes('jsdoc') || task.includes('jsdoc') ? 'jsdoc' :
                 'readme';
    return {
      steps: [
        { command: 'docs', args: `--mode=${mode}`, description: `Generate ${mode} documentation` },
      ],
      summary: `Generate ${mode} documentation`,
      estimatedTime: '15-30 seconds',
    };
  }

  // Pattern: test
  if (task.includes('test') && !task.includes('add test') && !task.includes('generate test')) {
    return {
      steps: [
        { command: 'test', args: '', description: 'Run test suite' },
      ],
      summary: 'Run project tests',
      estimatedTime: '10-60 seconds',
    };
  }

  // Pattern: add tests / generate tests
  if ((task.includes('add test') || task.includes('generate test') || task.includes('write test')) &&
      (task.includes('function') || task.includes('component') || task.includes('endpoint'))) {
    return {
      steps: [
        { command: 'batch', args: '--op=tests --prompt=Generate comprehensive unit tests for all exported functions', description: 'Generate tests' },
      ],
      summary: 'Generate unit tests for the project',
      estimatedTime: '30-60 seconds',
    };
  }

  // Pattern: refactor
  if (task.includes('refactor')) {
    return {
      steps: [
        { command: 'batch', args: '--op=refactor', description: 'Refactor code for best practices' },
        { command: 'test', args: '', description: 'Verify tests still pass', dependsOn: 0 },
      ],
      summary: 'Refactor code and verify nothing broke',
      estimatedTime: '30-90 seconds',
    };
  }

  // Pattern: setup providers / configure
  if (task.includes('setup') && (task.includes('provider') || task.includes('api key') || task.includes('configure'))) {
    return {
      steps: [
        { command: 'provider-setup', args: '', description: 'Run provider configuration wizard' },
      ],
      summary: 'Configure AI providers',
      estimatedTime: 'Depends on user input',
    };
  }

  // Pattern: analytics / usage / cost
  if (task.includes('usage') || tokenPattern(task)) {
    return {
      steps: [
        { command: 'token-analytics', args: '', description: 'View usage analytics' },
      ],
      summary: 'View usage analytics and costs',
      estimatedTime: '5 seconds',
    };
  }

  // Fallback: single code-review
  return {
    steps: [
      { command: 'code-review', args: '--scope=staged --dimension=all', description: 'Review code for issues' },
    ],
    summary: 'Review staged code changes',
    estimatedTime: '15-30 seconds',
  };
}

function tokenPattern(task: string): boolean {
  return task.includes('token') || task.includes('cost') || task.includes('analytics') || task.includes('spending') || task.includes('budget');
}
