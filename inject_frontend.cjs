const fs = require('fs');
let content = fs.readFileSync('src/pages/RuleEngine.tsx', 'utf-8');

// 1. Add imports if needed Wait, we just need fetch and state
// It already imports useState

// 2. Add state variables for AI module
const stateLogic = `
  const [aiWeights, setAiWeights] = useState<any>({
    W1: 2.2, W2: 3.5, W3: 0.5, b: -3.0
  });
  const [aiSampleCount, setAiSampleCount] = useState(48);
  const [aiLastTrained, setAiLastTrained] = useState('2026/05/31');
  const [aiExtractionResult, setAiExtractionResult] = useState<any>(null);
  const [showAiTest, setShowAiTest] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleTrainWeights = async () => {
    setIsTraining(true);
    try {
      const res = await fetch('/api/ml/train-weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectType: currentSet === 'standard' ? 'IPO关联交易核查' : '其它项目门类' })
      });
      const data = await res.json();
      if (data.weights) {
        setAiWeights(data.weights);
        setAiSampleCount(data.sampleCount);
        setAiLastTrained(new Date().toLocaleString());
        toast('模型权重刷新成功', 'success');
      }
    } catch(e) {
      toast('训练失败', 'error');
    } finally {
      setIsTraining(false);
    }
  };

  const handleTestExtraction = async () => {
    setIsExtracting(true);
    setAiExtractionResult(null);
    setShowAiTest(true);
    try {
      const res = await fetch('/api/ml/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: currentSet === 'standard' ? 'IPO关联交易核查' : '其它库',
          documentText: "山东旺XX汽车零部件有限公司成立于2008年，与登XX发行主体在2012年交易额突增至770.13万元，疑为关联交易。"
        })
      });
      const data = await res.json();
      setAiExtractionResult(data);
    } catch(e) {
      toast('抽取请求失败', 'error');
    } finally {
      setIsExtracting(false);
    }
  };
`;

content = content.replace(
  'const [runningTest, setRunningTest] = useState(false);',
  'const [runningTest, setRunningTest] = useState(false);' + stateLogic
);

// 3. Add the UI Module right under Sandbox logic
const aiModuleUI = `
          {/* AI Weight Module */}
          <div className="w-full lg:w-80 bg-[#1A1A1A] border border-[#333333] rounded-lg shadow-lg flex flex-col shrink-0 mt-6 h-min">
             <div className="p-4 border-b border-[#333333] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#D4AF37]" />
                <span className="font-semibold text-sm">模型权重来源 (AI Engine)</span>
             </div>
             <div className="p-4 space-y-4">
                <div className="text-xs text-gray-400">
                   <div>当前项目类型： <span className="text-gray-200">{currentSet === 'standard' ? 'IPO关联交易核查' : '快消/其他'}</span></div>
                   <div className="mt-2 text-gray-200 font-mono text-[10px] bg-[#242424] p-2 rounded border border-[#333333]">
                     W1 = {aiWeights.W1}<br/>
                     W2 = {aiWeights.W2}<br/>
                     W3 = {aiWeights.W3}<br/>
                     b  = {aiWeights.b}
                   </div>
                   <div className="mt-2">训练方式：弱监督逻辑回归</div>
                   <div>样本数量：{aiSampleCount}</div>
                   <div>提取来源：Gemini API / Mock Fallback</div>
                   <div>最近训练：{aiLastTrained}</div>
                </div>
                
                <div className="flex gap-2">
                  <button onClick={handleTrainWeights} disabled={isTraining} className="flex-1 py-2 bg-[#2A2A2A] hover:bg-[#333333] border border-[#444] rounded text-xs transition-colors flex items-center justify-center gap-2">
                     {isTraining ? '训练中...' : '重新训练权重'}
                  </button>
                  <button onClick={handleTestExtraction} disabled={isExtracting} className="flex-1 py-2 bg-[#1A1A1A] text-[#D4AF37] hover:bg-[#D4AF37]/10 border border-[#D4AF37]/50 rounded text-xs transition-colors flex items-center justify-center gap-2">
                     测试 AI 抽取
                  </button>
                </div>
             </div>
          </div>
`;

content = content.replace(
  '</div>\n        </div>\n      </div>',
  '</div>\n' + aiModuleUI + '\n        </div>\n      </div>'
); // Adjusting the injection point slightly

// 4. Add the Test Modal
const testModalUI = `
      {/* AI Extraction Test Modal */}
      {showAiTest && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAiTest(false)}>
            <div className="bg-[#242424] border border-[#333333] w-full max-w-2xl rounded-lg shadow-2xl p-6 flex flex-col max-h-[80vh]" onClick={e=>e.stopPropagation()}>
               <div className="flex justify-between items-center pb-3 border-b border-[#333333]">
                 <h3 className="text-lg font-bold text-[#D4AF37]">AI 证据抽取测试</h3>
                 <button onClick={() => setShowAiTest(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5"/></button>
               </div>
               
               <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                 {isExtracting ? (
                    <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                       <RefreshCw className="w-8 h-8 animate-spin mb-4 text-[#D4AF37]" />
                       <div>正在调用 Gemini API 进行抽取，请稍候...</div>
                    </div>
                 ) : aiExtractionResult ? (
                    <div className="space-y-4 text-sm">
                       <div className="p-3 bg-[#1A1A1A] border border-[#333333] rounded">
                         <span className="text-gray-500 text-xs block mb-1">Source Engine:</span>
                         <span className="text-green-400 font-mono">{aiExtractionResult.source}</span>
                       </div>
                       
                       <div className="p-3 bg-[#1A1A1A] border border-[#333333] rounded">
                         <span className="text-[#D4AF37] font-semibold block mb-2">识别实体 (Entities)</span>
                         <div className="flex flex-wrap gap-2">
                           {aiExtractionResult.entities?.map((e:any, i:number) => (
                              <span key={i} className="px-2 py-1 bg-[#333333] rounded text-xs text-gray-200">{e.name} ({e.type})</span>
                           ))}
                         </div>
                       </div>
                       
                       <div className="p-3 bg-[#1A1A1A] border border-[#333333] rounded">
                         <span className="text-[#D4AF37] font-semibold block mb-2">关键词 (Keywords)</span>
                         <div className="flex flex-wrap gap-2">
                           {aiExtractionResult.keywords?.map((k:string, i:number) => (
                              <span key={i} className="px-2 py-1 border border-[#444] rounded text-xs text-gray-300">{k}</span>
                           ))}
                         </div>
                       </div>
                       
                       <div className="p-3 bg-[#1A1A1A] border border-[#333333] rounded">
                         <span className="text-[#D4AF37] font-semibold block mb-2">底层特征建议 (Suggested Raw Features)</span>
                         <pre className="text-xs font-mono text-gray-400 break-all whitespace-pre-wrap">
                           {JSON.stringify(aiExtractionResult.suggestedRawFeatures, null, 2)}
                         </pre>
                       </div>
                    </div>
                 ) : (
                    <div className="text-red-400 py-10 text-center">抽取失败或未返回数据</div>
                 )}
               </div>
            </div>
         </div>
      )}
`;

content = content.replace(
  '{/* 停用确认弹窗 */}',
  testModalUI + '\n      {/* 停用确认弹窗 */}'
);

fs.writeFileSync('src/pages/RuleEngine.tsx', content);
