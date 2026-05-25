const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (!dirPath.includes('node_modules') && !dirPath.includes('.git')) {
        walk(dirPath, callback);
      }
    } else if (dirPath.endsWith('.ts')) {
      callback(dirPath);
    }
  });
}

walk('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;
  
  // Replace intelligence/workspace -> models/workspace
  content = content.replace(/intelligence\/workspace/g, 'models/workspace');
  
  // Replace intelligence/candidates -> models/candidate
  content = content.replace(/intelligence\/candidates/g, 'models/candidate');
  
  // Replace intelligence/exploration -> runtime/exploration
  content = content.replace(/intelligence\/exploration/g, 'runtime/exploration');
  
  // Replace intelligence/validation -> runtime/validation
  content = content.replace(/intelligence\/validation/g, 'runtime/validation');
  
  // Replace intelligence/graph -> graph
  content = content.replace(/intelligence\/graph/g, 'graph');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Fixed imports:', filePath);
  }
});
