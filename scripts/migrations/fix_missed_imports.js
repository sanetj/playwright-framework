const fs = require('fs');

function replaceFile(path, oldText, newText) {
  if(!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(oldText, newText);
  fs.writeFileSync(path, content, 'utf8');
}

replaceFile('src/intelligence/prioritization/investigation-priority.ts', 
  "'../validation/confidence-calculator'", 
  "'../../runtime/validation/confidence-calculator'");

replaceFile('src/intelligence/prioritization/investigation-priority.ts', 
  "'../candidates/candidate-lifecycle'", 
  "'../../models/candidate/candidate-lifecycle'");

replaceFile('src/intelligence/workflows/workflow-canonicalizer.ts', 
  "'../graph/action-graph'", 
  "'../../graph/action-graph'");

replaceFile('src/models/candidate/candidate-generator.ts', 
  "'../graph/knowledge-graph'", 
  "'../../graph/knowledge-graph'");

console.log("Fixed missed imports.");
