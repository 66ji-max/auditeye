const fs = require('fs');
let c = fs.readFileSync('src/pages/Workspace.tsx', 'utf-8');

const parseLogFunc = `
const parseLogDetails = (details: any) => {
  if (!details) return { message: '系统日志' };
  if (typeof details === 'object') return details;
  if (typeof details === 'string') {
    try {
      return JSON.parse(details);
    } catch {
      return { message: details };
    }
  }
  return { message: String(details) };
};
`;

if (!c.includes('parseLogDetails')) {
    c = c.replace(
      'export default function Workspace() {',
      parseLogFunc + '\nexport default function Workspace() {'
    );
}

c = c.replace(
    /const details = typeof l\.details === 'string' \? JSON\.parse\(l\.details\) : l\.details;/g,
    'const details = parseLogDetails(l.details);'
);

c = c.replace(
    /setCustomLogs\(\(prev:any\) => \[\{action:'SYSTEM_INFO', createdAt: new Date\(\)\.toISOString\(\), details: '追加数据源已接入并完成解析'\}, \.\.\.prev\]\);/g,
    `setCustomLogs((prev:any) => [{action:'INFO', createdAt: new Date().toISOString(), details: JSON.stringify({ message: '追加数据源已接入并完成解析' })}, ...prev]);`
);

c = c.replace(
    /const apiDocs = await uploadRes\.json\(\);\s*appendUploadedFilesToProject\(uploadFiles, apiDocs\);/g,
    `const apiResult = await uploadRes.json();\n                        appendUploadedFilesToProject(uploadFiles, apiResult.documents || []);`
);

fs.writeFileSync('src/pages/Workspace.tsx', c);
