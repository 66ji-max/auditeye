import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ShieldAlert, Plus, Folder, Clock, Activity, Search, X, Upload } from 'lucide-react';

export default function ProjectList() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', scenario: 'IPO审查' });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="h-screen w-screen bg-[#1A1A1A] text-gray-200 font-sans flex flex-col items-center pt-20">
      
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
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.json,.md"
                />
              </div>
            </div>
            <div className="p-4 border-t border-[#333333] flex justify-end gap-3 bg-[#1A1A1A]">
              <button 
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
                onClick={() => setShowModal(false)}
              >
                取消
              </button>
              <button 
                disabled={isSubmitting}
                onClick={createProject}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C048] text-[#1A1A1A] font-medium text-sm rounded shadow-[0_0_15px_rgba(212,175,55,0.2)] flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? '创建中...' : '创建项目'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl px-8">
        <div className="flex items-center gap-3 text-[#D4AF37] font-bold text-3xl mb-12">
          <ShieldAlert className="w-8 h-8" />
          AuditEye Intelligence
        </div>
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold">我的审查项目 (My Projects)</h1>
          <button 
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C048] text-[#1A1A1A] font-medium text-sm rounded shadow-[0_0_15px_rgba(212,175,55,0.2)] flex items-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> 新建项目
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <div 
              key={p.id} 
              onClick={() => navigate(`/project/${p.id}`)}
              className="bg-[#242424] border border-[#333333] hover:border-[#D4AF37] rounded-lg p-5 cursor-pointer transition-all hover:shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 relative">
                  <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-[#333333]">
                    <Folder className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-200">{p.name}</h3>
                    <div className="text-xs text-gray-500 mt-0.5 max-w-[120px] truncate">{p.scenario}</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-[#333333]">
                <div>
                  <div className="text-[11px] text-gray-500 mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/>风险评分</div>
                  <div className={`font-mono font-medium ${p.riskScore > 75 ? 'text-red-500' : 'text-gray-300'}`}>
                    {p.riskScore}/100
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/>包含文件</div>
                  <div className="font-mono text-xs text-gray-400 mt-1">{p.docCount || 0} 个</div>
                </div>
              </div>
            </div>
          ))}

          {projects.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-[#333333] rounded-lg">
              <Folder className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>暂无审计项目，点击右上角创建</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
