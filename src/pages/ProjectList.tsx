import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Folder, Clock, Activity, Search, X, Upload, MoreHorizontal, FileText, Database, User } from 'lucide-react';
import { toast } from '../components/Toast.tsx';

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.txt'];

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

  useEffect(() => {
    fetch('/api/projects')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load projects');
        return res.json();
      })
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles: File[] = Array.from(e.target.files);
      const validFiles: File[] = [];
      let hasInvalid = false;
      
      for (const file of selectedFiles) {
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (ALLOWED_EXTS.includes(ext)) {
          validFiles.push(file);
        } else {
          hasInvalid = true;
        }
      }
      
      if (hasInvalid) {
        toast('仅支持 PDF、Word、TXT 文件', 'error');
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

  const createProject = async () => {
    if (!newProject.name.trim()) return toast("项目名称不能为空", "warning");
    if (files.length === 0) return toast("请至少上传一个 PDF、Word 或 TXT 文件", "warning");
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      const data = await res.json();

      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const uploadRes = await fetch(`/api/projects/${data.id}/documents`, {
          method: 'POST',
          body: formData
        });
        
        if (!uploadRes.ok) {
           const errData = await uploadRes.json();
           toast(`上传失败: ${errData.error || '未知错误'}`, 'error');
        }
      }

      navigate(`/project/${data.id}`);
    } catch (e) {
      console.error(e);
      toast("创建失败，请重试", "error");
    } finally {
      setIsSubmitting(false);
      setShowModal(false);
    }
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-full w-full bg-[#1A1A1A] p-4 md:p-6 text-gray-200 overflow-y-auto custom-scrollbar">
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-[#242424] border border-[#333333] rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-[#333333] shrink-0">
              <h3 className="font-semibold text-lg text-[#D4AF37]">新建审计项目</h3>
              <button disabled={isSubmitting} onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">项目名称 <span className="text-red-500">*</span></label>
                <input 
                  autoFocus
                  type="text" 
                  value={newProject.name}
                  onChange={e => setNewProject({...newProject, name: e.target.value})}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] text-white"
                  placeholder="例如：重组尽调 A公司"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">分析场景</label>
                <select 
                  value={newProject.scenario}
                  onChange={e => setNewProject({...newProject, scenario: e.target.value})}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] text-gray-200"
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
                  className="w-full bg-[#1A1A1A] border border-dashed border-[#444] rounded p-4 text-center cursor-pointer hover:border-[#D4AF37]/50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-500 mx-auto mb-2" />
                  <div className="text-xs text-gray-400">
                    点击选择 PDF, DOCX, TXT 文件
                  </div>
                </div>
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.txt"
                />
                
                {files.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#1A1A1A] border border-[#333333] p-2 rounded text-xs">
                        <span className="truncate flex-1 text-gray-300">{f.name}</span>
                        <button onClick={() => removeFile(i)} className="text-gray-500 hover:text-red-500 ml-2"><X className="w-3 h-3"/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-[#333333] flex justify-end gap-3 bg-[#1A1A1A] shrink-0">
              <button disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white" onClick={() => setShowModal(false)}>取消</button>
              <button disabled={isSubmitting || !newProject.name.trim() || files.length === 0} onClick={createProject} className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C048] text-[#1A1A1A] font-medium text-sm rounded shadow-[0_0_15px_rgba(212,175,55,0.2)] flex items-center gap-2 transition-all disabled:opacity-50">
                {isSubmitting ? '创建中...' : '创建项目'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col h-full">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 shrink-0 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Folder className="w-6 h-6 text-[#D4AF37]" />
              项目工作区
            </h1>
            <p className="text-xs text-gray-500 mt-1">管理并追溯各类智能审计与风控调查项目。</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="w-full md:w-auto px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C048] text-[#1A1A1A] font-medium text-sm rounded shadow-[0_0_15px_rgba(212,175,55,0.2)] flex items-center justify-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> 新建项目
          </button>
        </div>

        <div className="flex gap-4 mb-4 shrink-0">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
            <input 
              type="text" 
              placeholder="搜索项目名称..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#242424] border border-[#333333] rounded px-9 py-2 text-sm focus:outline-none focus:border-[#D4AF37] text-white"
            />
          </div>
        </div>

        <div className="bg-[#242424] md:border border-[#333333] rounded-none md:rounded-lg md:shadow-lg flex-1 min-h-0 overflow-y-auto custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {loading ? (
            <div className="p-12 flex justify-center items-center text-gray-500 text-sm h-full w-full">
              <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mr-3"></div>
              正在加载项目列表...
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#1A1A1A] border-b border-[#333333] text-gray-400 text-xs sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3 font-medium">项目名称</th>
                      <th className="px-5 py-3 font-medium">场景类型</th>
                      <th className="px-5 py-3 font-medium">状态</th>
                      <th className="px-5 py-3 font-medium">包含数据源</th>
                      <th className="px-5 py-3 font-medium text-right">综合风险评分</th>
                      <th className="px-5 py-3 font-medium">负责人</th>
                      <th className="px-5 py-3 font-medium text-right">时间</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#333333]">
                    {filteredProjects.map((p, i) => (
                      <tr key={p.id} onClick={() => navigate(`/project/${p.id}`)} className="hover:bg-[#2A2A2A] transition-colors cursor-pointer group">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-200 text-[13px]">{p.name}</div>
                        <div className="text-[10px] font-mono text-gray-500 mt-0.5">PRJ-{p.id.toString().padStart(4, '0')}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 bg-[#1A1A1A] border border-[#333333] rounded text-[10px] text-gray-300">
                          {p.scenario}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5 text-[11px] text-blue-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> 分析中
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[11px] text-gray-400"><FileText className="w-3.5 h-3.5 text-gray-500" /> {p.docCount || 0}</div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-400"><Database className="w-3.5 h-3.5 text-[#D4AF37]" /> -</div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className={`font-bold ${p.riskLevel ? p.riskLevel.color : 'text-gray-500'}`}>
                          {p.riskScore || '-'} <span className="text-[10px] text-gray-500 font-normal">/100</span>
                          {p.riskLevel && <div className="text-[10px] font-normal leading-none mt-1">{p.riskLevel.label}</div>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#333333] flex items-center justify-center"><User className="w-3 h-3"/></div>
                          高级合伙人
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="text-[11px] text-gray-400 flex items-center justify-end gap-1"><Clock className="w-3 h-3"/> {new Date(p.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-5 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="relative inline-block text-left" onClick={e => e.stopPropagation()}>
                          <button onClick={(e) => {
                            const evt = new CustomEvent('show-toast', {detail: {message: '暂无编辑或删除该项目的权限', type: 'error'}});
                            window.dispatchEvent(evt);
                          }} className="text-gray-500 hover:text-white p-1 rounded-full hover:bg-[#333] transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
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
                  <div key={p.id} onClick={() => navigate(`/project/${p.id}`)} className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333333] cursor-pointer hover:border-[#D4AF37]/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <div className="font-semibold text-gray-200 text-sm mb-1">{p.name}</div>
                         <div className="text-[10px] font-mono text-gray-500">PRJ-{p.id.toString().padStart(4, '0')}</div>
                       </div>
                       <div className={`text-right font-bold text-lg leading-none ${p.riskLevel ? p.riskLevel.color : 'text-gray-500'}`}>
                         {p.riskScore || '-'}
                         {p.riskLevel && <div className="text-[9px] font-normal mt-1">{p.riskLevel.label}</div>}
                       </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                       <span className="px-2 py-0.5 bg-[#242424] border border-[#333333] rounded text-[10px] text-gray-300">{p.scenario}</span>
                       <span className="flex items-center gap-1.5 text-[10px] text-blue-400 px-2 py-0.5 bg-[#242424] border border-[#333333] rounded"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> 分析中</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-3 border-t border-[#333333]">
                      <div className="flex gap-3">
                         <div className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {p.docCount || 0}</div>
                         <div className="flex items-center gap-1"><Database className="w-3.5 h-3.5 text-[#D4AF37]" /> -</div>
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
