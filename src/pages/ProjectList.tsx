import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Folder, Clock, Activity, Search, X, Upload, MoreHorizontal, FileText, Database, User } from 'lucide-react';

export default function ProjectList() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', scenario: 'IPO审查' });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => setProjects(data));
  }, []);

  const createProject = async () => {
    if (!newProject.name.trim()) return alert("请输入项目名称");
    
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
        await fetch(`/api/projects/${data.id}/documents`, {
          method: 'POST',
          body: formData
        });
      }

      navigate(`/project/${data.id}`);
    } catch (e) {
      console.error(e);
      alert("创建失败，请重试");
    } finally {
      setIsSubmitting(false);
      setShowModal(false);
    }
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-full w-full bg-[#1A1A1A] p-6 text-gray-200 overflow-y-auto custom-scrollbar">
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-[#242424] border border-[#333333] rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#333333]">
              <h3 className="font-semibold text-lg text-[#D4AF37]">新建审计项目</h3>
              <button disabled={isSubmitting} onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
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
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">上传初始文档 (可选)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-[#1A1A1A] border border-dashed border-[#444] rounded p-4 text-center cursor-pointer hover:border-[#D4AF37]/50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-500 mx-auto mb-2" />
                  <div className="text-xs text-gray-400">
                    {files.length > 0 ? `已选择 ${files.length} 个文件` : "点击选择 PDF, DOCX, XLSX, TXT 等文件"}
                  </div>
                </div>
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={e => e.target.files && setFiles(Array.from(e.target.files))}
                  accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.json,.md"
                />
              </div>
            </div>
            <div className="p-4 border-t border-[#333333] flex justify-end gap-3 bg-[#1A1A1A]">
              <button disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white" onClick={() => setShowModal(false)}>取消</button>
              <button disabled={isSubmitting} onClick={createProject} className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C048] text-[#1A1A1A] font-medium text-sm rounded shadow-[0_0_15px_rgba(212,175,55,0.2)] flex items-center gap-2 transition-all disabled:opacity-50">
                {isSubmitting ? '创建中...' : '创建项目'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col h-full">
        
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Folder className="w-6 h-6 text-[#D4AF37]" />
              项目工作区
            </h1>
            <p className="text-xs text-gray-500 mt-1">管理并追溯各类智能审计与风控调查项目。</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C048] text-[#1A1A1A] font-medium text-sm rounded shadow-[0_0_15px_rgba(212,175,55,0.2)] flex items-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> 新建项目
          </button>
        </div>

        <div className="flex gap-4 mb-4 shrink-0">
          <div className="relative w-80">
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

        <div className="bg-[#242424] border border-[#333333] rounded-lg shadow-lg flex-1 min-h-0 overflow-y-auto custom-scrollbar">
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
                    <div className={`font-bold ${p.riskScore > 75 ? 'text-red-500' : p.riskScore > 0 ? 'text-[#D4AF37]' : 'text-gray-500'}`}>
                      {p.riskScore || '-'} <span className="text-[10px] text-gray-500 font-normal">/100</span>
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
                    <button className="text-[#D4AF37] hover:text-[#E5C048]"><MoreHorizontal className="w-5 h-5" /></button>
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-500 text-sm">
                    <Folder className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    没有找到审计项目
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
