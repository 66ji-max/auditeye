const fs = require('fs');
let c = fs.readFileSync('src/pages/Workspace.tsx', 'utf-8');

c = c.replace(/<ErrorBoundary>\n/g, '');
c = c.replace(/<\/ErrorBoundary>/g, '');
c = c.replace(/import \{ ErrorBoundary \} from '\.\.\/components\/ErrorBoundary';\n/g, '');

fs.writeFileSync('src/pages/Workspace.tsx', c);
