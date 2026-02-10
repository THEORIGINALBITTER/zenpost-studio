/**
 * Test script to debug markdown file scanning
 * Run with: node test-scan.js
 */

const fs = require('fs');
const path = require('path');

function scanMarkdownFiles(dirPath, basePath = dirPath) {
  const mdFiles = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      // Skip .zenpost directory, node_modules, .git, etc.
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
        console.log(`[SKIP] ${entry.name}`);
        continue;
      }

      if (entry.isDirectory()) {
        console.log(`[DIR] ${entry.name}`);
        // Recursively scan subdirectories
        const subFiles = scanMarkdownFiles(fullPath, basePath);
        mdFiles.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const relativePath = fullPath.replace(basePath + path.sep, '');
        console.log(`[FOUND] ${relativePath}`);
        mdFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`[ERROR] scanning ${dirPath}:`, error.message);
  }

  return mdFiles;
}

// Test with your project path
const testPath = '/Users/denisbitter/project/ReactNativ/ZenPostStudio/zenpost-studio/data-room';

console.log('=== Testing Markdown File Scanner ===');
console.log(`Scanning: ${testPath}`);
console.log('');

const results = scanMarkdownFiles(testPath);

console.log('');
console.log('=== RESULTS ===');
console.log(`Found ${results.length} markdown files:`);
results.forEach((file, index) => {
  console.log(`${index + 1}. ${file}`);
});
