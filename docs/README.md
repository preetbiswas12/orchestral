# Claude Code Fork

Multi-provider AI coding assistant.

## Requirements

- [Bun](https://bun.sh/) v1.1+
- Windows, macOS, or Linux

## Install

```bash
# Install Bun (if not installed)
npm install -g bun

# Install dependencies
bun install or npm install
```

## Start

````bash
# Start
bun run start or npm start

## Run

```bash
# Development mode
bun run dev

# Show version
bun run dev --version

# Show help
bun run dev --help
````

## Supported Providers

- **Anthropic** - Direct Claude API access
- **OpenRouter** - 300+ models from multiple providers
- **OpenAI** - GPT models
- **Google Gemini** - Gemini models
- **Ollama** - Local models (no API key needed)

## First Run

On first run, you'll see a setup wizard to configure your provider and API key.
Configuration is stored in `~/.claude/providers.json`.

## Commands

- `/providers` - Manage AI providers
- `/update` - Check for updates
- `/help` - Show help
