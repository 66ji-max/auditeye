import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ShieldAlert, Plus, Folder, Clock, Activity, Search } from 'lucide-react';

export default function ProjectList() {
  const [projects, setProjects] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => setProjects(data));
  }, []);

  const createProject = async () => {
    const name = prompt("输入新审计项目名称", "重组尽调: A公司");
    if (!name) return;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, scenario: 'IPO审查' })
    });
    const data = await res.json();
    navigate(`/project/${data.id}`);
  };

  return (
    <div className="h-screen w-screen bg-[#1A1A1A] text-gray-200 font-sans flex flex-col items-center pt-20">
      <div className="w-full max-w-5xl px-8">
        <div className="flex items-center gap-3 text-[#D4AF37] font-bold text-3xl mb-12">
          <ShieldAlert className="w-8 h-8" />
          AuditEye Intelligence
        </div>
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold">我的审查项目 (My Projects)</h1>
          <button 
            onClick={createProject}
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
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-[#333333]">
                  <Folder className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-200">{p.name}</h3>
                  <div className="text-xs text-gray-500 mt-0.5">{p.scenario}</div>
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
                  <div className="text-[11px] text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/>创建时间</div>
                  <div className="font-mono text-xs text-gray-400 mt-1">{new Date(p.createdAt).toLocaleDateString()}</div>
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
