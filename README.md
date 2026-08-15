# pi-requesty-provider

**Requesty provider extension for [pi](https://pi.dev) coding agent** — dynamic model discovery, unified `/requesty` command, and native `/login` support.

Integrate [Requesty](https://requesty.ai), an LLM router and gateway unifying 300+ models from providers like Anthropic, OpenAI, Google Vertex, DeepSeek, xAI, Mistral, Together, and more, directly into your pi workflow.

## Features

- 🔐 **Native Authentication** — `/login requesty` and `/logout requesty` manage credentials securely in `~/.pi/agent/auth.json`
- 🔍 **Dynamic Model Discovery** — automatically fetches and maps all approved models from `GET /v1/models`
- 🧠 **Thinking & Vision Support** — reasoning models and vision-capable models are correctly flagged
- 💰 **Pricing Transparency** — per-million-token costs mapped for both direct and tiered pricing
- ⚡ **Streaming & Tool Calling** — full OpenAI-compatible streaming with SSE, thinking blocks, and tool calls
- 📦 **Single Command** — unified `/requesty [sync|status]` with autocomplete
- 🌐 **Multi-Region** — US (`router.requesty.ai`) and EU (`router.eu.requesty.ai`) endpoints

## Installation

### From npm (recommended)

```bash
pi install npm:pi-requesty-provider
```

### From GitHub

```bash
pi install git:github.com/xinaps/pi-requesty-provider
```

### Manual (local development)

```bash
# Clone and install dependencies
git clone https://github.com/xinaps/pi-requesty-provider.git
cd pi-requesty-provider
pnpm install
pnpm build

# Load locally with pi
pi -e ./
```

## Quick Start

### 1. Authenticate

```
/login requesty
```

You'll be prompted for your API key (found at [app.requesty.ai/api-keys](https://app.requesty.ai/api-keys)) and optionally the base URL.

### 2. Select a Model

```
/model
```

Models appear as `requesty/<model-id>` (e.g., `requesty/anthropic/claude-sonnet-4-5`). Use fuzzy search to filter.

### 3. Use Commands

| Command | Description |
|---------|-------------|
| `/requesty` | Show help and available subcommands |
| `/requesty sync` | Refresh the model catalog from Requesty API |
| `/requesty status` | Show authentication status, endpoint, and model count |

## Environment Variables

You can also configure Requesty without logging in:

| Variable | Description | Default |
|----------|-------------|---------|
| `REQUESTY_API_KEY` | Your Requesty API key | _(required)_ |
| `REQUESTY_BASE_URL` | Custom base URL | `https://router.requesty.ai/v1` |

## Model Capabilities

The extension automatically detects and maps the following model attributes:

| Requesty Attribute | pi Capability |
|--------------------|---------------|
| `supports_reasoning` | Thinking/reasoning mode enabled |
| `supports_vision` | Image input support (`["text", "image"]`) |
| `context_window` | Context window size in tokens |
| `max_output_tokens` | Maximum output tokens |
| `pricing[]` | Per-million-token costs (input, output, cache) |
| `supports_role_developer` | Developer role vs system role |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    pi CLI / TUI Runtime                  │
│                                                          │
│  /login requesty    /requesty     /model requesty/...   │
│  /logout requesty   [sync|status]                        │
│        │                │               │                │
│        ▼                ▼               ▼                │
│  ┌──────────────────────────────────────────────────┐   │
│  │         pi-requesty-provider Extension           │   │
│  │                                                  │   │
│  │  Auth Module    Catalog Engine    OpenAI Stream  │   │
│  │  (ApiKeyAuth)   (Model Parser)   (Completions)   │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                              │
└──────────────────────────┼──────────────────────────────┘
                           ▼
              ┌──────────────────────────────┐
              │    Requesty Router Gateway   │
              │   https://router.requesty.ai │
              ├──────────────────────────────┤
              │  GET  /v1/models             │
              │  POST /v1/chat/completions   │
              └──────────────────────────────┘
                           ▼
                 ~/.pi/agent/auth.json
```

## Development

### Prerequisites

- Node.js 20+
- pnpm 8+

### Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Compile TypeScript to dist/
pnpm typecheck        # Type-check without emitting
pnpm test             # Run vitest suite
pnpm prepublishOnly   # Build before publishing (auto-run)
```

### Project Structure

```
pi-requesty-provider/
├── src/
│   ├── index.ts          # Extension entrypoint
│   ├── provider.ts       # createProvider + model refresh
│   ├── auth.ts           # ApiKeyAuth (login/resolve/check)
│   ├── commands.ts       # /requesty command handler
│   ├── models.ts         # Requesty → pi model transformer
│   ├── client.ts         # HTTP client for Requesty API
│   ├── types.ts          # TypeScript type definitions
│   └── constants.ts      # URLs, defaults, headers
├── tests/
│   ├── models-parser.test.ts
│   ├── auth.test.ts
│   └── commands.test.ts
└── package.json
```

## License

MIT © [xinaps](https://github.com/xinaps)
