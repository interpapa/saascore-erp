const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../../src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        fileList.push(filePath);
      }
    }
  });
  return fileList;
}

const allFiles = getAllFiles(srcDir);

// 1. Z-Index Audit across all files
console.log('=== Z-INDEX AUDIT ===');
const zIndexMap = {};

allFiles.forEach(file => {
  const relPath = path.relative(srcDir, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf-8');
  const zMatches = content.match(/z-\[(\d+)\]|z-(\d+)/g);
  if (zMatches) {
    zIndexMap[relPath] = Array.from(new Set(zMatches));
  }
});

for (const [file, zIndexes] of Object.entries(zIndexMap)) {
  console.log(`${file}: ${zIndexes.join(', ')}`);
}

// 2. Alert / Confirm Scan
console.log('\n=== ALERT / CONFIRM SCAN ===');
let alertCount = 0;
allFiles.forEach(file => {
  const relPath = path.relative(srcDir, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/\balert\(|\bconfirm\(/g.test(line) && !line.includes('//') && !line.includes('alert-')) {
      console.log(`[ALERT/CONFIRM DETECTED] ${relPath}:${idx + 1}: ${line.trim()}`);
      alertCount++;
    }
  });
});
if (alertCount === 0) {
  console.log('PASS: 0 native alert() or confirm() calls found across all src files.');
}

// 3. Primary Action Buttons Check (btn-haptic and bg-primary)
console.log('\n=== PRIMARY ACTION BUTTONS CHECK ===');
allFiles.forEach(file => {
  const relPath = path.relative(srcDir, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf-8');
  // Look for buttons that look like primary buttons or submit buttons
  const buttonMatches = content.match(/<button[^>]*class(?:Name)?="([^"]*)"/g);
  if (buttonMatches) {
    buttonMatches.forEach(btn => {
      if (btn.includes('primary') && !btn.includes('btn-haptic')) {
        console.log(`[WARN] Button with 'primary' but missing 'btn-haptic' in ${relPath}: ${btn}`);
      }
    });
  }
});
