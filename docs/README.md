# Claude Code Fork

Multi-provider AI coding assistant.

## Requirements

- [Bun](https://bun.sh/) v1.1+ (recommended)
- Windows, macOS, or Linux
- Node.js >= 18 (alternative)

## Install

```bash
# Install Bun (if not installed)
npm install -g bun

# Install dependencies
bun install
# or: npm install
# or: pnpm install
```

## Start

```bash
# Start the interactive TUI (recommended)
bun run dev

# Or with npm
npm run dev
```

> **Important:** Use `bun run dev` or `npm run dev` for the TUI. `pnpm dev` will not work correctly because pnpm doesn't forward stdin to interactive terminal applications.

```bash
# Show version
bun run dev --version

# Show help
bun run dev --help
```

## Web Dashboard

```bash
# Start from within the TUI by typing:
/web

# Or start the server directly:
bun run dev:web
```

The dashboard provides:
- Project overview with git status
- Interactive file tree browser
- Session history viewer
- Token usage analytics
- Agent swarm monitoring (real-time)
- Context health dashboard
- Provider status & configuration

## Supported Providers

- **Anthropic** - Direct Claude API access
- **OpenRouter** - 300+ models from multiple providers
- **OpenAI** - GPT models
- **Google Gemini** - Gemini models
- **Ollama** - Local models (no API key needed)
- **Mistral** - Mistral AI models
- **Groq** - Fast inference
- **DeepSeek** - DeepSeek models
- **Perplexity** - Perplexity models
- **Cohere** - Cohere models
- **xAI** - Grok models

## First Run

On first run, you'll see a setup wizard to configure your provider and API key.
Configuration is stored in `~/.claude/providers.json`.

## Commands

### Core
- `/help` - Show help
- `/config` - Configuration
- `/model` - Switch AI model
- `/theme` - Change color theme
- `/compact` - Compact conversation context
- `/diff` - View changes
- `/files` - List tracked files

### AI-Powered
- `/auto` - Natural language command orchestrator
- `/batch` - Apply operations across multiple files
- `/swarm` - Multi-agent parallel execution
- `/scaffold` - Create new project from templates

### Code Review
- `/code-review` - Review code for bugs, security, performance
- `/security-review` - Security-focused review

### Git
- `/commit-gen` - Generate conventional commit messages
- `/changelog` - Auto-generate changelog
- `/branch` - Branch management

### GitHub (requires `gh` CLI)
- `/github` - Full GitHub dashboard (PRs, issues, CI, notifications)
- `/pr` - Quick PR management
- `/issue` - Quick issue management
- `/ci` - CI/workflow management

### Sessions
- `/sessions` - Browse and manage past sessions
- `/resume` - Resume a previous session
- `/agent-dashboard` - Multi-agent orchestration dashboard

### Context
- `/context-engine` - Context health dashboard
- `/token-analytics` - Token usage and cost analytics

### Management
- `/providers` - Manage AI providers
- `/provider-setup` - Configure a new provider
- `/providers switch <name>` - Switch active provider
- `/snippets` - Manage code snippets
- `/web` - Open web dashboard
