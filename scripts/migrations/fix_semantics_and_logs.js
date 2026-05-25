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

const replacements = [
  { regex: /ProbabilisticDeterministicEvaluation/g, replace: 'SidecarInference' },
  { regex: /Zero probabilistic evaluationing/g, replace: 'Zero probabilistic guessing' },
  { regex: /WorkflowDeterministicEvaluationEngine/g, replace: 'WorkflowDerivationEngine' },
  { regex: /DeterministicEvaluationDependency/g, replace: 'DependencyRelation' },
  { regex: /CausalEvaluationPath/g, replace: 'CausalAnalysisPath' },
  { regex: /DeterministicEvaluationConfidence/g, replace: 'InferenceConfidence' },
  { regex: /EntityDeterministicEvaluation/g, replace: 'EntityDerivation' },
  { regex: /^[ \t]*console\.log\(.*?\][^)]*\);\n?/gm, replace: '' } // Removes console logs starting with [
];

walk('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;
  
  replacements.forEach(r => {
    content = content.replace(r.regex, r.replace);
  });
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Fixed semantics/logs in:', filePath);
  }
});
