const fs = require('fs');
let c = fs.readFileSync('src/pages/Workspace.tsx', 'utf-8');

if (!c.includes('import { ErrorBoundary }')) {
    c = c.replace(
      "import { getMockProjectDetail } from '../lib/mockData.ts';",
      "import { getMockProjectDetail } from '../lib/mockData.ts';\nimport { ErrorBoundary } from '../components/ErrorBoundary';"
    );
}

// Ensure riskScoring accesses are safe. 
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

// Fix .toFixed issues with conditional numbers
c = c.replace(/\(data\.riskScoring\?\.subIndices\?\.X3 \|\| 0\)\.toFixed/g, 'Number(data.riskScoring?.subIndices?.X3 || 0).toFixed');
c = c.replace(/\(data\.riskScoring\?\.zValue \|\| 0\)\.toFixed/g, 'Number(data.riskScoring?.zValue || 0).toFixed');
c = c.replace(/\(data\.riskScoring\?\.probabilityPercent \|\| 0\)\.toFixed/g, 'Number(data.riskScoring?.probabilityPercent || 0).toFixed');

c = c.replace(
    'return (\n    <div className="h-screen flex flex-col bg-[#1A1A1A] overflow-hidden">',
    'return (\n    <ErrorBoundary>\n    <div className="h-screen flex flex-col bg-[#1A1A1A] overflow-hidden">'
);

// find the last div before the final }
const parts = c.split('\n');
for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].includes('export default function Workspace() {')) {
        break; // safety
    }
    if (parts[i].trim() === ')' && parts[i-1].trim() === '</div>' && parts[i-2] && parts[i-2].includes('</div>')) {
        // we found the end of return (\n ... </div>\n)
        parts.splice(i, 0, '    </ErrorBoundary>');
        c = parts.join('\n');
        break;
    }
}

// Actually it's easier to just do it via regex string matching since we know the end of the file looks like:
//         </div>
//       )}
//     </div>
//   );
// }

// Let's just use string replace on the EOF part:
c = c.replace(/    <\/div>\n  \);\n\}/, '    </div>\n    </ErrorBoundary>\n  );\n}');

fs.writeFileSync('src/pages/Workspace.tsx', c);
