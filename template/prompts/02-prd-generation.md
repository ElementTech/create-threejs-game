# PRD (Product Requirements Document) Generation Prompt

## Tool
LLM with Three.js skills enabled (Claude Code, Cursor, etc.)

## Files to Attach
- `public/{game_name}/concept.jpg` - The mockup
- `public/assets/{game_name}/Preview.jpg` - Asset preview
- `public/assets/{game_name}/assets.json` - Asset index

## Prompt Template

```
[INSERT YOUR GAME DESCRIPTION HERE]

I have concept mockups that reflect how the game looks.
I have also added a preview of the assets that are available.

Create a comprehensive Game Design Document (PRD) with the following sections:

## 1. Summary
- Brief description of the game
- Target platform (browser-based)
- Key assumptions and constraints for V1
- Match length / session time

## 2. Technical Requirements
- Three.js version (r160 recommended)
- Delivery format (single HTML file preferred)
- Unit system (world units = meters)
- Required loaders (GLTFLoader)
- Valid materials and lights

## 3. Canvas & Viewport
- Internal resolution
- Aspect ratio handling (letterboxing if fixed)
- Background style

## 4. Visual Style & Art Direction
- Overall look description
- Color palette with hex codes and purposes
- Mood/atmosphere
- Camera style and defaults (pitch, yaw, zoom range)
- Lighting mood

## 5. Player Specifications
- Faction/player identity if applicable
- Unit types (appearance, size, role, stats)
- Starting setup (resources, units, position)
- Movement constraints

## 6. Physics & Movement
- Movement model (kinematic, physics-based)
- Gravity, speeds, collision approach
- Unit movement values table

## 7. Obstacles/Enemies
- Enemy types and behaviors
- Neutral obstacles using available assets
- Spawn timing and difficulty scaling

## 8. World & Environment
- Map layout and dimensions
- Resource/pickup nodes and their values
- Buildings/structures using available GLTF assets
- Fallback primitives if assets fail to load

## 9. Collision & Scoring
- Collision shapes and approach
- Win/lose conditions
- Score system and point values
- High score storage (localStorage key)

## 10. Controls
- Complete input mapping table
- Desktop and touch/mobile controls
- Keyboard shortcuts

## 11. Game States
- Menu state (buttons, background)
- Playing state (active systems, UI shown)
- Paused state (trigger, display, frozen elements)
- Game Over state (display, stats, retry flow)

## 12. Game Feel & Juice (REQUIRED)
- Input response feedback (selection, commands)
- Animation timing table
- Screen effects (shake, flash, zoom, time dilation)
- Death sequences
- Milestone celebrations
- Idle life animations

## 13. UX Requirements
- Controls visibility
- Onboarding flow
- Readability considerations
- Forgiving mechanics

## 14. Out of Scope (V1)
- Features explicitly NOT included

## 15. Success Criteria
- Checklist of requirements the game must meet

Reference the attached assets.json for available models. Use specific asset 
names (e.g., "TownCenter_FirstAge_Level1.gltf") when specifying which assets 
to use for game elements.
```

## Output
Save to: `docs/prd.md`

## Review Checklist
After generation, verify:
- [ ] All major game mechanics are defined
- [ ] Asset references match available assets in assets.json
- [ ] Controls are complete for both desktop and mobile
- [ ] Win/lose conditions are clear
- [ ] Success criteria are testable
