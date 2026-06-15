# Open Claude Code

Modified fork with multi-provider support and no telemetry.

## Quick Start

```bash
# Install dependencies
bun install

# Start the TUI (interactive mode)
bun run dev

# Or with npm
npm run dev
```

> **Note:** This is a TUI (terminal UI) application. Use `bun run dev` or `npm run dev`.
> `pnpm dev` may not work correctly because pnpm doesn't forward stdin to interactive TUI processes.

Choose a provider (OpenRouter recommended) and enter your API key.

## Running the Web Dashboard

```bash
# From within the TUI, type:
/web

# Or start the dashboard server directly:
bun run dev:web
```

The dashboard will be available at `http://127.0.0.1:3456`.

## Documentation

See `docs/README.md`

## Features

- Multi-provider support (Anthropic, OpenRouter, OpenAI, Gemini, Ollama, Mistral, Groq, DeepSeek, Perplexity, Cohere, xAI)
- No telemetry
- Custom Git-based updates
- API key authentication (no OAuth)
- Agent swarming system (parallel multi-agent execution)
- Context engine with health monitoring
- Web dashboard with real-time updates
- GitHub integration (requires `gh` CLI)

## Commands

- `/providers` - Manage AI providers
- `/providers switch <name>` - Switch active provider
- `/update` - Check for updates
- `/help` - Show all commands
- `/web` - Open the web dashboard
- `/github` - GitHub integration (PRs, issues, CI)
- `/swarm` - Multi-agent parallel execution
- `/auto` - AI-powered command orchestrator
- `/batch` - Apply operations across multiple files
- `/scaffold` - Create new projects from templates
