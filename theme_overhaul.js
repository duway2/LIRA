const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

const replacements = [
  { regex: /bg-\[#151515\]/g, replacement: 'bg-gray-50' },
  { regex: /bg-\[#0a0a0a\]/g, replacement: 'bg-white' },
  { regex: /bg-\[#111111\]/g, replacement: 'bg-gray-100' },
  { regex: /bg-lira-black/g, replacement: 'bg-white' },
  { regex: /text-white/g, replacement: 'text-gray-900' },
  { regex: /text-gray-400/g, replacement: 'text-gray-600' },
  { regex: /text-gray-300/g, replacement: 'text-gray-700' },
  { regex: /border-white\/5/g, replacement: 'border-gray-200' },
  { regex: /border-white\/10/g, replacement: 'border-gray-200' },
  { regex: /border-white\/20/g, replacement: 'border-gray-300' },
  { regex: /bg-white\/5/g, replacement: 'bg-white' },
  { regex: /bg-white\/10/g, replacement: 'bg-gray-50' },
  { regex: /bg-white\/20/g, replacement: 'bg-gray-100' },
  { regex: /bg-black\/40/g, replacement: 'bg-gray-100' },
  { regex: /bg-black\/50/g, replacement: 'bg-gray-200' }
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

try {
  processDirectory(srcDir);
  console.log('Massive Theme Overhaul Completed Successfully!');
} catch (error) {
  console.error('Error during overhaul:', error);
}
