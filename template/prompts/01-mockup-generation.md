# Mockup Generation Prompt

## Tool
Image generation AI (Nano Banana Pro, Midjourney, DALL-E, etc.)

## Files to Attach
- `public/assets/{game_name}/Preview.jpg`
- `public/assets/{game_name}/assets.json`

## Prompt Template

```
Given the following preview of assets that I have and the following 
assets.json index, create a mock-up of a:

[INSERT YOUR GAME DESCRIPTION HERE]

Example descriptions:
- "A 3D real-time strategy game set in a medieval fantasy world"
- "A 3D tower defense game with fantasy creatures"  
- "A 3D puzzle platformer in a magical forest"

The mockup should show:
- How the game would look during active gameplay
- UI elements appropriate for the game type (health bars, resources, minimap, etc.)
- The overall visual style matching the asset pack's aesthetic
- An appropriate camera perspective for the game type
- Multiple game elements arranged naturally (buildings, units, terrain, etc.)

Style notes:
- Match the art style of the provided assets
- Show a gameplay scenario, not a title screen
- Include enough elements to demonstrate the game's core loop
```

## Output
Save the generated image to: `public/{game_name}/concept.jpg`

## Tips
- If the first result doesn't match your vision, try:
  - Adding more specific details about camera angle
  - Specifying UI element locations
  - Describing a specific gameplay moment
- Generate 2-3 variations and pick the best one
