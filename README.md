# create-threejs-game

Scaffold a Three.js game project with AI-assisted design documents.

## Prerequisites

Before running the CLI, have these ready:

### 1. 3D Assets (Required)
Download a GLTF asset pack from:
- [itch.io](https://itch.io/game-assets/tag-3d)
- [Kenney.nl](https://kenney.nl/assets)
- [Quaternius](https://quaternius.com/)

The CLI will ask for the path to your downloaded assets folder and validate it contains `.gltf` or `.glb` files.

### 2. Preview Image (Recommended)
Most asset packs include a `Preview.jpg`. If not, take a screenshot of your assets. This is used by the AI to generate concept mockups.

### 3. API Keys (Required for automation)
Set these as environment variables for the smoothest experience:

```bash
export GOOGLE_API_KEY="your-key"      # or GOOGLE_AI_STUDIO_API_KEY
export ANTHROPIC_API_KEY="your-key"
```

Get keys from:
- [Google AI Studio](https://aistudio.google.com/) - free tier available
- [Anthropic Console](https://console.anthropic.com/)

If not set, the CLI will prompt for them.

## Quick Start

```bash
npx create-threejs-game
```

The CLI will:
1. Ask for your **project name**
2. Ask for a **game description** (1-3 sentences describing your game)
3. Check for **API keys** (from env vars, or prompt if missing)
4. Ask for **path to your assets folder** (required for automation)
5. Validate everything and tell you if anything is missing
6. Create your project with assets copied in

Then run the automation:

```bash
cd my-game
node scripts/pipeline.js
```

## What Gets Generated

The automation pipeline creates:

| Step | Output | AI Service |
|------|--------|------------|
| Asset Index | `public/assets/{game}/assets.json` | Local script |
| Concept Mockup | `public/{game}/concept.jpg` | Google AI Studio |
| PRD | `docs/prd.md` | Claude (Anthropic) |
| TDD | `docs/tdd.md` | Claude (Anthropic) |
| Execution Plan | `plans/plan.md` | Claude (Anthropic) |

## Project Structure

```
my-game/
├── .claude/skills/      # Three.js skills for Claude
├── .codex/skills/       # Three.js skills for Codex
├── docs/                # Generated PRD and TDD
├── plans/               # Generated implementation plans
├── prompts/             # Prompt templates (fallback/reference)
├── public/
│   ├── {game}/
│   │   └── concept.jpg  # Generated mockup
│   └── assets/{game}/   # Your 3D assets (copied by CLI)
├── scripts/
│   ├── config.json      # API keys and game config
│   ├── pipeline.js      # Run full automation
│   └── generate-*.js    # Individual generators
└── README.md
```

## Final Step

After the pipeline completes, open your project in Claude Code or Cursor and follow the generated execution plan:

```
Please proceed with implementing based on the plan in plans/plan.md
```

## Requirements

- Node.js 18+
- API keys (see Prerequisites)
- 3D assets in GLTF format

## License

MIT
