const fs = require('fs');

let readme = fs.readFileSync('README.md', 'utf-8');

const envDocs = \`
## Environment Variables / 环境变量说明

Vercel 部署时需要在 Project Settings → Environment Variables 中配置以下变量以启用 AI 证据抽取功能：

\\\`\\\`\\\`bash
GEMINI_API_KEY=你的 Google AI Studio API Key # 必填
GOOGLE_AI_API_KEY=你的 Google AI Studio API Key # 选填（如果 GEMINI_API_KEY 不存在则回退到该值）
\\\`\\\`\\\`

说明：
- 如果没有配置 API Key，系统会自动启用 mock fallback 机制，不会影响 Demo 核心流程展示。
- API Key 仅在服务器端 (Vercel API routes) 被读取，不会暴露至前端浏览器。
- 所有 AI 数据抽取和特征映射都在后端处理。
\`;

if (!readme.includes('GEMINI_API_KEY')) {
  fs.writeFileSync('README.md', readme + '\\n' + envDocs);
}

// Update .env.example
if (fs.existsSync('.env.example')) {
  let envExample = fs.readFileSync('.env.example', 'utf-8');
  if (!envExample.includes('GEMINI_API_KEY')) {
    fs.writeFileSync('.env.example', envExample + '\\nGEMINI_API_KEY=\\nGOOGLE_AI_API_KEY=\\n');
  }
} else {
  fs.writeFileSync('.env.example', 'DATABASE_URL=\\nBLOB_READ_WRITE_TOKEN=\\nADMIN_PASSWORD=20050805\\nGEMINI_API_KEY=\\nGOOGLE_AI_API_KEY=\\n');
}
