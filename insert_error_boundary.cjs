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
c = c.replace(/data\.riskScoring\.subIndices\.X(\d)/g, '(data.riskScoring?.subIndices?.X$1 || 0)');
c = c.replace(/data\.riskScoring\.globalWeights\.W(\d)/g, '(data.riskScoring?.globalWeights?.W$1 || 0)');
c = c.replace(/data\.riskScoring\.globalWeights\.b/g, '(data.riskScoring?.globalWeights?.b || -3.0)');

// Also fix X3.toFixed which would fail if X3 is undefined 
c = c.replace(/\(data.riskScoring\?\.subIndices\?\.X3 \|\| 0\)\.toFixed/g, 'Number(data.riskScoring?.subIndices?.X3 || 0).toFixed');


// We want to wrap the main parts of Workspace with ErrorBoundary
// A good place is the <div className="flex-1 flex flex-col lg:flex-row gap-px bg-[#333333] min-h-0 overflow-y-auto lg:overflow-hidden">
// We can just wrap the main return content since we can use a script regex easily.
c = c.replace(
    /<div className="flex-1 flex flex-col lg:flex-row gap-px bg-\[#333333\] min-h-0 overflow-y-auto lg:overflow-hidden">/g,
    '<div className="flex-1 flex flex-col lg:flex-row gap-px bg-[#333333] min-h-0 overflow-y-auto lg:overflow-hidden">\n<ErrorBoundary>'
);

// Close it at the end of that div (which is before the closing </div> of the main screen)
// Looking for the final </div>
// Actually, it's safer to wrap the three main panels with ErrorBoundary.
c = c.replace(/\{renderPanelContent\(\)\}/g, '<ErrorBoundary>{renderPanelContent()}</ErrorBoundary>');
c = c.replace(/<D3Graph/g, '<ErrorBoundary><D3Graph');
c = c.replace(/expanded=\{true\} \/>/g, 'expanded={true} /></ErrorBoundary>');
c = c.replace(/onEdgeClick=\{setSelectedEdge\}\/>;/g, 'onEdgeClick={setSelectedEdge}/></ErrorBoundary>;');
c = c.replace(/<div className="flex-1 overflow-y-auto/g, '<ErrorBoundary><div className="flex-1 overflow-y-auto');
c = c.replace(/<div className="grid grid-cols-4 gap-4">/g, '<ErrorBoundary><div className="grid grid-cols-4 gap-4">');

// We also should wrap the left panel
c = c.replace(
    /<div className="hidden lg:flex w-\[320px\] xl:w-\[400px\] bg-\[#1A1A1A\] flex-col min-h-0 shrink-0 border-r border-\[#333333\]">/,
    '<div className="hidden lg:flex w-[320px] xl:w-[400px] bg-[#1A1A1A] flex-col min-h-0 shrink-0 border-r border-[#333333]"><ErrorBoundary>'
);

c = c.replace(
    /_{\{rulesHit\.length > 0 && \(/g,
    '</ErrorBoundary>\n                     {rulesHit.length > 0 && ('
);

fs.writeFileSync('src/pages/Workspace.tsx', c);
