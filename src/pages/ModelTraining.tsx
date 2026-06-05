import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Upload, Plus, Play, Info, Check, AlertTriangle } from 'lucide-react';
import { INDUSTRY_TYPES, DEFAULT_INDUSTRY_WEIGHTS } from '../config/industryWeights';

export default function ModelTraining() {
  const { isAdmin } = useAuth();
  
  const [industryType, setIndustryType] = useState('general');
  const [projectType, setProjectType] = useState('general');
  const [samples, setSamples] = useState([{ X1: 0, X2: 0, X3: 0, label: 1 }]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  const [trainingResult, setTrainingResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [currentWeights, setCurrentWeights] = useState<any>(null);

  const handleAddSample = () => {
    setSamples([...samples, { X1: 0, X2: 0, X3: 0, label: 1 }]);
  };

  const handleSampleChange = (index: number, field: string, value: string) => {
    const newSamples = [...samples];
    const numVal = parseFloat(value);
    newSamples[index] = { ...newSamples[index], [field]: isNaN(numVal) ? 0 : numVal };
    setSamples(newSamples);
  };

  const handleRemoveSample = (index: number) => {
    setSamples(samples.filter((_, i) => i !== index));
  };

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const processCsv = async (): Promise<any[]> => {
    if (!csvFile) return [];
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const rows = text.split('\n').filter(r => r.trim());
          if (rows.length < 2) return resolve([]);
          
          const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
          
          const parsed = rows.slice(1).map(row => {
            const cols = row.split(',').map(c => c.trim());
            const sample: any = {};
            headers.forEach((h, i) => {
               if (h === 'x1' || h === 'X1') sample.X1 = parseFloat(cols[i]);
               if (h === 'x2' || h === 'X2') sample.X2 = parseFloat(cols[i]);
               if (h === 'x3' || h === 'X3') sample.X3 = parseFloat(cols[i]);
               if (h === 'label') sample.label = parseFloat(cols[i]);
               if (h === 'industrytype' || h === 'industry_type') sample.industryType = cols[i];
               if (h === 'projecttype' || h === 'project_type') sample.projectType = cols[i];
            });
            return sample;
          });
          resolve(parsed.filter(s => s.X1 !== undefined && s.label !== undefined));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('CSV read error'));
      reader.readAsText(csvFile);
    });
  };

  const fetchCurrentWeights = async () => {
    try {
      const res = await fetch(`/api/ml/industry-weights/${industryType}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentWeights(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTrain = async () => {
    if (!isAdmin) {
       setErrorMsg("暂无权限，请切换管理员模式。");
       return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setTrainingResult(null);
    setCurrentWeights(null);

    try {
      let finalSamples = [...samples];
      if (csvFile) {
         const csvSamples = await processCsv();
         finalSamples = [...finalSamples, ...csvSamples];
      }
      
      finalSamples = finalSamples.filter(s => !isNaN(s.X1) && !isNaN(s.X2) && !isNaN(s.X3) && !isNaN(s.label));

      if (finalSamples.length === 0) {
        throw new Error("无有效样本提交");
      }

      const res = await fetch('/api/ml/train-weights', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-mode': 'true'
        },
        body: JSON.stringify({
          industryType,
          projectType,
          method: 'logistic',
          samples: finalSamples
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Training failed');
      }

      const data = await res.json();
      setTrainingResult(data);
      setSuccessMsg("模型融合学习完成！");
    } catch (e: any) {
      setErrorMsg(e.message || "训练失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a] text-gray-200">
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-sans text-gray-100 flex items-center gap-2">
            <Play className="w-5 h-5 text-[#0091DA]" /> 模型训练 / 样本投喂
          </h2>
          <p className="text-sm text-gray-400 mt-2">只有管理员可以提交确诊的历史审计样本。模型采用 <span className="text-[#0091DA]">行业先验权重 + 样本训练权重融合</span> 的机制。</p>
        </div>

        {!isAdmin && (
          <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded text-yellow-500 rounded flex items-start gap-3">
             <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
             <div className="text-sm">
               <div className="font-semibold mb-1">鉴权受限</div>
               普通用户无权操作。如需投喂样本训练模型，请通过左下角的全局角色控制切换至 <span className="font-mono text-xs bg-yellow-900/50 px-1 rounded">Admin</span>。
             </div>
          </div>
        )}

        <div className="bg-[#121212] border border-[#0B2454] rounded-lg p-6">
           <h3 className="text-lg font-medium mb-6 flex items-center gap-2 border-b border-[#1E4D92] pb-3">
             配置目标模型
           </h3>
           
           <div className="grid grid-cols-2 gap-6 mb-6">
             <div>
               <label className="block text-sm font-medium text-gray-400 mb-2">行业门类 (Industry Type)</label>
               <select 
                 className="w-full bg-[#03102A] border border-[#1E4D92] rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#0091DA]"
                 value={industryType}
                 onChange={e => setIndustryType(e.target.value)}
                 disabled={!isAdmin}
               >
                 {Object.entries(INDUSTRY_TYPES).map(([k, v]) => (
                   <option key={k} value={k}>{v.label} ({k})</option>
                 ))}
               </select>
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-400 mb-2">二级项目分类 (Project Type)</label>
               <input 
                 className="w-full bg-[#03102A] border border-[#1E4D92] rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#0091DA]"
                 value={projectType}
                 onChange={e => setProjectType(e.target.value)}
                 placeholder="例如: IPO关联交易核查"
                 disabled={!isAdmin}
               />
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#121212] border border-[#0B2454] rounded-lg p-6 flex flex-col h-full">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2 border-b border-[#1E4D92] pb-3">
              手工输入样本
            </h3>
            
            <div className="space-y-3 flex-1">
              {samples.map((s, i) => (
                <div key={i} className="flex gap-2 items-center bg-[#03102A] border border-[#1E4D92] p-2 rounded">
                  <span className="text-xs text-gray-500 w-4">{i+1}.</span>
                  <input type="number" step="0.01" value={s.X1} onChange={e => handleSampleChange(i, 'X1', e.target.value)} className="w-16 bg-[#0B2454] border border-[#1E4D92] rounded text-xs px-1 py-1" placeholder="X1" disabled={!isAdmin} />
                  <input type="number" step="0.01" value={s.X2} onChange={e => handleSampleChange(i, 'X2', e.target.value)} className="w-16 bg-[#0B2454] border border-[#1E4D92] rounded text-xs px-1 py-1" placeholder="X2" disabled={!isAdmin} />
                  <input type="number" step="0.01" value={s.X3} onChange={e => handleSampleChange(i, 'X3', e.target.value)} className="w-16 bg-[#0B2454] border border-[#1E4D92] rounded text-xs px-1 py-1" placeholder="X3" disabled={!isAdmin} />
                  <select value={s.label} onChange={e => handleSampleChange(i, 'label', e.target.value)} className="w-20 bg-[#0B2454] border border-[#1E4D92] rounded text-xs px-1 py-1" disabled={!isAdmin}>
                    <option value={1}>1 (确认风险)</option>
                    <option value={0}>0 (无风险)</option>
                  </select>
                  <button onClick={() => handleRemoveSample(i)} className="text-red-500/70 hover:text-red-500 ml-auto px-2" disabled={!isAdmin}>×</button>
                </div>
              ))}
              {samples.length === 0 && <div className="text-sm text-gray-500 py-4 text-center">暂无录入样本</div>}
            </div>
            
            <button onClick={handleAddSample} className="w-full mt-4 flex items-center justify-center gap-2 border border-dashed border-[#1E4D92] bg-[#03102A] py-2 rounded text-sm text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors" disabled={!isAdmin}>
              <Plus className="w-4 h-4" /> 增加样本行
            </button>
          </div>

          <div className="bg-[#121212] border border-[#0B2454] rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2 border-b border-[#1E4D92] pb-3">
              CSV 批量上传
            </h3>
            
            <div className="bg-[#03102A] border border-dashed border-[#1E4D92] rounded p-8 text-center pb-12 relative h-48 flex flex-col justify-center items-center">
              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
              <div className="text-sm text-gray-400">
                支持拖拽或选取 CSV 文件
              </div>
              <div className="text-xs text-gray-600 mt-2">
                需包含列: X1, X2, X3, label
              </div>
              <input 
                 type="file" 
                 accept=".csv"
                 onChange={handleCsvChange}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                 disabled={!isAdmin}
              />
              {csvFile && (
                <div className="mt-4 text-sm text-[#0091DA] font-medium border border-[#0091DA]/30 bg-[#0091DA]/10 px-3 py-1 rounded inline-block">
                  已选择: {csvFile.name}
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleTrain} 
                disabled={loading || !isAdmin}
                className="bg-[#0091DA] text-black px-6 py-2.5 rounded font-medium flex items-center gap-2 hover:bg-[#F3CE5E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : <Play className="w-4 h-4" />}
                {loading ? '学习训练中...' : '开始融合学习'}
              </button>
            </div>
            
            {errorMsg && <div className="mt-4 text-red-500 text-sm bg-red-900/20 p-3 rounded border border-red-900">{errorMsg}</div>}
            {successMsg && <div className="mt-4 text-green-500 text-sm bg-green-900/20 p-3 rounded border border-green-900">{successMsg}</div>}
            
          </div>
        </div>

        {trainingResult && (
          <div className="bg-[#121212] border border-[#0B2454] rounded-lg p-6">
            <div className="flex items-center justify-between border-b border-[#1E4D92] pb-3 mb-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" /> 训练与融合结果
              </h3>
              <div className="text-xs text-gray-500 font-mono">
                样本数量: {trainingResult.sampleCount} | Alpha: {trainingResult.alpha?.toFixed(3)} | 状态: {trainingResult.persisted ? '已持久化' : '默认回调'}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
               <div className="bg-[#03102A] p-4 rounded border border-[#333]">
                 <div className="text-xs text-gray-400 mb-2">默认行业先验 (W_default)</div>
                 <div className="font-mono text-sm space-y-1">
                   <div>W1: {trainingResult.defaultWeights?.W1.toFixed(4)}</div>
                   <div>W2: {trainingResult.defaultWeights?.W2.toFixed(4)}</div>
                   <div>W3: {trainingResult.defaultWeights?.W3.toFixed(4)}</div>
                   <div>b : {trainingResult.defaultWeights?.b.toFixed(4)}</div>
                 </div>
               </div>
               <div className="bg-[#03102A] p-4 rounded border border-[#333]">
                 <div className="text-xs text-gray-400 mb-2">本次样本学习 (W_learned)</div>
                 <div className="font-mono text-sm space-y-1 text-blue-400">
                   <div>W1: {trainingResult.learnedWeights?.W1.toFixed(4)}</div>
                   <div>W2: {trainingResult.learnedWeights?.W2.toFixed(4)}</div>
                   <div>W3: {trainingResult.learnedWeights?.W3.toFixed(4)}</div>
                   <div>b : {trainingResult.learnedWeights?.b.toFixed(4)}</div>
                 </div>
               </div>
               <div className="bg-[#332a1c] p-4 rounded border border-[#0091DA]/50">
                 <div className="text-xs text-[#0091DA] mb-2 flex justify-between">
                    <span>最终融合结果 (W_final)</span>
                    <button onClick={fetchCurrentWeights} className="underline hover:text-white">验证生效</button>
                 </div>
                 <div className="font-mono text-sm space-y-1 text-[#F3CE5E]">
                   <div>W1: {trainingResult.finalWeights?.W1.toFixed(4)}</div>
                   <div>W2: {trainingResult.finalWeights?.W2.toFixed(4)}</div>
                   <div>W3: {trainingResult.finalWeights?.W3.toFixed(4)}</div>
                   <div>b : {trainingResult.finalWeights?.b.toFixed(4)}</div>
                 </div>
               </div>
            </div>
          </div>
        )}
        
        {currentWeights && (
          <div className="bg-[#1a1c23] border border-[#2c3345] rounded-lg p-6">
            <h4 className="text-sm font-medium text-blue-400 mb-3">当前生效的 {industryType} 模型权重:</h4>
            <div className="font-mono text-xs text-gray-300">
               <div>来源: {currentWeights.source}</div>
               <div>W1: {currentWeights.weights?.W1}</div>
               <div>W2: {currentWeights.weights?.W2}</div>
               <div>W3: {currentWeights.weights?.W3}</div>
               <div>b : {currentWeights.weights?.b}</div>
               <div className="mt-2 text-gray-500 whitespace-pre-wrap">{JSON.stringify(currentWeights.rationale, null, 2)}</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
