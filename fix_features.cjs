const fs = require('fs');
let c = fs.readFileSync('src/pages/Workspace.tsx', 'utf-8');

// 1. Fix feature boxes in handleSubIndexExpand
c = c.replace(
  /<div key=\{f\.id\} className="p-6 bg-\[#242424\] border border-\[#333333\] rounded hover:border-\[#D4AF37\]\/50 transition-colors">/g,
  `<div key={f.id} onClick={(e) => { e.stopPropagation(); setExpandedPanel({ title: \`风险特征画像：\${f.label} \${f.id}\`, type: 'feature_profile', content: (<FeatureProfile feature={f} onReadOriginal={onReadOriginal} setExpandedPanel={setExpandedPanel}/>) }); }} className="p-6 bg-[#242424] border border-[#333333] rounded hover:border-[#D4AF37]/60 hover:bg-[#2e2e2e] cursor-pointer group relative transition-all">
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="flex items-center gap-1 text-[11px] bg-[#333] px-2 py-1 rounded text-gray-400 font-medium border border-[#444] shadow-sm"><Maximize2 className="w-3 h-3"/> 查看画像</span>
      </div>`
);

// 2. Fix feature boxes in the main risk module map
const replRegex = /<div key=\{f\.id\} className="\{\`\$\{expanded \? 'p-5' : 'p-3'\}\} hover:bg-\[#2A2A2A\] cursor-pointer transition-colors"\}( onClick=\{\(\) => onFeatureClick\?.\(f\)\})?>/g;
c = c.replace(replRegex, 
  `<div key={f.id} className={\`\${expanded ? 'p-5' : 'p-3'} bg-transparent hover:bg-[#2e2e2e] border border-transparent hover:border-[#D4AF37]/60 cursor-pointer group relative transition-all\`} onClick={(e) => { e.stopPropagation(); onFeatureClick?.(f); }}>
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="flex items-center gap-1 text-[10px] bg-[#333] px-1.5 py-0.5 rounded text-gray-400 font-medium shadow-sm"><Maximize2 className="w-3 h-3"/> 查看画像</span>
    </div>`
);


// 3. Fix FeatureProfile to show original evidence without clicking "阅读原文"
const featureProfileStart = 'const FeatureProfile = ({ feature, onReadOriginal, setExpandedPanel }: any) => {';
const featureProfileInner = `
  const originalText = feature.evidenceSource?.originalText || feature.evidenceSnippet || feature.evidence || '暂无原文内容';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1A1A1A] border border-[#333333] rounded p-4">
           <div className="text-gray-500 text-xs mb-1">特征编号 & 名称</div>
           <div className="text-[#D4AF37] font-bold text-lg">{feature.id} - {feature.label}</div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#333333] rounded p-4">
           <div className="text-gray-500 text-xs mb-1">归属子指数 & 局部权重</div>
           <div className="text-gray-200 font-bold text-sm">{feature.group || '自动推演'} <span className="ml-2 text-gray-400 font-mono font-normal">W = {feature.localWeight || '0.45'}</span></div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#333333] rounded p-4">
           <div className="text-gray-500 text-xs mb-1">风险等级与当前值</div>
           <div className="flex items-end gap-3 text-red-400 font-bold text-lg">
             高风险 <span className="text-gray-300 font-mono text-base ml-2">v = {feature.value.toFixed(2)}</span>
           </div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#333333] rounded p-4">
           <div className="text-gray-500 text-xs mb-1">算法来源</div>
           <div className="text-gray-300 font-mono text-sm">{feature.method || '逻辑判断'}</div>
        </div>
      </div>

      <div className="bg-[#242424] border border-[#333333] rounded p-5 space-y-5">
        <div>
          <h4 className="text-gray-300 font-semibold mb-2">画像解释</h4>
          <p className="text-gray-400 text-sm leading-relaxed">{feature.explanation || '命中审计风险底稿中的多项指标特征，需重点穿透。'}</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-gray-300 font-semibold mb-2 text-sm">RAG 证据摘要</h4>
            <div className="bg-[#1A1A1A] border border-[#333333] p-3 rounded text-xs text-gray-400 font-mono leading-relaxed h-[120px] overflow-y-auto">
              {feature.evidence || '摘要信息提取中...'}
            </div>
          </div>
          <div>
            <h4 className="text-gray-300 font-semibold mb-2 text-sm flex justify-between items-center">原文证据片段 <button onClick={() => toast('原文已复制', 'success')} className="text-[#D4AF37] hover:text-white transition-colors text-xs font-normal">复制</button></h4>
            <div className="bg-[#121212] border border-[#333333] p-3 rounded text-xs text-gray-400 font-mono leading-relaxed h-[120px] overflow-y-auto">
              {originalText}
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-gray-300 font-semibold mb-2 mt-2 text-sm flex items-center gap-2">关联实体与关系</h4>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="px-3 py-1.5 bg-[#1A1A1A] border border-[#333333] rounded text-xs text-blue-400">登XX发行主体</span>
            <span className="px-2 py-0.5 border border-dashed border-gray-600 rounded text-[10px] text-gray-500 tracking-wider">ABNORMAL_TRANSACTION</span>
            <span className="px-3 py-1.5 bg-[#1A1A1A] border border-[#333333] rounded text-xs text-blue-400">山东旺XX汽车零部件</span>
          </div>
        </div>
        
        <div className="pt-4 border-t border-[#333333] space-y-3">
          <h4 className="text-white font-semibold flex items-center gap-2">审计建议 <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">高危触发</span></h4>
          <ul className="text-sm text-gray-400 space-y-2 list-disc pl-5">
            <li>调取完整采购合同和发票，核查交易定价公允性。</li>
            <li>检查是否存在突击交易，追踪资金流向与最终收款账户。</li>
            <li>穿透法人网络，审查是否存在隐蔽实控人关联。</li>
          </ul>
        </div>
        
        <div className="flex gap-3 pt-4 border-t border-[#333333] justify-end">
           <button onClick={() => { setExpandedPanel(null); const tabBtn = document.querySelector('button[onClick*="setRightTab(\\\'graph\\\')"]'); if(tabBtn) (tabBtn as any).click(); toast('已定位到相关知识图谱', 'success'); }} className="px-4 py-2 border border-[#333333] rounded text-sm hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors flex items-center gap-2"><Network className="w-4 h-4"/>定位图谱</button>
           <button onClick={(e) => { (e.target as any).innerHTML = '已加入底稿'; (e.target as any).className = 'px-4 py-2 bg-[#2A2A2A] text-gray-400 border border-[#444] rounded text-sm cursor-not-allowed'; toast('风险特征已加入工作底稿', 'success'); }} className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded text-sm hover:bg-[#E5C048] transition-colors">加入底稿</button>
        </div>
      </div>
    </div>
  );
`;

const oldFeatureProfileRegex = /const FeatureProfile = \(\{ feature, onReadOriginal, setExpandedPanel \}: any\) => \{[\s\S]*?\n\};\n/m;
c = c.replace(oldFeatureProfileRegex, featureProfileStart + featureProfileInner + '};\n');

// 4. Ensure we don't open the right drawer for these feature clicks!
// The right drawer state is `selectedNode` and `selectedEdge`.
// Wait, `onFeatureClick={(feature) => setExpandedPanel(...)}` will only setExpandedPanel, it won't set selectedNode!
// But let's make sure it doesn't do both somehow. The onClick event only calls onFeatureClick. We added e.stopPropagation(). So it shouldn't bubble.

fs.writeFileSync('src/pages/Workspace.tsx', c);
