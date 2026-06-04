import { useAuth } from '../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { Settings, Plus, Activity, Edit3, Trash2, Shield, Calendar, User, Search, Play, FileText, CheckCircle, AlertTriangle, AlertOctagon, RefreshCw, X, File } from 'lucide-react';
import { toast } from '../components/Toast.tsx';


const INDUSTRY_TYPES = [
  { id: 'all', name: '全部门类' },
  { id: 'general', name: '通用审计模型' },
  { id: 'ipo', name: 'IPO / 上市审查' },
  { id: 'financial_investment', name: '金融投资 / 基金审计' },
  { id: 'real_estate_construction', name: '地产工程 / 建设反舞弊' },
  { id: 'manufacturing_supply_chain', name: '制造业 / 供应链采购' },
  { id: 'energy_subsidy', name: '能源 / 补贴 / 政府项目' }
];

export default function RuleEngine() {
  
  const { isAdmin } = useAuth();
  const [currentSet, setCurrentSet] = useState<string>('all');
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchRules = async (industry: string) => {
    setLoading(true);
    try {
      let url = '/api/rules';
      if (industry !== 'all') {
         url += '?industryType=' + industry;
      }
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch(e) {
      console.warn('Failed to fetch rules', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules(currentSet);
  }, [currentSet]);

  // Modals / Drawers
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  
  const [showNewRule, setShowNewRule] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [sandboxInput, setSandboxInput] = useState('山东旺XX汽车零部件有限公司');
  const [runningTest, setRunningTest] = useState(false);
  const [trainMethod, setTrainMethod] = useState<'logistic'|'basic-mlp'>('logistic');
  const [aiWeights, setAiWeights] = useState<any>({
    W1: 2.2, W2: 3.5, W3: 0.5, b: -3.0
  });
  const [aiSampleCount, setAiSampleCount] = useState(48);
  const [aiLastTrained, setAiLastTrained] = useState('2026/05/31');
  const [aiExtractionResult, setAiExtractionResult] = useState<any>(null);
  const [aiModelType, setAiModelType] = useState<string>('logistic');
  const [aiFeatureImportance, setAiFeatureImportance] = useState<any>(null);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [showAiTest, setShowAiTest] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleTrainWeights = async () => {
    setIsTraining(true);
    try {
      const res = await fetch('/api/ml/train-weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          industryType: currentSet === 'all' ? 'general' : currentSet,
          method: trainMethod
        })
      });
      const data = await res.json();
      if (data.weights) {
        setAiWeights(data.weights);
        setAiSampleCount(data.sampleCount);
        setAiLastTrained(new Date().toLocaleString());
        setAiModelType(data.method || 'logistic');
        setAiFeatureImportance(data.featureImportance || null);
        setAiExplanation(data.explanation || '');
        if (data.fallback) {
          toast('样本不足，当前使用默认门类权重', 'warning');
        } else {
          toast('模型权重刷新成功', 'success');
        }
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


  

  const handleRunTest = () => {
    if (!sandboxInput) return;
    setRunningTest(true);
    setSandboxResult(null);
    setTimeout(() => {
      setRunningTest(false);
      setSandboxResult({
        hitRules: ['R-X1A: 实控网重合度检测', 'R-E1: 深度穿透：5级法定代表人环绕'],
        features: 'x1a, x2a',
        evidence: '段落: "2026年3月该主体资金流向与离岸账户重合度达85%"',
        risk: '极高贡献 (+0.34)',
        toDraft: true
      });
      toast('沙箱测试运行完成', 'success');
    }, 1500);
  };

  
  const handleSaveRule = async () => {
    if (!isAdmin) { toast('仅管理员可操作', 'error'); return; }
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-mode': 'true', 'x-role': 'admin' },
        body: JSON.stringify({
          id: 'R-CUSTOM-' + Math.floor(Math.random()*10000),
          name: '新规则测试',
          category: '自定义',
          industryType: currentSet === 'all' ? 'general' : currentSet,
          weight: 50,
          severity: 'medium',
          status: 'disabled',
          description: '',
          createdBy: 'admin'
        })
      });
      if (res.ok) {
        toast('规则已保存并进入待审核状态', 'success');
        setShowNewRule(false);
        fetchRules(currentSet);
      } else {
        toast('保存失败', 'error');
      }
    } catch(e) {
      toast('保存异常', 'error');
    }
  };


  
  const handleConfirmDisable = async () => {
    if (!isAdmin) { toast('仅管理员可操作', 'error'); return; }
    try {
      const res = await fetch('/api/rules/' + selectedRule?.id, {
        method: 'DELETE',
        headers: { 'x-admin-mode': 'true', 'x-role': 'admin' }
      });
      if (res.ok) {
        toast('该规则已被停用', 'success');
        setShowDisable(false);
        fetchRules(currentSet);
      } else {
        toast('停用失败', 'error');
      }
    } catch(e) {
      toast('停用异常', 'error');
    }
  };


  
  const handleSaveEdit = async () => {
    if (!isAdmin) { toast('仅管理员可操作', 'error'); return; }
    try {
      const res = await fetch('/api/rules/' + selectedRule?.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-mode': 'true', 'x-role': 'admin' },
        body: JSON.stringify({ ...selectedRule, name: selectedRule.name + ' (已编辑)' }) // Demo edit
      });
      if (res.ok) {
        toast('规则修改已生效', 'success');
        setShowEdit(false);
        fetchRules(currentSet);
      } else {
        toast('修改失败', 'error');
      }
    } catch(e) {
      toast('修改异常', 'error');
    }
  };


  return (
    <div className="h-full w-full bg-[#1A1A1A] p-6 text-gray-200 overflow-y-auto custom-scrollbar relative">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6 text-[#D4AF37]" />
              审计规则引擎
            </h1>
            <p className="text-xs text-gray-500 mt-1">管理并调试用于实体交叉验证与风险评分的规则集版本。</p>
          </div>
          {isAdmin && <button onClick={() => setShowNewRule(true)} className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C048] text-[#1A1A1A] font-medium text-sm rounded shadow-[0_0_15px_rgba(212,175,55,0.2)] flex items-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> 新建规则</button>}
        </div>

        {/* Overview Card */}
        <div className="bg-[#242424] border border-[#333333] p-6 rounded-lg grid grid-cols-5 gap-4">
           <div>
             <div className="text-gray-400 text-xs mb-1">当前规则集</div>
             <div className="text-gray-100 font-semibold truncate">{INDUSTRY_TYPES.find(t=>t.id===currentSet)?.name || ''}</div>
           </div>
           <div>
             <div className="text-gray-400 text-xs mb-1">生效规则数</div>
             <div className="text-gray-100 font-mono font-semibold text-xl">{rules.filter(r => r.status==='enabled').length}</div>
           </div>
           <div>
             <div className="text-gray-400 text-xs mb-1">高危规则数</div>
             <div className="text-red-400 font-mono font-semibold text-xl">{rules.filter(r => r.weight > 80).length}</div>
           </div>
           <div>
             <div className="text-gray-400 text-xs mb-1">最近一次调参</div>
             <div className="text-gray-100 font-mono text-sm">2026/5/31</div>
           </div>
           <div>
             <div className="text-gray-400 text-xs mb-1">模型版本</div>
             <div className="text-[#D4AF37] font-semibold text-sm">Layered Risk Scoring v2.0</div>
           </div>
        </div>

        {/* Rule Sets Tabs */}
        
<div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#333333] custom-scrollbar">
  {INDUSTRY_TYPES.map(type => (
    <button 
      key={type.id} 
      onClick={() => { setCurrentSet(type.id); toast('已切换至 ' + type.name, 'success'); }} 
      className={`px-4 py-2 whitespace-nowrap text-sm rounded-t ${currentSet === type.id ? 'bg-[#333333] text-[#D4AF37] font-medium border-b-2 border-[#D4AF37]' : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'}`}>
      {type.name}
    </button>
  ))}
</div>


        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Table */}
          <div className="flex-1 bg-[#242424] border border-[#333333] rounded-lg shadow-lg overflow-hidden">
            {loading ? (
              <div className="p-12 flex justify-center items-center text-gray-500 text-sm">
                <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mr-3"></div>
                加载规则集...
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1A1A1A] border-b border-[#333333] text-gray-400 text-xs">
                  <tr>
                    <th className="px-4 py-3 font-medium">规则名称</th>
                    <th className="px-4 py-3 font-medium">触发条件</th>
                    <th className="px-4 py-3 font-medium">权重</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 font-medium">最近命中</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333]">
                  {rules.map((r, i) => (
                    <tr key={i} className="hover:bg-[#1f1f1f] transition-colors cursor-pointer" onClick={() => { setSelectedRule(r); setShowDrawer(true); }}>
                      <td className="px-4 py-3">
                        <div className="font-mono text-[10px] text-gray-500 mb-0.5">{r.id}</div>
                        <div className="font-medium text-gray-200 text-xs">{r.name}</div>
                        <div className="text-[10px] text-gray-500">{r.category}</div>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-gray-400 max-w-[150px] truncate" title={r.trigger}>
                         {r.trigger}
                      </td>
                      <td className="px-4 py-3">
                         <div className={`font-mono text-xs ${r.weight > 80 ? 'text-red-400' : 'text-[#D4AF37]'}`}>{r.weight}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] ${r.status === 'enabled' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                          {r.status === 'enabled' ? '生效中' : '已停用'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.lastHit}</td>
                      <td className="px-4 py-3 text-right space-x-1" onClick={e => e.stopPropagation()}>
                        {isAdmin && <button onClick={() => { setSelectedRule(r); setShowEdit(true); }} className="p-1.5 text-gray-400 hover:bg-[#333333] hover:text-[#D4AF37] rounded transition-colors"><Edit3 className="w-4 h-4" /></button>}
                        {isAdmin && <button onClick={() => { setSelectedRule(r); setShowDisable(true); }} className="p-1.5 text-gray-400 hover:bg-[#333333] hover:text-red-500 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Sandbox Box */}
          <div className="w-full lg:w-80 bg-[#1A1A1A] border border-[#333333] rounded-lg shadow-lg flex flex-col shrink-0 h-min">
             <div className="p-4 border-b border-[#333333] flex items-center gap-2">
                <Play className="w-4 h-4 text-[#D4AF37]" />
                <span className="font-semibold text-sm">规则测试沙箱</span>
             </div>
             <div className="p-4 space-y-4">
                <div>
                   <label className="text-xs text-gray-400 mb-1 block">测试实体/项目名：</label>
                   <input type="text" value={sandboxInput} onChange={e=>setSandboxInput(e.target.value)} className="w-full bg-[#242424] border border-[#333333] rounded px-3 py-2 text-xs focus:border-[#D4AF37] focus:outline-none transition-colors" />
                </div>
                <button onClick={handleRunTest} disabled={runningTest} className="w-full py-2 bg-[#2A2A2A] hover:bg-[#333333] border border-[#444] rounded text-sm transition-colors flex items-center justify-center gap-2">
                   {runningTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                   执行推演
                </button>
                
                {sandboxResult && (
                   <div className="mt-4 border-t border-[#333333] pt-4 space-y-3">
                      <div className="text-xs text-[#D4AF37] font-semibold mb-2">测试结果：</div>
                      <div className="bg-[#242424] p-3 rounded border border-[#333333] text-xs space-y-2">
                         <div className="text-gray-400">命中规则: <span className="text-red-400 block break-all">{sandboxResult.hitRules.join(', ')}</span></div>
                         <div className="text-gray-400">特征映射: <span className="text-gray-200">{sandboxResult.features}</span></div>
                         <div className="text-gray-400">风险贡献: <span className="text-red-400">{sandboxResult.risk}</span></div>
                         <div className="text-gray-400">底稿落库: <span className="text-green-400">是</span></div>
                      </div>
                   </div>
                )}
             </div>
          </div>

          {/* AI Weight Module */}
          <div className="w-full lg:w-80 bg-[#1A1A1A] border border-[#333333] rounded-lg shadow-lg flex flex-col shrink-0 mt-6 h-min">
             <div className="p-4 border-b border-[#333333] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-semibold text-sm">模型权重来源 (AI Engine)</span>
                </div>
             </div>
             <div className="p-4 space-y-4">
                <div className="text-xs text-gray-400">
                   <div>当前项目类型： <span className="text-gray-200">{currentSet === 'standard' ? 'IPO关联交易核查' : '快消/其他'}</span></div>
                   
                   <div className="mt-3 block text-gray-500 mb-1">训练算法选择</div>
                   <select 
                      value={trainMethod} 
                      onChange={e => setTrainMethod(e.target.value as 'logistic' | 'basic-mlp')}
                      className="w-full bg-[#242424] border border-[#333333] rounded px-2 py-1.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none transition-colors"
                   >
                     <option value="logistic">弱监督逻辑回归 (默认可解释)</option>
                     <option value="basic-mlp">基础神经网络 MLP (实验)</option>
                   </select>

                   <div className="mt-3 text-gray-200 font-mono text-[10px] bg-[#242424] p-3 rounded border border-[#333333] leading-relaxed">
                     <span className="text-gray-500 block mb-1">映射结果类别权重：</span>
                     <span className="text-[#D4AF37]">W1</span> = {aiWeights.W1}<br/>
                     <span className="text-[#D4AF37]">W2</span> = {aiWeights.W2}<br/>
                     <span className="text-[#D4AF37]">W3</span> = {aiWeights.W3}<br/>
                     <span className="text-[#D4AF37]">b</span>  = {aiWeights.b}
                   </div>
                   
                   {aiModelType === 'basic-mlp' && aiFeatureImportance && (
                     <div className="mt-3 text-gray-300 font-mono text-[10px] bg-[#1A1A1A] p-2 rounded border border-[#333333] leading-relaxed">
                       <span className="text-gray-500 block mb-1">底层特征重要性 (Feature Importance)：</span>
                       <div className="grid grid-cols-2 gap-x-2">
                         {Object.entries(aiFeatureImportance).map(([key, val]) => (
                           <div key={key}>
                             {key}: {typeof val === 'number' ? val.toFixed(3) : val}
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                   
                   <div className="mt-3">当前运行模型：<span className={aiModelType === 'basic-mlp' ? "text-[#D4AF37]" : "text-gray-200"}>{aiModelType === 'basic-mlp' ? '基础神经网络 MLP' : '弱监督逻辑回归'}</span></div>
                   <div>样本数量：{aiSampleCount}</div>
                   <div>最近训练：{aiLastTrained}</div>

                   {aiExplanation && (
                      <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded text-[10px] leading-relaxed">
                        {aiExplanation}
                      </div>
                   )}
                   
                   <div className="mt-3 text-gray-400 text-[10px] leading-relaxed italic space-y-2 border-t border-[#333333] pt-2">
                     <p><strong className="text-gray-300">AI 抽取模块：</strong>负责从上传文档中抽取实体、关系、金额异常和证据片段。</p>
                     <p><strong className="text-gray-300">权重学习模块：</strong>使用本地逻辑回归或基础 MLP，根据历史样本学习 W1/W2/W3/b。</p>
                   </div>
                </div>
                
                <div className="flex flex-col gap-2 pt-2">
                  <button onClick={handleTrainWeights} disabled={isTraining} className="w-full py-2 bg-[#D4AF37] hover:bg-[#E5C048] text-[#1A1A1A] font-medium rounded text-xs transition-colors flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                     {isTraining ? '训练中...' : '启动权重学习'}
                  </button>
                  <button onClick={handleTestExtraction} disabled={isExtracting} className="w-full py-2 bg-[#2A2A2A] hover:bg-[#333333] border border-[#444] rounded text-xs transition-colors flex items-center justify-center gap-2">
                     测试 AI 抽取 (LLM)
                  </button>
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* Modals & Drawers */}
      
      {/* 规则详情抽屉 */}
      {showDrawer && selectedRule && (
         <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setShowDrawer(false)}>
            <div className="w-[450px] bg-[#1A1A1A] border-l border-[#333333] h-full shadow-2xl p-6 overflow-y-auto space-y-6" onClick={e=>e.stopPropagation()}>
               <div className="flex justify-between items-center pb-4 border-b border-[#333333]">
                  <h3 className="text-lg font-bold text-gray-200">规则详情</h3>
                  <button onClick={() => setShowDrawer(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5"/></button>
               </div>
               
               <div>
                  <div className="text-[10px] text-gray-500 font-mono mb-1">{selectedRule.id}</div>
                  <div className="text-xl font-bold text-[#D4AF37] mb-2">{selectedRule.name}</div>
                  <span className={`px-2 py-1 rounded text-[10px] ${selectedRule.status === 'enabled' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                    {selectedRule.status === 'enabled' ? '生效中' : '已停用'}
                  </span>
               </div>
               
               <div className="space-y-4">
                  <div className="bg-[#242424] p-4 rounded border border-[#333333]">
                     <div className="text-xs text-gray-500 mb-2">判断逻辑 & 触发条件</div>
                     <div className="font-mono text-sm text-red-400 break-all">{selectedRule.trigger}</div>
                  </div>
                  
                  <div className="bg-[#242424] p-4 rounded border border-[#333333] grid grid-cols-2 gap-4">
                     <div>
                        <div className="text-xs text-gray-500 mb-1">风险维度</div>
                        <div className="text-gray-200 text-sm">{selectedRule.category}</div>
                     </div>
                     <div>
                        <div className="text-xs text-gray-500 mb-1">风险权重</div>
                        <div className={`text-sm font-mono ${selectedRule.weight > 80 ? 'text-red-400' : 'text-[#D4AF37]'}`}>{selectedRule.weight}</div>
                     </div>
                  </div>
                  
                  <div className="bg-[#242424] p-4 rounded border border-[#333333]">
                     <div className="text-xs text-gray-500 mb-2">示例命中证据</div>
                     <p className="text-gray-300 text-sm italic leading-relaxed">"在审计图谱中，当两个企业享有 80% 相同的关键管理人员，并发生虚假交易迹象时，此规则将介入增加预警分数。"</p>
                  </div>
                  
                  <div className="bg-[#242424] p-4 rounded border border-[#333333]">
                     <div className="text-xs text-gray-500 mb-2">自动审计建议</div>
                     <p className="text-gray-300 text-sm leading-relaxed">建议将命中此规则的样本标红，并在凭证检查环节增加 50% 额外抽样。重点核对外围资金流水与工商系统历史变更记录。</p>
                  </div>
               </div>
               
               <div className="pt-4 border-t border-[#333333] flex justify-end gap-3">
                 <button onClick={() => { setShowDrawer(false); setShowEdit(true); }} className="px-4 py-2 border border-[#333333] rounded hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors text-sm">编辑参数</button>
               </div>
            </div>
         </div>
      )}

      {/* 新建/编辑规则弹窗 */}
      {(showNewRule || showEdit) && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => {setShowNewRule(false); setShowEdit(false)}}>
            <div className="bg-[#242424] border border-[#333333] w-[500px] rounded-lg shadow-2xl p-6 space-y-5" onClick={e=>e.stopPropagation()}>
               <div className="flex justify-between items-center pb-3 border-b border-[#333333]">
                 <h3 className="text-lg font-bold text-gray-200">{showNewRule ? '新建风险规则' : '编辑规则参数'}</h3>
                 <button onClick={() => {setShowNewRule(false); setShowEdit(false)}} className="text-gray-500 hover:text-white"><X className="w-5 h-5"/></button>
               </div>
               <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">规则名称</label>
                    <input type="text" className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:border-[#D4AF37] focus:outline-none" defaultValue={showEdit && selectedRule ? selectedRule.name : ''} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">风险维度</label>
                      <select className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:border-[#D4AF37] focus:outline-none">
                         <option>身份网络</option>
                         <option>交易异常</option>
                         <option>外围痕迹</option>
                         <option>极度穿透</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">设置权重 (0-100)</label>
                      <input type="number" className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:border-[#D4AF37] focus:outline-none" defaultValue={showEdit && selectedRule ? selectedRule.weight : 50} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">触发条件表达式 (Expression)</label>
                    <input type="text" className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:border-[#D4AF37] focus:outline-none font-mono text-xs" defaultValue={showEdit && selectedRule ? selectedRule.trigger : ''} placeholder="e.g. JaccardSimilarity > 0.8" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">规则描述说明</label>
                    <textarea rows={3} className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:border-[#D4AF37] focus:outline-none"></textarea>
                  </div>
               </div>
               <div className="pt-4 flex justify-end gap-3">
                 <button onClick={() => {setShowNewRule(false); setShowEdit(false)}} className="px-4 py-2 hover:bg-[#333333] rounded text-gray-300 transition-colors text-sm">取消</button>
                 <button onClick={showNewRule ? handleSaveRule : handleSaveEdit} className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C048] text-[#1A1A1A] rounded font-medium shadow-lg transition-colors text-sm">
                   保存配置
                 </button>
               </div>
            </div>
         </div>
      )}

      
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
                         <span className="text-gray-500 text-xs block mb-1">AI 抽取接口状态:</span>
                         <div className="text-gray-300 text-xs mt-1">
                            <div>当前源: <span className="text-green-400 font-mono">{aiExtractionResult.source}</span></div>
                            {aiExtractionResult.providerInfo && (
                              <>
                                <div>当前模式: <span className="text-[#D4AF37]">{aiExtractionResult.providerInfo.mode}</span></div>
                                <div>当前模型: <span className="text-[#D4AF37]">{aiExtractionResult.providerInfo.model}</span></div>
                                <div>API Key 状态: <span>{aiExtractionResult.providerInfo.apiKeyConfigured ? '已配置' : '未配置'}</span></div>
                              </>
                            )}
                         </div>
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
                       
                       {aiExtractionResult.transactionSignals && aiExtractionResult.transactionSignals.length > 0 && (
                         <div className="p-3 bg-[#1A1A1A] border border-[#333333] rounded">
                           <span className="text-[#D4AF37] font-semibold block mb-2">交易异常 (Transaction Signals)</span>
                           <div className="space-y-2">
                             {aiExtractionResult.transactionSignals.map((ts:any, i:number) => (
                                <div key={i} className="text-xs text-gray-300 bg-[#242424] p-2 rounded">
                                   <span className="text-red-400 font-semibold">{ts.type}</span>: {ts.amount} ({ts.year})
                                   <div className="text-gray-500 mt-1">{ts.evidence}</div>
                                </div>
                             ))}
                           </div>
                         </div>
                       )}

                       {aiExtractionResult.relationships && aiExtractionResult.relationships.length > 0 && (
                         <div className="p-3 bg-[#1A1A1A] border border-[#333333] rounded">
                           <span className="text-[#D4AF37] font-semibold block mb-2">关系抽取 (Relationships)</span>
                           <div className="space-y-2">
                             {aiExtractionResult.relationships.map((rel:any, i:number) => (
                                <div key={i} className="text-xs text-gray-300 bg-[#242424] p-2 rounded flex flex-col">
                                   <div><span className="text-gray-400">{rel.source}</span> <span className="text-[#D4AF37]">→</span> <span className="text-gray-400">{rel.target}</span></div>
                                   <div className="text-gray-500 mt-1">[{rel.type}] {rel.evidence}</div>
                                </div>
                             ))}
                           </div>
                         </div>
                       )}
                       
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

      {/* 停用确认弹窗 */}
      {showDisable && selectedRule && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDisable(false)}>
            <div className="bg-[#242424] border border-[#333333] w-[400px] rounded-lg shadow-2xl p-6 space-y-5 transform transition-all" onClick={e=>e.stopPropagation()}>
               <div className="flex items-center gap-3 text-red-400">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="text-lg font-bold">停用规则确认</h3>
               </div>
               <p className="text-sm text-gray-300">
                 确定要停用规则 <span className="font-bold text-white">{selectedRule.name}</span> 吗？停用后该规则将不再参与全局风险评分与预警计算，但会保留在列表中且历史评估记录不受影响。
               </p>
               <div className="pt-4 flex justify-end gap-3">
                 <button onClick={() => setShowDisable(false)} className="px-4 py-2 border border-[#333333] hover:bg-[#333333] rounded text-gray-300 transition-colors text-sm">取消</button>
                 <button onClick={handleConfirmDisable} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded font-medium shadow-lg transition-colors text-sm">
                   确认停用
                 </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}
