const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walk(dirPath, callback);
    } else if (dirPath.endsWith('.ts')) {
      callback(dirPath);
    }
  });
}

const replacements = [
  { regex: /Hypothesis/g, replace: 'InvestigationCandidate' },
  { regex: /hypothesis/g, replace: 'candidate' },
  { regex: /Inference/g, replace: 'DeterministicEvaluation' },
  { regex: /inference/g, replace: 'evaluation' },
  { regex: /Guess/g, replace: 'DeterministicEvaluation' },
  { regex: /guess/g, replace: 'evaluation' },
  { regex: /Prediction/g, replace: 'Signal' },
  { regex: /prediction/g, replace: 'signal' },
  { regex: /Reasoning/g, replace: 'Evaluation' },
  { regex: /reasoning/g, replace: 'evaluation' },
  { regex: /Intelligence score/g, replace: 'Confidence' },
  { regex: /IntelligenceScore/g, replace: 'Confidence' },
  { regex: /intelligence score/gi, replace: 'confidence' },
  { regex: /Probability/g, replace: 'Confidence' },
  { regex: /probability/g, replace: 'confidence' },
];

walk('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;
  
  replacements.forEach(r => {
    content = content.replace(r.regex, r.replace);
  });
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Updated:', filePath);
  }
});
