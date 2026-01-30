# Implementation Prompt

## Tool
Claude Code / Cursor with Three.js skills enabled

## Files to Attach
- `plans/{plan-name}.md` - The execution plan

## Prompt Template

```
Please proceed with implementing the game based on the plan in 
plans/{plan-name}.md

Use the Three.js skills for reference.
```

## What to Expect
The AI will:
1. Read the plan and understand the phased approach
2. Create the HTML file structure
3. Implement each phase sequentially
4. Test and verify as it goes

## During Implementation
You may need to:
- Answer clarifying questions
- Approve file creations
- Test the game in browser and report issues
- Request adjustments to specific features

## Common Follow-up Prompts

**If something doesn't work:**
```
The [feature] isn't working correctly. When I [action], it [actual behavior] 
instead of [expected behavior]. Can you fix this?
```

**To add a feature:**
```
Can you add [feature] to the game? It should [description of behavior].
```

**To improve performance:**
```
The game is running slowly. Can you optimize [specific system/area]?
```

**To adjust visuals:**
```
Can you adjust the [visual element] to be more [description]?
```

**To test specific functionality:**
```
Can you verify that [specific feature] works by [test steps]?
```

## Verification
After implementation, test all items in the plan's verification checklist.
