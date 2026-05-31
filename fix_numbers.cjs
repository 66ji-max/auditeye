const fs = require('fs');
let ws = fs.readFileSync('src/pages/Workspace.tsx', 'utf-8');
ws = ws.replace(/NumberNumber/g, 'Number');
fs.writeFileSync('src/pages/Workspace.tsx', ws);

let eb = fs.readFileSync('src/components/ErrorBoundary.tsx', 'utf-8');
// To fix TS2339 Property 'props' does not exist on type 'ErrorBoundary'
// React types might be weird without tsconfig strict/jsx. 
// Adding explicitly `public props: Props;` works or simply removing the generics and using `any`.
eb = eb.replace('export class ErrorBoundary extends React.Component<Props, State> {', 'export class ErrorBoundary extends React.Component<any, any> {');
fs.writeFileSync('src/components/ErrorBoundary.tsx', eb);
