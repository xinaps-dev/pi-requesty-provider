# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.1] — 2026-08-17

### Changed

- **README.md**: Updated featured model lineup to reflect August 2026 frontier models — replaced outdated references (Claude 3.7 Sonnet, GPT-4.5, DeepSeek R1/V3, Mistral) with current flagships: Claude Fable 5, OpenAI GPT-5.6 Sol, xAI Grok 4.6, Gemini 3.7 Flash, Kimi K3, Qwen3.8 Max, DeepSeek V4 Pro, GLM-5.
- **README.md**: Documented EU (Frankfurt) regional endpoint selection in the Getting Started section.
- **README.md**: Removed obsolete `pnpm build` and `pnpm prepublishOnly` from Development scripts; updated project layout diagram.
- **package.json**: Bumped version to `1.1.1`.
- **package.json**: Switched to runtime TypeScript resolution — changed `main`/`types` from `dist/index.js` to `index.ts`, removed `dist` from `files`, updated `prepublishOnly` to run tests and typecheck instead of build.
- **package.json**: Updated peer dependency version ranges from `^0.84.0` to `^0.84`

 — 2026-08-16

### Added

- **Native Web Search Integration** — Models can now browse the live web during agent execution via Requesty's server-side web grounding. Toggle dynamically with `/requesty search native on/off`.
- **Search Module** — New `src/search/` submodule with config persistence (`~/.pi/agent/pi-requesty.json`), payload interceptor (`before_provider_request` hook), and dedicated CLI subcommands.
- **Extensible Hierarchical Command Router** — Unified `/requesty` command now supports multi-level nested autocompletion (e.g., `/requesty search native on`).
- **Smart Tool Filtering** — Automatic filtering of models lacking `supports_tools` or `supports_function_calling` capabilities, ensuring 100% agent execution compatibility.
- **Web Search Capability Detection** — `supports_web_search` flag mapped from Requesty model metadata; Gemini models excluded from native search injection to avoid conflicts with their built-in tools.
- **Architecture Diagram** — New ASCII architecture diagram in README showing the full data flow from pi CLI through the provider extension to the Requesty gateway.

### Changed

- **Modular Codebase Restructure** — Split monolithic `src/` into dedicated submodules: `src/provider/` (auth, client, commands, models, types) and `src/search/` (commands, config, interceptor, types).
- **Command Router Refactor** — Replaced flat `REQUESTY_SUBCOMMANDS` array with a dynamic registration system (`registerSubcommand` / `registerSubcommands`), supporting categories, delegated autocompletion, and nested arguments.
- **Auth Enhancement** — Login flow now prompts for region selection (US or EU) instead of manual URL entry; added `REQUESTY_ENDPOINTS` constant with labeled options.
- **Test Suite Overhaul** — Rewrote all tests to match the modular architecture; added 105 passing tests across `provider/`, `search/`, and command router modules.
- **README Documentation** — Rewrote for marketing focus: added feature badges, superpowers section, expanded command reference table, environment variables table, and metadata mapping table.

### Removed

- Flat `src/constants.ts` and `src/types.ts` — migrated into their respective submodules.
- Legacy `pnpm build` and `pnpm prepublishOnly` scripts — runtime TypeScript resolution replaces compile step.

---

## [1.0.1] — 2026-08-15

### Added

- **Discoverability Keywords** — Added `pi`, `pi-coding-agent`, `pi-extensions`, `openai-compatible`, `models`, and `provider` to `package.json` keywords for improved visibility in the pi.dev gallery.

---

## [1.0.0] — 2026-08-15

### Added

- **Initial Release** — Core provider implementation with:
  - **Requesty API Authentication** — `ApiKeyAuth` with login, resolve, and check flows; supports stored credentials and environment variable fallback (`REQUESTY_API_KEY`).
  - **Dynamic Model Discovery** — Fetches and parses the full model catalog from `GET /v1/models` at startup and on every sync.
  - **Model Transformation** — Maps Requesty model metadata (pricing tiers, context windows, reasoning/vision flags, tool calling support) to pi-native `Model` definitions.
  - **Unified `/requesty` Command** — Top-level command with `sync` (refresh model catalog) and `status` (show connection state, auth source, active model) subcommands.
  - **Fuzzy Autocomplete** — Tab-completion for all subcommands with prefix filtering.
  - **Persistent Model Cache** — Models cached in-memory and persisted via pi's provider store; restored on failure from stored cache.
  - **Error Handling** — User-friendly error messages for common API failures (401, 402, 403, 429, 5xx).
  - **Test Suite** — 40+ unit tests covering auth, commands, and model transformation.

### Changed

- **Package Metadata** — Added `author`, `license`, `repository`, `bugs`, `homepage`, peer dependency version ranges (`^0.84.0`), and `engines` field (`node >= 22.19.0`).

---

## [0.0.0] — 2026-08-15

### Added

- **Initial Commit** — Project scaffolding with `.gitignore`, `LICENSE`, README, `package.json`, `tsconfig.json`, `pnpm-workspace.yaml`, and all source files (`src/auth.ts`, `src/client.ts`, `src/commands.ts`, `src/constants.ts`, `src/index.ts`, `src/models.ts`, `src/provider.ts`, `src/types.ts`) plus initial test files.
