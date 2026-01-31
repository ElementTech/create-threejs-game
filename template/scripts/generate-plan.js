#!/usr/bin/env node

/**
 * Execution Plan Generation Script
 * 
 * Uses OpenAI API (GPT-4o) to generate an implementation plan
 * based on the PRD and TDD.
 * 
 * Usage:
 *   node generate-plan.js [plan-name]
 * 
 * Example:
 *   node generate-plan.js initial-implementation
 * 
 * Requires:
 *   - config.json with openai.api_key and game settings
 *   - docs/prd.md
 *   - docs/tdd.md
 *   - public/assets/{game_name}/assets.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Generate random plan name if not provided
function generatePlanName() {
  const adjectives = ['swift', 'bold', 'bright', 'calm', 'dark', 'eager', 'fair', 'grand', 'keen', 'light', 'mossy', 'noble', 'proud', 'quick', 'rare', 'sage', 'true', 'vast', 'warm', 'wise'];
  const nouns = ['dawn', 'dusk', 'flame', 'frost', 'glade', 'grove', 'haven', 'isle', 'lake', 'marsh', 'oak', 'peak', 'pine', 'ridge', 'shore', 'stone', 'tide', 'vale', 'wind', 'wood'];
  const names = ['ada', 'blake', 'chen', 'darwin', 'euler', 'feynman', 'gauss', 'hopper', 'ito', 'jung', 'knuth', 'lovelace', 'maxwell', 'newton', 'oracle', 'pascal', 'quine', 'riemann', 'shannon', 'turing'];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  
  return `${adj}-${noun}-${name}`;
}

// Load config
const scriptDir = __dirname;
const projectRoot = path.join(scriptDir, '..');
const configPath = path.join(scriptDir, 'config.json');

if (!fs.existsSync(configPath)) {
  console.error('Error: config.json not found');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const { openai, game } = config;

// Check config first, then env vars
const apiKey = (openai?.api_key && !openai.api_key.includes('YOUR_'))
  ? openai.api_key
  : process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('Error: OpenAI API key not found');
  console.error('Set OPENAI_API_KEY env var or configure scripts/config.json');
  process.exit(1);
}

// Plan name from args or generate
const planName = process.argv[2] || generatePlanName();

// Paths
const prdPath = path.join(projectRoot, 'docs', 'prd.md');
const tddPath = path.join(projectRoot, 'docs', 'tdd.md');
const assetsJsonPath = path.join(projectRoot, 'public', 'assets', game.name, 'assets.json');
const plansDir = path.join(projectRoot, 'plans');
const outputPath = path.join(plansDir, `${planName}.md`);

// Check required files
const missingFiles = [];
if (!fs.existsSync(prdPath)) missingFiles.push(prdPath + ' (run generate-prd.js first)');
if (!fs.existsSync(tddPath)) missingFiles.push(tddPath + ' (run generate-tdd.js first)');
if (!fs.existsSync(assetsJsonPath)) missingFiles.push(assetsJsonPath);

if (missingFiles.length > 0) {
  console.error('Error: Missing required files:');
  missingFiles.forEach(f => console.error('  - ' + f));
  process.exit(1);
}

// Read files
const prdContent = fs.readFileSync(prdPath, 'utf-8');
const tddContent = fs.readFileSync(tddPath, 'utf-8');
const assetsJson = fs.readFileSync(assetsJsonPath, 'utf-8');

// Build prompt
const prompt = `You are creating an execution plan for implementing a Three.js game.

Analyze the PRD and TDD below, then create a phased implementation plan based ONLY on what these documents specify. Do NOT assume any features not mentioned in the documents.

## PRD (Product Requirements Document):
${prdContent}

## TDD (Technical Design Document):
${tddContent.substring(0, 80000)}

## Available Assets (assets.json):
\`\`\`json
${assetsJson}
\`\`\`

---

Create a concise, actionable execution plan. Structure it as follows:

# ${game.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} - Implementation Plan

## Overview
- Target file: \`public/index.html\` (single HTML file with inline CSS/JS)
- Brief summary of the game type and core mechanics (from PRD)
- Asset path format: \`assets/${game.name}/glTF/<FILENAME>.gltf\`

## Implementation Phases

Analyze the TDD and create phases based on what's ACTUALLY in the documents. Each phase should:
1. Have a clear name describing what it implements
2. Be marked as (Critical), (Important), or (Polish)
3. List specific items to implement from the TDD
4. Reference relevant TDD sections

Start with foundational systems (renderer, camera, asset loading) then progress through game-specific systems as defined in the TDD. Only include phases for features that exist in the PRD/TDD.

## Initial Scene Setup
Based on the PRD/TDD, describe:
- What entities/objects should be placed initially
- Their positions and configurations
- Any level/map setup required

## Verification Checklist
Extract ALL success criteria from the PRD and list them as checkboxes:
- [ ] (each criterion from PRD)

## Estimated Complexity
Based on the TDD scope, estimate code size and complexity.

## Next Step
To implement, use this prompt with Claude Code:
\`\`\`
Please proceed with implementing the game based on the plan in plans/${planName}.md
Use the Three.js skills for reference.
\`\`\`
`;

console.log('Generating execution plan with OpenAI API (GPT-5.2)...');
console.log('Game:', game.name);
console.log('Plan name:', planName);

// OpenAI API request
const requestBody = JSON.stringify({
  model: 'gpt-5.2',
  max_completion_tokens: 128000,
  messages: [{
    role: 'user',
    content: prompt
  }]
});

const options = {
  hostname: 'api.openai.com',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
    process.stdout.write('.');
  });
  
  res.on('end', () => {
    console.log('\n');
    
    try {
      const response = JSON.parse(data);
      
      if (response.error) {
        console.error('API Error:', response.error.message);
        process.exit(1);
      }
      
      // Extract text content from OpenAI response
      const planContent = response.choices?.[0]?.message?.content || '';
      
      if (!planContent) {
        console.error('No content in response');
        process.exit(1);
      }
      
      // Ensure plans directory exists
      if (!fs.existsSync(plansDir)) {
        fs.mkdirSync(plansDir, { recursive: true });
      }
      
      // Save plan
      fs.writeFileSync(outputPath, planContent);
      
      console.log('Execution plan generated successfully!');
      console.log('Output:', outputPath);
      console.log('');
      console.log('Next step - run in Claude Code:');
      console.log(`  Please proceed with implementing the game based on the plan in plans/${planName}.md`);
      
    } catch (err) {
      console.error('Error parsing response:', err.message);
      console.error('Raw response:', data.substring(0, 1000));
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
  process.exit(1);
});

req.write(requestBody);
req.end();
