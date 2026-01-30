# Execution Plan Generation Prompt

## Tool
LLM with Three.js skills enabled (Claude Code, Cursor, etc.)

**IMPORTANT:** Start a NEW CHAT with clear context

## Files to Attach
- `docs/prd.md` - Product requirements
- `docs/tdd.md` - Technical design
- `public/assets/{game_name}/assets.json` - Asset index

## Prompt Template

```
Implement the game defined in docs/prd.md adhering to the technical design 
in docs/tdd.md.

Note the assets index in public/assets/{game_name}/assets.json.

Use the Three.js skills for implementation patterns.

Create an execution plan that:

## Overview
- Target file(s) to create
- Key references to PRD and TDD sections
- Asset path format

## Implementation Phases
For each phase, specify:
- Phase name and priority (Critical/Important/Polish)
- What to implement
- Key code sections from TDD to use
- Verification steps

Suggested phases:
1. Core Engine (Critical) - Scene, camera, lighting, ground
2. Asset Loading (Critical) - GLTF loader, fallbacks
3. ECS Architecture (Critical) - Entities, components, manager
4. Selection System (Critical) - Click/box select, visuals
5. Command System (Critical) - Move, attack commands
6. Movement System (Critical) - Unit movement, collision
7. Combat System (Critical) - Damage, death
8. Economy/Resource System (Important) - If applicable
9. AI System (Important) - Enemy behavior
10. UI & Game States (Important) - Menus, HUD
11. Effects (Polish) - Juice, particles
12. Mobile/Polish (Polish) - Touch controls, onboarding

## HTML File Structure
Show the expected structure:
- DOCTYPE, head, meta tags
- Style block organization
- Import map for Three.js
- Script module organization

## Map Setup
- Initial entity positions
- Resource placement
- Obstacle placement

## Verification Checklist
From PRD success criteria, list what must work:
- [ ] Game loads without errors
- [ ] [Other criteria...]

## Estimated Scope
- Approximate lines of code
- Expected complexity
```

## Output
Save to: `plans/{descriptive-name}.md`

**Naming convention:** Use a memorable name like:
- `plans/initial-implementation.md`
- `plans/core-gameplay.md`
- Or use a random word generator for unique names

## Next Step
After saving the plan, proceed to implementation:

```
Please proceed with implementing the game based on the plan in 
plans/{plan-name}.md

Use the Three.js skills for reference.
```
