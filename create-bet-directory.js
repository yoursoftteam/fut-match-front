const fs = require('fs');
const path = require('path');

// Create the bet directory
const betDir = path.join(__dirname, 'src', 'components', 'bet');
if (!fs.existsSync(betDir)) {
  fs.mkdirSync(betDir, { recursive: true });
  console.log(`✓ Created directory: ${betDir}`);
}

// List the directory contents
console.log('\n✓ Directory structure created. You can now create files in:', betDir);
