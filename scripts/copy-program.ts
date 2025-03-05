const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../anchor/target/deploy');
const destDir = path.join(__dirname, '../anchor/tests/fixtures');

// Create fixtures directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy the .so file
const programSoPath = path.join(sourceDir, 'tokenvesting.so');
if (fs.existsSync(programSoPath)) {
  fs.copyFileSync(programSoPath, path.join(destDir, 'tokenvesting.so'));
  console.log('Successfully copied tokenvesting.so to test/fixtures');
} else {
  console.error('Could not find tokenvesting.so in target/deploy directory');
} 