import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Folder, Clock, Activity, Search, X, Upload, MoreHorizontal, FileText, Database, User, Shield } from 'lucide-react';
import { toast } from '../components/Toast.tsx';
import { mockProjects, getMockProjects } from '../lib/mockData.ts';
import { useAuth } from '../context/AuthContext';

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.txt'];


const indNameMap: Record<string, string> = {
  general: '通用审计模型',
  ipo: 'IPO / 上市审查',
  financial_investment: '金融投资 / 基金审计',
  real_estate_construction: '地产工程 / 建设反舞弊',
  manufacturing_supply_chain: '制造业 / 供应链采购',
  energy_subsidy: '能源 / 补贴 / 政府项目'
};

import { getRiskVisual } from '../utils/riskVisual';

export default function ProjectList() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', scenario: 'IPO审查' });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [systemMode, setSystemMode] = useState<'full' | 'demo-readonly' | 'loading'>('loading');
  const [systemMessage, setSystemMessage] = useState('');
  const { isAdmin } = useAuth();

  useEffect(() => {
    // Health check
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
         setSystemMode(data.mode);
         setSystemMessage(data.message);
      })
      .catch(() => {
         setSystemMode('demo-readonly');
         setSystemMessage('健康检查请求失败，进入系统降级模式。');
      });

    const localProjects = getMockProjects().map((p:any) => ({
      ...p,
      riskScore: Math.round(Number(p.riskScore ?? 0))
    }));
    setProjects(localProjects);
    setLoading(false);
    console.log('[AuditEye] ProjectList loaded demo projects from local mockData', localProjects.map((p:any) => ({ id: p.id, riskScore: p.riskScore })));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles: File[] = Array.from(e.target.files);
      const validFiles: File[] = [];
      let hasInvalidType = false;
      let hasInvalidSize = false;
      
      const MAX_FILE_SIZE = 4.3 * 1024 * 1024; // 4.3MB

      for (const file of selectedFiles) {
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!ALLOWED_EXTS.includes(ext)) {
          hasInvalidType = true;
        } else if (file.size > MAX_FILE_SIZE) {
          hasInvalidSize = true;
        } else {
          validFiles.push(file);
        }
      }
      
      if (hasInvalidType) {
        toast('仅支持 PDF、DOC、DOCX、TXT 文件', 'error');
      }
      if (hasInvalidSize) {
        toast('文件太大，请压缩后重试', 'error');
      }
      
      // Merge with existing files
      setFiles(prev => [...prev, ...validFiles]);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!isAdmin) {
      toast('暂无编辑或删除该项目的权限，请通过管理员登录', 'error');
      return;
    }
    if (window.confirm('确认删除该项目吗？此操作不可恢复')) {
      try {
        const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) {
          if (data.errorCode === 'DEMO_PROJECT') {
            toast('演示模板不可删除', 'error');
          } else {
            toast('删除失败，请重试', 'error');
          }
        } else {
          toast('项目已删除', 'success');
          setProjects(prev => prev.filter(p => p.id !== projectId));
        }
      } catch (err) {
        toast('删除失败，请重试', 'error');
      }
    }
  };

  const createProject = async () => {
    if (systemMode === 'demo-readonly') {
      return toast("当前系统为只读模式，无法创建项目。请检查数据库与 Blob 配置是否初始化。", "error");
    }

    if (!newProject.name.trim()) return toast("项目名称不能为空", "warning");
    if (files.length === 0) return toast("请至少上传一个 PDF、Word 或 TXT 文件", "warning");
    
    setIsSubmitting(true);
    try {
      // 2. Pre-upload frontend check
      const MAX_FILE_SIZE = 4.3 * 1024 * 1024;
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          setIsSubmitting(false);
          return toast('文件太大，请压缩后重试', 'error');
        }
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!ALLOWED_EXTS.includes(ext)) {
          setIsSubmitting(false);
          return toast('仅支持 PDF、DOC、DOCX、TXT 文件', 'error');
        }
      }

      // 3. Create project
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      
      if (!res.ok) {
        let errMsg = "创建项目失败，请重试";
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch(e){}
        throw new Error(errMsg);
      }
      
      const data = await res.json();
      if (!data.id) {
        throw new Error("创建项目失败，请重试");
      }

      // 4. Upload documents
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      const uploadRes = await fetch(`/api/projects/${data.id}/documents`, {
        method: 'POST',
        body: formData
      });
      
      const uploadData = await uploadRes.json();
      
      if (!uploadRes.ok) {
         if (uploadData && uploadData.errorCode === 'FILE_TOO_LARGE') {
           toast('文件太大，请压缩后重试', 'error');
         } else {
           toast('仅支持 PDF、DOC、DOCX、TXT 文件', 'error');
         }
         
         setIsSubmitting(false);

         // Rollback: try to delete the created empty project
         try {
           // Provide a rollback hint in the header for the backend to bypass admin check if needed
           await fetch(`/api/projects/${data.id}`, { 
             method: 'DELETE',
             headers: { 'X-Rollback-Request': 'true' }
           });
         } catch(e) {}
         
         // Do not navigate, keep them on the modal to fix files
         return; 
      }

      toast("项目及文档创建成功", "success");
      setShowModal(false);
      navigate(`/project/${data.id}`);
    } catch (e: any) {
      console.error(e);
      toast(`创建失败: ${e.message || '请重试'}`, "error");
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-full w-full bg-brand-deep p-4 md:p-6 text-gray-200 overflow-y-auto custom-scrollbar">

      {systemMode === 'demo-readonly' && (
        <div className="bg-brand-surface border border-[#3AB7FF]/50 rounded-lg p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between shadow-xl">
           <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-brand-blue-light shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-gray-200">Demo 只读模式</span>
                <p className="text-gray-400 mt-0.5">{systemMessage}</p>
              </div>
           </div>
        </div>
      )}
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border-subtle rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-brand-border-medium shrink-0">
              <h3 className="font-semibold text-lg text-brand-blue">新建审计项目</h3>
              <button disabled={isSubmitting} onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1.5 block">项目名称 <span className="text-[#F43F5E]">*</span></label>
                <input 
                  autoFocus
                  type="text" 
                  value={newProject.name}
                  onChange={e => setNewProject({...newProject, name: e.target.value})}
                  className="w-full bg-[#0B1020] border border-[rgba(148,163,184,0.18)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#38BDF8] text-[#F8FAFC]"
                  placeholder="例如：发行人关联交易智能核查项目"
                />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1.5 block">分析场景</label>
                <select 
                  value={newProject.scenario}
                  onChange={e => setNewProject({...newProject, scenario: e.target.value})}
                  className="w-full bg-[#0B1020] border border-[rgba(148,163,184,0.18)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#38BDF8] text-[#F8FAFC]"
                >
                  <option value="IPO审查">IPO审查</option>
                  <option value="内部反欺诈审查">内部反欺诈审查</option>
                  <option value="年度审计异常追踪">年度审计异常追踪</option>
                  <option value="深度欺诈审查">深度欺诈审查</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">上传初始文档 <span className="text-red-500">*</span></label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-brand-deep border border-dashed border-brand-border-medium rounded p-4 text-center cursor-pointer hover:border-#38BDF8/50 transition-colors"
                >
                  {isSubmitting ? (
                    <div className="animate-pulse">
                      <Upload className="w-5 h-5 text-gray-500 mx-auto mb-2 opacity-50" />
                      <div className="text-xs text-brand-blue">文件上传处理中...</div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-500 mx-auto mb-2" />
                      <div className="text-xs text-gray-400">
                        点击选择 PDF, DOCX, TXT 文件
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">单文件限制 ~4MB</div>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.txt"
                  disabled={isSubmitting}
                />
                
                {files.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-brand-surface2 border border-brand-border-medium p-2 rounded text-xs">
                        <span className="truncate flex-1 text-gray-300">{f.name}</span>
                        <button disabled={isSubmitting} onClick={() => removeFile(i)} className="text-gray-500 hover:text-red-500 ml-2 disabled:opacity-50"><X className="w-3 h-3"/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-brand-border-subtle flex justify-end gap-3 bg-[#0B1020] shrink-0">
              <button disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-brand-muted hover:text-white" onClick={() => setShowModal(false)}>取消</button>
              <button disabled={isSubmitting || !newProject.name.trim() || files.length === 0} onClick={createProject} className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white font-medium text-sm rounded-lg shadow-[0_6px_18px_rgba(0,94,184,0.22)] flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-50 disabled:hover:translate-y-0">
                {isSubmitting ? '上传执行中...' : '创建项目'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col h-full">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0 gap-4 mt-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-brand-primary">
              <Folder className="w-6 h-6 text-brand-blue-light" />
              项目工作区
            </h1>
            <p className="text-xs text-brand-muted mt-2">管理并追溯各类智能审计与风控调查项目。</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="w-full md:w-auto px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white font-medium text-sm rounded-lg shadow-[0_8px_24px_rgba(0,94,184,0.20)] flex items-center justify-center gap-2 transition-all hover:brightness-110 hover:-translate-y-0.5">
            <Plus className="w-4 h-4" /> 新建项目
          </button>
        </div>

        <div className="flex gap-4 mb-6 shrink-0">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-brand-muted" />
            <input 
              type="text" 
              placeholder="搜索项目名称..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B1020] border border-[rgba(148,163,184,0.18)] rounded-lg px-9 py-2 text-sm focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 text-[#F8FAFC] placeholder-[#64748B] transition-colors"
            />
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border-subtle rounded-none md:rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.18)] flex-1 min-h-0 overflow-y-auto custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {loading ? (
            <div className="p-12 flex justify-center items-center text-gray-500 text-sm h-full w-full">
              <div className="w-5 h-5 border-2 border-#38BDF8 border-t-transparent rounded-full animate-spin mr-3"></div>
              正在加载项目列表...
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-brand-surface2 border-b border-brand-border-subtle text-[#D9E4F5] text-xs sticky top-0 z-10 font-medium">
                    <tr>
                      <th className="px-5 py-3 font-medium">项目名称</th>
                      <th className="px-5 py-3 font-medium">场景类型</th>
                      <th className="px-5 py-3 font-medium">权限角色</th>
                      <th className="px-5 py-3 font-medium">包含数据源</th>
                      <th className="px-5 py-3 font-medium text-right">综合风险评分</th>
                      <th className="px-5 py-3 font-medium text-right">时间</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border-subtle">
                    {filteredProjects.map((p, i) => (
                      <tr key={p.id} onClick={() => navigate(`/project/${p.id}`)} className="hover:bg-[rgba(56,189,248,0.05)] transition-colors cursor-pointer group bg-transparent">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-brand-primary text-[13px]">{p.name}</div>
                        <div className="text-[10px] font-mono text-brand-muted mt-0.5">PRJ-{p.id.toString().padStart(4, '0')}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.20)] rounded-full text-[10px] text-[#BAE6FD]">
                          {p.scenario}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5 text-[11px]">
                          {isAdmin ? (
                            <><Shield className="w-3.5 h-3.5 text-amber-500" /> <span className="text-amber-500">审计全权</span></>
                          ) : (
                            <><User className="w-3.5 h-3.5 text-gray-400" /> <span className="text-gray-400">用户只读</span></>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[11px] text-gray-400"><FileText className="w-3.5 h-3.5 text-gray-500" /> {p.docCount || 0}</div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-400"><Database className="w-3.5 h-3.5 text-brand-blue" /> -</div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className={`font-bold ${getRiskVisual(p.riskScore, p.riskLevel).color}`}>
                          {p.riskScore != null ? Math.round(Number(p.riskScore)) : '-'} <span className="text-[10px] text-gray-500 font-normal">/100</span>
                          <div className="text-[10px] font-normal leading-none mt-1">{getRiskVisual(p.riskScore, p.riskLevel).label}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="text-[11px] text-gray-400 flex items-center justify-end gap-1"><Clock className="w-3 h-3"/> {new Date(p.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-5 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="relative inline-block text-left" onClick={e => e.stopPropagation()}>
                          <button onClick={(e) => handleDeleteProject(e, p.id)} className="text-gray-500 hover:text-white p-1 rounded-full hover:bg-[#333] transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3 pb-6">
                {filteredProjects.map((p, i) => (
                  <div key={p.id} onClick={() => navigate(`/project/${p.id}`)} className="bg-brand-card p-4 rounded-xl border border-brand-border-subtle cursor-pointer hover:border-brand-cyan/50 transition-colors shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <div className="font-semibold text-brand-primary text-sm mb-1">{p.name}</div>
                         <div className="text-[10px] font-mono text-brand-muted">PRJ-{p.id.toString().padStart(4, '0')}</div>
                       </div>
                       <div className={`text-right font-bold text-lg leading-none ${getRiskVisual(p.riskScore, p.riskLevel).color}`}>
                         {p.riskScore != null ? Math.round(Number(p.riskScore)) : '-'}
                         <div className="text-[9px] font-normal mt-1">{getRiskVisual(p.riskScore, p.riskLevel).label}</div>
                       </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                       <span className="px-2.5 py-1 bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.20)] rounded-full text-[10px] text-[#BAE6FD]">{p.scenario}</span>
                         {p.industryType && <span className="px-2.5 py-1 bg-brand-cyan/10 border border-brand-cyan/20 rounded-full text-[10px] text-brand-cyan">{indNameMap[p.industryType] || p.industryType}</span>}
                       <span className="flex items-center gap-1.5 text-[10px] text-brand-cyan px-2.5 py-1 bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.20)] rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></div> 分析中</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-brand-muted pt-3 border-t border-brand-border-subtle">
                      <div className="flex gap-3">
                         <div className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {p.docCount || 0}</div>
                         <div className="flex items-center gap-1"><Database className="w-3.5 h-3.5 text-brand-cyan" /> -</div>
                      </div>
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(p.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredProjects.length === 0 && (
                <div className="py-16 text-center text-gray-500 text-sm">
                  <Folder className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  没有找到审计项目
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
