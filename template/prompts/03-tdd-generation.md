# TDD (Technical Design Document) Generation Prompt

## Tool
LLM with Three.js skills enabled (Claude Code, Cursor, etc.)

**IMPORTANT:** Start a NEW CHAT with clear context

## Files to Attach
- `docs/prd.md` - The PRD you generated
- `public/assets/{game_name}/assets.json` - Asset index
- `public/{game_name}/concept.jpg` - Visual reference
- `public/assets/{game_name}/Preview.jpg` - Asset preview

## Prompt Template

```
Based on the PRD in docs/prd.md, create a Technical Design Document (TDD) 
that will ensure we can implement this game with minimal problems and 
maximum speed.

Use the Three.js skills for patterns and best practices.
Reference the assets.json for the list of available assets.
Use the concept image as a visual reference for the game.

The TDD should include:

## 1. Overview
- Technical stack summary table
- Reference materials list

## 2. Architecture Overview
- High-level module structure diagram (ASCII art)
- Game state flow diagram

## 3. Core Engine Systems
- Renderer setup with code example
- Scene setup
- Camera system with full implementation code
- Lighting system with configuration
- Asset loading system with:
  - LoadingManager setup
  - GLTF loading with error handling
  - Fallback primitive generation
  - Asset manifest (list of core assets to load)

## 4. Entity Component System (ECS)
- Core Entity class structure
- All component definitions with code:
  - TransformComponent
  - HealthComponent
  - MovementComponent
  - CombatComponent
  - CollisionComponent
  - SelectableComponent
  - (Game-specific components)
- Entity Factory with creation methods
- Unit and building stats tables

## 5. Game Systems
Each system should include full implementation code:
- Entity Manager (add, remove, query by type/faction)
- Selection System (click, box select, animations)
- Command System (move, attack, gather commands)
- Movement System (pathfinding, separation, turn rate)
- Combat System (melee, ranged, projectiles, damage)
- Economy/Resource System (if applicable)
- AI System (state machine, behaviors)

## 6. Visual Effects System
- Effects Manager implementation
- Screen shake
- Time dilation
- Floating text
- Particle effects
- Death sequences

## 7. UI System
- Complete HTML structure
- Full CSS styles
- HUD elements
- Menu screens
- Build palette (if applicable)
- Mobile touch controls

## 8. Main Game Loop
- Game State Manager
- Full Game class implementation
- Update loop
- Win/lose checking
- HUD updates

## 9. Implementation Phases
- Ordered list of implementation steps
- Dependencies between phases
- Priority markers (Critical, Important, Polish)

## 10. Performance Considerations
- Rendering optimizations
- Game logic optimizations
- Memory management

## 11. Testing Checklist
- All success criteria from PRD as checkboxes

## 12. Appendix
- Color palette reference table
- Animation timing reference table
- Unit stats reference table
- Building stats reference table

All code examples should be:
- Complete and runnable (not pseudocode)
- Using Three.js r160 APIs
- Following the patterns from the Three.js skills
- Well-commented for clarity
```

## Output
Save to: `docs/tdd.md`

## Review Checklist
After generation, verify:
- [ ] All systems from PRD are covered
- [ ] Code examples are complete (not truncated)
- [ ] Asset paths match the actual asset structure
- [ ] Implementation phases are logical
- [ ] No missing dependencies between systems
