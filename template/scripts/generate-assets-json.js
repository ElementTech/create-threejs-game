#!/usr/bin/env node

/**
 * Asset Index Generator
 * 
 * Generates an assets.json file that indexes all assets in a game's asset folder.
 * 
 * Usage:
 *   node generate-assets-json.js <game_name>
 * 
 * Example:
 *   node generate-assets-json.js medieval
 * 
 * This will scan public/assets/medieval/ and create public/assets/medieval/assets.json
 */

const fs = require('fs');
const path = require('path');

// Get game name from command line argument
const gameName = process.argv[2];

if (!gameName) {
  console.error('Usage: node generate-assets-json.js <game_name>');
  console.error('Example: node generate-assets-json.js medieval');
  process.exit(1);
}

// Paths
const scriptDir = __dirname;
const projectRoot = path.join(scriptDir, '..');
const assetsDir = path.join(projectRoot, 'public', 'assets', gameName);
const outputPath = path.join(assetsDir, 'assets.json');

// Check if assets directory exists
if (!fs.existsSync(assetsDir)) {
  console.error(`Error: Assets directory not found: ${assetsDir}`);
  console.error(`Please create the directory and add your assets first.`);
  process.exit(1);
}

// File extensions to index
const SUPPORTED_EXTENSIONS = {
  '3d': ['.gltf', '.glb', '.obj', '.fbx'],
  'images': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
  'audio': ['.mp3', '.wav', '.ogg'],
  'other': ['.json', '.txt']
};

// Get category from extension
function getCategory(ext) {
  ext = ext.toLowerCase();
  
  if (SUPPORTED_EXTENSIONS['3d'].includes(ext)) {
    return ext === '.gltf' || ext === '.glb' ? 'glTF' : '3D';
  }
  if (SUPPORTED_EXTENSIONS.images.includes(ext)) {
    return 'PNG'; // Keep as PNG for consistency with existing format
  }
  if (SUPPORTED_EXTENSIONS.audio.includes(ext)) {
    return 'Audio';
  }
  return 'Other';
}

// Find preview image in a directory
// Supports: Preview.*, preview.*, Content.*, content.*
function findPreview(dir) {
  const previewNames = [
    'Preview.jpg', 'Preview.png', 'preview.jpg', 'preview.png', 
    'Preview.jpeg', 'preview.jpeg',
    'Content.jpg', 'Content.png', 'content.jpg', 'content.png',
    'Content.jpeg', 'content.jpeg'
  ];
  for (const name of previewNames) {
    const previewPath = path.join(dir, name);
    if (fs.existsSync(previewPath)) {
      return previewPath;
    }
  }
  return null;
}

// Find all directories with preview images (these are the "packs")
function findPackDirs(rootDir) {
  const packDirs = [];
  
  function scan(dir) {
    if (findPreview(dir)) {
      packDirs.push(dir);
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        scan(path.join(dir, entry.name));
      }
    }
  }
  
  scan(rootDir);
  return packDirs;
}

// Get pack name for a file based on which pack directory it's under
function getPackName(filePath, packDirs, rootDir) {
  // Find the pack directory that contains this file
  for (const packDir of packDirs) {
    if (filePath.startsWith(packDir + path.sep) || filePath.startsWith(packDir + '/')) {
      return path.relative(rootDir, packDir).replace(/\\/g, '/');
    }
  }
  // Fallback to first directory component
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const parts = relativePath.split('/');
  if (parts.length > 1) {
    return parts[0];
  }
  return null;
}

// Recursively scan directory for assets
function scanDirectory(dir, relativeTo, packDirs = []) {
  const assets = [];
  
  if (!fs.existsSync(dir)) {
    return assets;
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Skip hidden directories
      if (item.name.startsWith('.')) continue;
      // Recursively scan subdirectories
      assets.push(...scanDirectory(fullPath, relativeTo, packDirs));
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      
      // Skip if not a supported extension or is the output file itself
      if (item.name === 'assets.json') continue;
      
      const allExtensions = [
        ...SUPPORTED_EXTENSIONS['3d'],
        ...SUPPORTED_EXTENSIONS.images,
        ...SUPPORTED_EXTENSIONS.audio
      ];
      
      if (!allExtensions.includes(ext)) continue;
      
      const relativePath = path.relative(relativeTo, fullPath).replace(/\\/g, '/');
      const category = getCategory(ext);
      const pack = getPackName(fullPath, packDirs, relativeTo);
      
      const asset = {
        name: item.name,
        path: `public/assets/${gameName}/${relativePath}`,
        relativePath: relativePath,
        category: category,
        extension: ext,
        focusGlTF: ext === '.gltf' || ext === '.glb'
      };
      
      // Add pack field if asset is in a subdirectory
      if (pack) {
        asset.pack = pack;
      }
      
      assets.push(asset);
    }
  }
  
  return assets;
}

// Main execution
console.log(`Scanning assets in: ${assetsDir}`);

// Find all directories with preview images (these define the packs)
const packDirs = findPackDirs(assetsDir);
if (packDirs.length > 0) {
  console.log(`Found ${packDirs.length} asset packs with previews`);
}

const assets = scanDirectory(assetsDir, assetsDir, packDirs);

// Sort assets by pack then name
assets.sort((a, b) => {
  if (a.pack && b.pack) {
    const packCompare = a.pack.localeCompare(b.pack);
    if (packCompare !== 0) return packCompare;
  } else if (a.pack) {
    return 1; // Assets with packs after root assets
  } else if (b.pack) {
    return -1;
  }
  return a.name.localeCompare(b.name);
});

// Count by category
const categoryCounts = {};
for (const asset of assets) {
  categoryCounts[asset.category] = (categoryCounts[asset.category] || 0) + 1;
}

// Count by pack
const packCounts = {};
for (const asset of assets) {
  const pack = asset.pack || '(root)';
  packCounts[pack] = (packCounts[pack] || 0) + 1;
}

// Count glTF assets
const glTFCount = assets.filter(a => a.focusGlTF).length;

// Get unique packs
const packs = [...new Set(assets.map(a => a.pack).filter(Boolean))];

// Build output
const output = {
  metadata: {
    generatedAt: new Date().toISOString(),
    root: `public/assets/${gameName}`,
    totalAssets: assets.length,
    glTFAssetCount: glTFCount,
    categories: categoryCounts,
    packs: packs.length > 0 ? packs : undefined,
    packCounts: packs.length > 0 ? packCounts : undefined
  },
  assets: assets
};

// Write output
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`\nGenerated: ${outputPath}`);
console.log(`\nSummary:`);
console.log(`  Total assets: ${assets.length}`);
console.log(`  glTF/GLB models: ${glTFCount}`);
console.log(`  Categories:`, categoryCounts);
if (packs.length > 0) {
  console.log(`  Packs (${packs.length}):`, packCounts);
}
