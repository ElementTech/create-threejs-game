# Three.js Game Vibe Coding Template

A structured methodology for rapidly prototyping 3D games in Three.js using AI-assisted development.

## Quick Start (Automated Pipeline)

```bash
# 1. Copy template and rename to your game
cp -r template/ my_game/
cd my_game/

# 2. Add your assets to public/assets/{game_name}/

# 3. Configure API keys and game details
cp scripts/config.example.json scripts/config.json
# Edit config.json with your keys and game description

# 4. Run the full pipeline
node scripts/pipeline.js

# 5. Implement with Claude Code using the generated plan
```

---

## Prerequisites Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| `.claude/skills/` with Three.js skills | ✅ Included | 10 skill files for Claude |
| `.codex/skills/` with Three.js skills | ✅ Included | 10 skill files for Codex |
| Google AI Studio API key | ❌ **YOU PROVIDE** | For mockup generation |
| Anthropic API key | ❌ **YOU PROVIDE** | For PRD/TDD/Plan generation |
| Game description | ❌ **YOU PROVIDE** | 1-3 sentence description |
| Asset pack (GLTF preferred) | ❌ **YOU PROVIDE** | Find on itch.io, Kenney, etc. |

---

## API Setup

### Google AI Studio (for mockup generation)
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Get an API key
3. Add to `scripts/config.json` under `google_ai_studio.api_key`

### Anthropic (for document generation)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Get an API key
3. Add to `scripts/config.json` under `anthropic.api_key`

---

## Automated Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `pipeline.js` | Run full pipeline | `node scripts/pipeline.js` |
| `generate-assets-json.js` | Index assets | `node scripts/generate-assets-json.js {name}` |
| `generate-mockup.js` | Create concept art | `node scripts/generate-mockup.js` |
| `generate-prd.js` | Create PRD | `node scripts/generate-prd.js` |
| `generate-tdd.js` | Create TDD | `node scripts/generate-tdd.js` |
| `generate-plan.js` | Create execution plan | `node scripts/generate-plan.js` |

### Pipeline Options
```bash
# Run full pipeline
node scripts/pipeline.js

# Skip mockup generation (use existing concept.jpg)
node scripts/pipeline.js --skip-mockup

# Skip to specific step
node scripts/pipeline.js --skip-to=prd

# Use specific plan name
node scripts/pipeline.js --plan-name=my-plan
```

---

## Workflow Steps

### Legend
- 🤖 **Automated** - Can be done with scripts/tools
- 🖐️ **Manual** - Requires human action
- 🤝 **AI-Assisted** - LLM generates, human reviews

---

## Phase 1: Asset Setup

### Step 1: Find Asset Pack 🖐️ MANUAL
**What:** Find a complete 3D asset pack online (GLTF/GLB format preferred)

**Good sources:**
- [itch.io](https://itch.io/game-assets/tag-3d) - Many free/paid packs
- [Kenney.nl](https://kenney.nl/assets) - Free CC0 assets
- [Sketchfab](https://sketchfab.com/) - Search for downloadable models
- [OpenGameArt](https://opengameart.org/) - Free game assets
- [Quaternius](https://quaternius.com/) - Free low-poly packs

**Tips:**
- Look for "complete" packs with multiple related assets
- GLTF format loads directly in Three.js without conversion
- Check license allows game development use

---

### Step 2: Organize Assets 🖐️ MANUAL
**What:** Place assets in the correct folder structure

**Steps:**
1. Create folder: `public/assets/{your_game_name}/`
2. Copy asset pack contents there
3. Ensure GLTF files are in a `glTF/` subfolder (if applicable)

**Expected structure:**
```
public/
└── assets/
    └── {your_game_name}/
        ├── glTF/           # 3D models
        │   ├── Model1.gltf
        │   └── Model2.gltf
        ├── PNG/            # Textures/sprites (optional)
        │   └── texture.png
        └── Preview.jpg     # Asset preview image
```

---

### Step 3: Create assets.json 🤖 AUTOMATED
**What:** Generate an index file listing all available assets

**Run the script:**
```bash
node scripts/generate-assets-json.js {your_game_name}
```

**Or manually create** `public/assets/{your_game_name}/assets.json` with this structure:
```json
{
  "metadata": {
    "generatedAt": "2026-01-30T00:00:00Z",
    "root": "public/assets/{your_game_name}",
    "totalAssets": 50,
    "glTFAssetCount": 25
  },
  "assets": [
    {
      "name": "Building1.gltf",
      "path": "public/assets/{game}/glTF/Building1.gltf",
      "relativePath": "glTF/Building1.gltf",
      "category": "glTF",
      "extension": ".gltf",
      "focusGlTF": true
    }
  ]
}
```

---

### Step 4: Asset Preview Image 🖐️ MANUAL (if missing)
**What:** Ensure there's a `Preview.jpg` showing all available assets

**If the asset pack includes one:** Just rename it to `Preview.jpg` and place in the assets folder

**If missing, create one:**
1. Open the asset pack in Blender or a GLTF viewer
2. Arrange multiple assets in view
3. Take a screenshot/render
4. Save as `public/assets/{your_game_name}/Preview.jpg`

---

## Phase 2: Concept Generation

### Step 5: Generate Mockup 🤝 AI-ASSISTED
**What:** Use an image-generation AI to create a visual concept of your game

**Tool:** Nano Banana Pro (or similar: Midjourney, DALL-E, Stable Diffusion)

**Attach:**
- `Preview.jpg` (asset preview)
- `assets.json` (asset index)

**Prompt template:** (see `prompts/01-mockup-generation.md`)
```
Given the following preview of assets that I have and the following 
assets.json index, create a mock-up of a:

[YOUR GAME DESCRIPTION]

The mockup should show:
- How the game would look during gameplay
- UI elements and their placement
- The overall visual style and mood
- Camera perspective (top-down, isometric, third-person, etc.)
```

**Output:** Save generated image to `public/{your_game_name}/concept.jpg`

---

## Phase 3: Design Documents

### Step 6: Create PRD (Product Requirements Document) 🤝 AI-ASSISTED
**What:** Generate a comprehensive game design document

**Tool:** Claude/Codex with Three.js skills enabled

**Attach:**
- `concept.jpg`
- `Preview.jpg`  
- `assets.json`

**Prompt template:** (see `prompts/02-prd-generation.md`)

**Output:** Save to `docs/prd.md`

---

### Step 7: Create TDD (Technical Design Document) 🤝 AI-ASSISTED  
**What:** Generate technical architecture and implementation details

**Tool:** Claude/Codex with Three.js skills enabled (NEW CHAT)

**Attach:**
- `docs/prd.md`
- `assets.json`
- `concept.jpg`
- `Preview.jpg`

**Prompt template:** (see `prompts/03-tdd-generation.md`)

**Output:** Save to `docs/tdd.md`

---

## Phase 4: Implementation

### Step 8: Create Execution Plan 🤝 AI-ASSISTED
**What:** Generate a step-by-step implementation plan

**Tool:** Claude/Codex with Three.js skills enabled (NEW CHAT)

**Attach:**
- `docs/prd.md`
- `docs/tdd.md`
- `assets.json`

**Prompt template:** (see `prompts/04-execution-plan.md`)

**Output:** Save to `plans/{plan-name}.md`

---

### Step 9: Implement the Game 🤝 AI-ASSISTED
**What:** Let the AI implement the game based on the plan

**Tool:** Claude Code / Cursor with Three.js skills enabled

**Prompt:**
```
Please proceed with implementing the game based on the plan in 
plans/{plan-name}.md

Use the Three.js skills for reference.
```

**Output:** Game code in `public/index.html` (or as specified in TDD)

---

## Automation Summary

| Step | Task | Automation Level | Tool/Script |
|------|------|------------------|-------------|
| 1 | Find assets | 🖐️ Manual | Human search online |
| 2 | Organize assets | 🖐️ Manual | Copy to `public/assets/{name}/` |
| 3 | Generate assets.json | 🤖 **Automated** | `node scripts/generate-assets-json.js` |
| 4 | Asset preview | 🖐️ Manual | Usually included in pack |
| 5 | Generate mockup | 🤖 **Automated** | `node scripts/generate-mockup.js` (Google AI) |
| 6 | Create PRD | 🤖 **Automated** | `node scripts/generate-prd.js` (Claude API) |
| 7 | Create TDD | 🤖 **Automated** | `node scripts/generate-tdd.js` (Claude API) |
| 8 | Create plan | 🤖 **Automated** | `node scripts/generate-plan.js` (Claude API) |
| 9 | Implement | 🤝 AI-Assisted | Claude Code with plan |

**Or run everything at once:** `node scripts/pipeline.js`

---

## File Structure After Completion

```
{your_game}/
├── .claude/
│   └── skills/
│       └── threejs-*/SKILL.md (10 skills)
├── .codex/
│   └── skills/
│       └── threejs-*/SKILL.md (10 skills)
├── docs/
│   ├── prd.md
│   └── tdd.md
├── plans/
│   └── {plan-name}.md
├── public/
│   ├── assets/
│   │   └── {game_name}/
│   │       ├── glTF/
│   │       ├── assets.json
│   │       └── Preview.jpg
│   ├── {game_name}/
│   │   └── concept.jpg
│   └── index.html
├── scripts/
│   └── generate-assets-json.js
├── prompts/
│   ├── 01-mockup-generation.md
│   ├── 02-prd-generation.md
│   ├── 03-tdd-generation.md
│   └── 04-execution-plan.md
└── README.md
```

---

## Tips for Success

1. **Clear game description**: The more specific your 1-3 sentence description, the better the outputs
2. **Review AI outputs**: Always review and adjust PRD/TDD before moving to implementation
3. **Iterate**: If the mockup doesn't match your vision, regenerate with adjusted prompts
4. **Start simple**: Begin with a minimal viable game, then add features
5. **Use the skills**: The Three.js skills provide patterns and code the AI can reference

---

## Example Game Descriptions

**RTS Game:**
> "A 3D real-time strategy game set in a medieval fantasy world where players gather resources, build bases, train armies, and destroy the enemy's town center to win."

**Tower Defense:**
> "A 3D tower defense game where players place defensive structures along a path to stop waves of enemies from reaching their castle."

**Puzzle Game:**
> "A 3D puzzle game where players rotate and connect pipes to guide water from a source to various destinations."

**Racing Game:**
> "An arcade-style 3D kart racing game with power-ups, drifting mechanics, and multiple tracks through a fantasy kingdom."
