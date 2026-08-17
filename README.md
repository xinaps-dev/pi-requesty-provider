# pi-requesty-provider

[![npm version](https://img.shields.io/npm/v/pi-requesty-provider?color=blue&logo=npm)](https://www.npmjs.com/package/pi-requesty-provider)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![pi Extension](https://img.shields.io/badge/pi-extension-purple.svg)](https://pi.dev)

> **Unlock 300+ frontier & open-source LLMs in [pi](https://pi.dev) with native tool calling, smart reasoning, real-time pricing, and built-in web search.**

`pi-requesty-provider` seamlessly bridges [Requesty](https://requesty.ai) — the next-generation LLM router and AI gateway — directly into the **pi** coding agent. Experience Claude Fable 5, OpenAI GPT-5.6 Sol, xAI Grok 4.6, Gemini 3.7 Flash, Kimi K3, Qwen3.8 Max, DeepSeek V4 Pro, GLM-5, and hundreds more under a single unified provider.

---

## ⚡ Superpowers & Features

- 🌐 **Native Web Search Integration** — Browse the live web during agent execution without external tools. Toggle dynamically with `/requesty search native on/off` (powered by Requesty's server-side web grounding).
- 🛡️ **100% Agent-Ready (Smart Tool Filtering)** — Automatically filters out models lacking function/tool calling support. Every model in your picker is guaranteed to work reliably with `pi` tools.
- 🧠 **Deep Reasoning & Vision Support** — Automatic detection of thinking budgets, reasoning effort, and multimodal vision capabilities (`["text", "image"]`).
- 💰 **Real-Time Cost & Cache Tracking** — Precise per-million-token cost mapping, including tiered pricing, prompt caching read/write rates, and context limits.
- ⌨️ **Extensible CLI & Multi-Level Autocomplete** — Unified `/requesty` command router with dynamic categorized help, interactive nested tab-completion, and status monitoring.
- 🔐 **Native Auth & Multi-Region** — Standard `/login requesty` flow storing credentials securely in `~/.pi/agent/auth.json`, supporting US and EU endpoints.

---

## 🚀 Quick Installation

### From npm (Recommended)

```bash
pi install npm:pi-requesty-provider
```

### From GitHub

```bash
pi install git:github.com/xinaps-dev/pi-requesty-provider
```

### Local Development

```bash
# Clone and build
git clone https://github.com/xinaps-dev/pi-requesty-provider.git
cd pi-requesty-provider
pnpm install
pnpm build

# Run locally in pi
pi -e ./
```

---

## 🎯 Getting Started

### 1. Authenticate

Run the native login command inside `pi`:

```
/login requesty
```

1. Enter your API key (get one at [app.requesty.ai/api-keys](https://app.requesty.ai/api-keys)).
2. Select your regional endpoint:
   - **US (Global)**: `https://router.requesty.ai/v1` (Default)
   - **EU (Frankfurt)**: `https://router.eu.requesty.ai/v1` (GDPR compliant endpoint)

### 2. Pick Any Model

Open the model selector:

```
/model
```

All models are listed as `requesty/<model-id>` (e.g. `requesty/anthropic/claude-3-7-sonnet`, `requesty/deepseek/deepseek-r1`). Type to filter with fuzzy search.

### 3. Enable Native Web Search (Optional)

Give your models real-time web access:

```
/requesty search native on
```

---

## 🛠️ Command Reference

The `/requesty` command comes with full autocomplete and categorized subcommands:

| Command | Category | Description |
|---|---|---|
| `/requesty` | General | Show interactive help and subcommand index |
| `/requesty sync` | Provider | Fetch and refresh the active model catalog from Requesty API |
| `/requesty status` | Provider | Display connection status, active model, endpoints, and search support |
| `/requesty search native on` | Search | Enable Requesty native web search grounding (persisted) |
| `/requesty search native off` | Search | Disable Requesty native web search grounding |
| `/requesty search native status` | Search | Show web search configuration and model capability |

---

## ⚙️ Environment Variables

Prefer configuring via environment variables? Simply export:

| Variable | Description | Default |
|---|---|---|
| `REQUESTY_API_KEY` | Your Requesty API key | _(required if not logged in)_ |
| `REQUESTY_BASE_URL` | Custom gateway endpoint | `https://router.requesty.ai/v1` |

---

## 🔍 Model Metadata Mapping

The provider parses Requesty's model catalog into `pi` native capabilities:

| Requesty Attribute | pi Model Feature | Impact |
|---|---|---|
| `supports_reasoning` | `reasoning: true`, `compat.supportsReasoningEffort` | Enables thinking/reasoning blocks |
| `supports_vision` | `input: ["text", "image"]` | Allows image and multimodal inputs |
| `supports_tools` / `supports_function_calling` | Catalog filter | Ensures 100% agent execution compatibility |
| `supports_web_search` | Model capability flag | Controls native web search injection |
| `context_window` & `max_output_tokens` | `contextWindow`, `maxTokens` | Optimizes context management and limits |
| `pricing[]` / `input_price` / `caching_price` | `cost.input`, `cost.output`, `cost.tiers` | Accurate prompt and cache token cost tracking |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          pi CLI / TUI Runtime                          │
│                                                                        │
│   /login requesty    /requesty [sync|status|search]    /model requesty │
│         │                          │                          │        │
│         ▼                          ▼                          ▼        │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │                pi-requesty-provider Extension                 │    │
│   │                                                               │    │
│   │   ┌──────────────┐   ┌─────────────────┐   ┌──────────────┐   │    │
│   │   │  AuthEngine  │   │  CommandRouter  │   │  CatalogSync │   │    │
│   │   │ (ApiKeyAuth) │   │ (Multi-level AC)│   │(Model Parser)│   │    │
│   │   └──────────────┘   └─────────────────┘   └──────────────┘   │    │
│   │                               │                               │    │
│   │              ┌────────────────┴────────────────┐              │    │
│   │              │  before_provider_request Hook   │              │    │
│   │              │  (Native Web Search Injection)  │              │    │
│   │              └────────────────┬────────────────┘              │    │
│   └───────────────────────────────┼───────────────────────────────┘    │
│                                   │                                    │
└───────────────────────────────────┼────────────────────────────────────┘
                                    ▼
                     ┌──────────────────────────────┐
                     │    Requesty Router Gateway   │
                     │   https://router.requesty.ai │
                     ├──────────────────────────────┤
                     │  GET  /v1/models             │
                     │  POST /v1/chat/completions   │
                     └──────────────────────────────┘
                                    ▼
              ~/.pi/agent/auth.json  │  ~/.pi/agent/requesty.json
```

---

## 💻 Development & Contributing

### Prerequisites

- Node.js 20+
- pnpm 8+

### Scripts

```bash
pnpm install          # Install dependencies
pnpm typecheck        # Run type checking
pnpm test             # Run Vitest test suite
```

### Project Layout

```
pi-requesty-provider/
├── index.ts                  # Extension entry point & lifecycle hooks
├── src/
│   ├── commands.ts           # Unified hierarchical /requesty command router
│   ├── types.ts              # Global extension types & definitions
│   ├── constants.ts          # Extension-level constants
│   ├── provider/             # Core Provider module
│   │   ├── index.ts          # Provider factory and model caching
│   │   ├── auth.ts           # ApiKeyAuth implementation
│   │   ├── client.ts         # Requesty REST client
│   │   ├── models.ts         # Model transformer & capability mapper
│   │   ├── commands.ts       # sync & status subcommand handlers
│   │   └── types.ts          # Requesty API & Model types
│   └── search/               # Native Web Search module
│       ├── index.ts          # Search module exports
│       ├── config.ts         # Config store (~/.pi/agent/requesty.json)
│       ├── interceptor.ts    # before_provider_request payload interceptor
│       └── commands.ts       # /requesty search native subcommands
└── tests/                    # Unit and integration tests
```

---

## 📄 License

MIT © [xinaps](https://github.com/xinaps-dev)
