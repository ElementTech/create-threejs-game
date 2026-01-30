# create-threejs-game

Scaffold a Three.js game project with AI-assisted design documents.

## Quick Start

```bash
npx create-threejs-game my-game
cd my-game
# Add assets to public/assets/my_game/
node scripts/pipeline.js
```

## What it does

This CLI creates a Three.js game project with:

- **Three.js skills** for Claude/Codex AI assistance
- **Automation scripts** to generate:
  - Asset index (assets.json)
  - Concept mockup (via Google AI Studio)
  - Product Requirements Document (PRD)
  - Technical Design Document (TDD)
  - Implementation plan
- **Prompt templates** for each generation step

## Interactive Setup

Run without arguments for interactive mode:

```bash
npx create-threejs-game
```

You'll be asked for:
1. Project name
2. Game description (1-3 sentences)
3. API keys (optional, can configure later)

## Manual Steps

After scaffolding, you'll need to:

1. **Add your 3D assets** to `public/assets/{game_name}/`
   - Download from itch.io, Kenney.nl, Quaternius, etc.
   - GLTF format preferred

2. **Add Preview.jpg** to the assets folder
   - Most asset packs include one
   - Or screenshot your assets

3. **Configure API keys** in `scripts/config.json`:
   - Google AI Studio: for mockup generation
   - Anthropic: for PRD/TDD/plan generation

## Automated Pipeline

Once configured, run:

```bash
node scripts/pipeline.js
```

This generates all design documents automatically, leaving you with an implementation plan to follow in Claude Code or Cursor.

## Project Structure

```
my-game/
├── .claude/skills/      # Three.js skills for Claude
├── .codex/skills/       # Three.js skills for Codex
├── docs/                # Generated PRD and TDD
├── plans/               # Generated implementation plans
├── prompts/             # Manual prompt templates (fallback)
├── public/
│   └── assets/{game}/   # Your 3D assets go here
├── scripts/
│   ├── config.json      # Your configuration
│   ├── pipeline.js      # Run full automation
│   └── generate-*.js    # Individual generators
└── README.md            # Detailed workflow guide
```

## Requirements

- Node.js 18+
- API keys (for automation):
  - [Google AI Studio](https://aistudio.google.com/) - free tier available
  - [Anthropic](https://console.anthropic.com/) - API access required

## License

MIT
