const fs = require('fs');

function replaceFile(path, oldText, newText) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(oldText, newText);
  fs.writeFileSync(path, content, 'utf8');
}

replaceFile('src/models/workspace/investigation-workspace.ts', 
  "'../../runtime/multi-session-runtime'", 
  "'../../intelligence/runtime/multi-session-runtime'");

replaceFile('src/runtime/exploration/autonomous-explorer.ts', 
  "'../workspace/investigation-workspace'", 
  "'../../models/workspace/investigation-workspace'");

replaceFile('src/runtime/exploration/autonomous-explorer.ts', 
  "'../workspace/investigation-state'", 
  "'../../models/workspace/investigation-state'");

replaceFile('src/runtime/validation/exploit-validation-engine.ts', 
  "'../differentials/concrete-differential-engine'", 
  "'../../intelligence/differentials/concrete-differential-engine'");

if (fs.existsSync('tests/unit/workflow-canonicalizer.spec.ts')) {
  replaceFile('tests/unit/workflow-canonicalizer.spec.ts', 
    "'../../src/intelligence/graph/action-graph'", 
    "'../../src/graph/action-graph'");
}

console.log("Fixed specific imports.");
