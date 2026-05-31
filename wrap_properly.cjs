const fs = require('fs');
let c = fs.readFileSync('src/pages/Workspace.tsx', 'utf-8');

// 1. Rename default export
c = c.replace('export default function Workspace() {', 'function WorkspaceInner() {');

// 2. Add ErrorBoundary import
if (!c.includes('import { ErrorBoundary }')) {
    c = c.replace(
      "import { getMockProjectDetail } from '../lib/mockData.ts';",
      "import { getMockProjectDetail } from '../lib/mockData.ts';\nimport { ErrorBoundary } from '../components/ErrorBoundary';"
    );
}

// 3. Add the safe accessors for data.riskScoring
c = c.replace(/data\.riskScoring\.probabilityPercent/g, '(data.riskScoring?.probabilityPercent || 0)');
c = c.replace(/data\.riskScoring\.riskLevel/g, '(data.riskScoring?.riskLevel || "未评估")');
c = c.replace(/data\.riskScoring\.zValue/g, '(data.riskScoring?.zValue || 0)');
c = c.replace(/data\.riskScoring\.threshold/g, '(data.riskScoring?.threshold || 0)');
c = c.replace(/data\.riskScoring\.conclusion/g, '(data.riskScoring?.conclusion || "暂无")');
c = c.replace(/data\.riskScoring\.subIndices\.X1/g, '(data.riskScoring?.subIndices?.X1 || 0)');
c = c.replace(/data\.riskScoring\.subIndices\.X2/g, '(data.riskScoring?.subIndices?.X2 || 0)');
c = c.replace(/data\.riskScoring\.subIndices\.X3/g, '(data.riskScoring?.subIndices?.X3 || 0)');
c = c.replace(/data\.riskScoring\.globalWeights\.W1/g, '(data.riskScoring?.globalWeights?.W1 || 0)');
c = c.replace(/data\.riskScoring\.globalWeights\.W2/g, '(data.riskScoring?.globalWeights?.W2 || 0)');
c = c.replace(/data\.riskScoring\.globalWeights\.W3/g, '(data.riskScoring?.globalWeights?.W3 || 0)');
c = c.replace(/data\.riskScoring\.globalWeights\.b/g, '(data.riskScoring?.globalWeights?.b || -3.0)');
c = c.replace(/\(data\.riskScoring\?\.subIndices\?\.X3 \|\| 0\)\.toFixed/g, 'Number(data.riskScoring?.subIndices?.X3 || 0).toFixed');
c = c.replace(/\(data\.riskScoring\?\.zValue \|\| 0\)\.toFixed/g, 'Number(data.riskScoring?.zValue || 0).toFixed');
c = c.replace(/\(data\.riskScoring\?\.probabilityPercent \|\| 0\)\.toFixed/g, 'Number(data.riskScoring?.probabilityPercent || 0).toFixed');

// 4. Append new default export
c += `\n
export default function Workspace() {
  return (
    <ErrorBoundary>
      <WorkspaceInner />
    </ErrorBoundary>
  );
}
`;

fs.writeFileSync('src/pages/Workspace.tsx', c);
