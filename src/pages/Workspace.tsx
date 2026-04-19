/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { 
  ShieldAlert, Bot, User, Database, FileText, Users, AlertTriangle, 
  Activity, Network, TrendingDown, Link as LinkIcon, AlertOctagon, 
  Download, FileSearch, Clock, CheckSquare, Maximize, DownloadCloud,
  Search, Bell, Settings, ChevronRight, Menu, ArrowLeft, Send, X
} from 'lucide-react';
import * as d3 from 'd3';

const WorkflowStep: React.FC<{ icon: React.ReactNode, title: string, desc?: string, status: 'done' | 'active' | 'alert', time: string }> = ({ icon, title, desc, status, time }) => {
  return (
    <div className="relative flex gap-3 pb-6 z-10">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
        status === 'done' ? 'bg-[#1A1A1A] border-[#D4AF37]' : 
        status === 'alert' ? 'bg-red-500/10 border-red-500' : 
        'bg-[#D4AF37]/10 border-[#D4AF37] animate-pulse'
      }`}>
        {icon}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="flex items-center justify-between">
          <h4 className={`text-xs font-medium ${status === 'alert' ? 'text-red-400' : 'text-gray-200'}`}>{title}</h4>
          <span className="text-[10px] text-gray-500 font-mono">{time}</span>
        </div>
        {desc && <p className="text-[11px] text-gray-400 mt-1 leading-tight">{desc}</p>}
      </div>
    </div>
  );
};

const KPICard: React.FC<{ title: string, value: string | number, icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-[#1A1A1A] border border-[#333333] rounded p-3 flex flex-col justify-between">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] text-gray-400">{title}</span>
      {icon}
    </div>
    <div className="text-xl font-bold text-gray-100">{value}</div>
  </div>
);

const RedFlagItem: React.FC<{ text: string, severity: 'high' | 'medium' }> = ({ text, severity }) => (
  <div className="flex items-start gap-2 p-2 rounded bg-[#1A1A1A] border border-[#333333]">
    <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
    <span className="text-xs text-gray-300 leading-tight">{text}</span>
  </div>
);

const TimelineItem: React.FC<{ date: string, desc: string, alert?: boolean }> = ({ date, desc, alert }) => (
  <div className="relative flex gap-2 pb-4 z-10">
    <div className={`w-3.5 h-3.5 rounded-full border-2 border-[#1A1A1A] shrink-0 mt-0.5 ${alert ? 'bg-red-500' : 'bg-[#4B5563]'}`}></div>
    <div>
      <div className="text-[10px] font-mono text-gray-500">{date}</div>
      <div className={`text-[11px] mt-0.5 ${alert ? 'text-red-400 font-medium' : 'text-gray-300'}`}>{desc}</div>
    </div>
  </div>
);

const EvidenceCard: React.FC<{ source: string, page: string, snippet: string, alert?: string }> = ({ source, page, snippet, alert }) => {
  return (
    <div className="bg-[#242424] border border-[#333333] rounded p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-medium text-[#D4AF37] flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {source}
        </span>
        <span className="text-[10px] text-gray-500 bg-[#1A1A1A] px-1.5 py-0.5 rounded">{page}</span>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed font-serif">
        {snippet}
      </p>
      {alert && (
        <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1 bg-red-500/10 px-1.5 py-1 rounded border border-red-500/20">
          <AlertOctagon className="w-3 h-3" />
          {alert}
        </div>
      )}
    </div>
  );
};

const D3Graph = ({ entities, relationships }: { entities: any[], relationships: any[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current || !entities.length || !relationships.length) return;
    
    containerRef.current.innerHTML = '';
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const nodes = entities.map(d => ({ ...d, id: d.name }));
    const links = relationships.map(d => ({ ...d, source: d.source, target: d.target }));

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(30));

    const svg = d3.select(containerRef.current).append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [0, 0, width, height]);

    // Defs
    const defs = svg.append("defs");
    defs.append("pattern")
      .attr("id", "grid")
      .attr("width", 20)
      .attr("height", 20)
      .attr("patternUnits", "userSpaceOnUse")
      .append("path")
      .attr("d", "M 20 0 L 0 0 0 20")
      .attr("fill", "none")
      .attr("stroke", "#333333")
      .attr("stroke-width", 0.5)
      .attr("stroke-opacity", 0.3);
      
    svg.append("rect").attr("width", "100%").attr("height", "100%").attr("fill", "url(#grid)");

    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#4B5563")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", (d: any) => d.type === 'SHAREHOLDER' ? "0" : "4");

    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag()
        .on("start", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (event, d: any) => {
          d.fx = event.x; d.fy = event.y;
        })
        .on("end", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        }) as any);

    node.append("circle")
      .attr("r", (d: any) => d.type === 'COMPANY' ? 28 : 20)
      .attr("fill", "#242424")
      .attr("stroke", (d: any) => {
        if(d.attributes?.address && (d.attributes.address as string).includes('3栋')) return "#ef4444";
        return d.type === 'COMPANY' ? "#D4AF37" : "#4B5563";
      })
      .attr("stroke-width", 2);

    node.append("text")
      .attr("y", 4)
      .attr("text-anchor", "middle")
      .style("fill", "#E2E8F0")
      .style("font-size", "11px")
      .text((d: any) => d.name.length > 8 ? d.name.substring(0,8)+'...' : d.name);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

  }, [entities, relationships]);

  return <div ref={containerRef} className="relative w-full h-[260px] bg-[#1A1A1A] rounded border border-[#333333] overflow-hidden" />;
}

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [query, setQuery] = useState('分析A公司与B公司的关联风险');
  const [loading, setLoading] = useState(false);

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${id}`);
    if(res.ok) {
      setData(await res.json());
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleAnalyze = async () => {
    setLoading(true);
    await fetch(`/api/projects/${id}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCompany: query })
    });
    await fetchProject();
    setLoading(false);
  };

  const handleExport = () => {
    const reportHtml = `
      <html>
        <head><title>AuditEye Special Report - ${data.project.name}</title></head>
        <body style="font-family: sans-serif; padding: 40px; color: #333;">
          <h1 style="color: #444;">AuditEye 专项审查报告</h1>
          <h2>项目名称: ${data.project.name}</h2>
          <p><strong>审查对象:</strong> ${query}</p>
          <p><strong>综合风险评分:</strong> ${score}/100</p>
          <h3>风险简报</h3>
          <p>发现了 ${behHits} 项重点红旗提示，涉及 ${rels.length} 条疑似关联关系。</p>
          <ul>
            ${logs.filter((l:any)=>l.action==='RED_FLAG').map((l:any) => `<li>${JSON.parse(l.details).description}</li>`).join('')}
          </ul>
        </body>
      </html>
    `;
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AuditEye_Report_${data.project.id}.html`;
    a.click();
  };

  if (!data) return <div className="p-8 text-white">Loading...</div>;

  const logs = data.audit_logs || [];
  const entities = data.entities || [];
  const rels = data.relationships || [];
  const score = data.project.riskScore;

  // Derive stats
  const connHits = relationshipsCount(rels);
  const finHits = 0; // Mock 
  const behHits = logs.filter((l: any) => l.action === 'RED_FLAG').length;
  const docsCount = data.documents.length;

  return (
    <div className="h-screen w-screen bg-[#1A1A1A] text-gray-200 font-sans flex flex-col overflow-hidden selection:bg-[#D4AF37]/30">
      {/* Header */}
      <header className="h-14 border-b border-[#333333] flex items-center px-4 justify-between bg-[#1A1A1A] shrink-0 z-20">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white mr-2">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-lg tracking-wide">
            <ShieldAlert className="w-5 h-5" />
            AuditEye
          </div>
          <div className="text-sm font-medium border-l border-[#333333] pl-4 text-gray-300">
            {data.project.name}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden bg-[#121212]">
        <div className="flex-1 flex gap-4 min-h-0">
          
          {/* Left Panel: AI Assistant */}
          <div className="w-[280px] lg:w-[320px] flex flex-col bg-[#242424] border border-[#333333] rounded-lg p-4 shadow-lg shrink-0">
            <div className="flex items-center gap-2 mb-5">
              <Bot className="w-4 h-4 text-[#D4AF37]" />
              <h2 className="text-sm font-semibold text-gray-200 tracking-wide">AI 审计助手</h2>
            </div>
            
            {/* User Query Form */}
            <div className="bg-[#1A1A1A] border border-[#333333] rounded p-2 mb-4">
              <div className="flex">
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-white flex-1 pl-2"
                  placeholder="输入审计指令"
                />
                <button onClick={handleAnalyze} disabled={loading} className="w-8 h-8 bg-[#D4AF37] rounded flex items-center justify-center text-black hover:bg-[#E5C048] disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Project Files Area */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-gray-400 font-medium">项目文件 ({data.documents.length})</span>
                <label className="text-[10px] text-[#D4AF37] cursor-pointer hover:underline">
                  + 上传文件
                  <input type="file" multiple className="hidden" onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    
                    const formData = new FormData();
                    Array.from(files).forEach((f: File) => formData.append('files', f));
                    
                    try {
                      await fetch(`/api/projects/${id}/documents`, { method: 'POST', body: formData });
                      fetchProject();
                    } catch (err) {
                      console.error(err);
                      alert('上传失败');
                    }
                  }} />
                </label>
              </div>
              <div className="space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                {data.documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between bg-[#1A1A1A] border border-[#333333] p-1.5 rounded">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <FileText className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="text-[10px] text-gray-300 truncate">{doc.originalName}</span>
                    </div>
                    <button 
                      onClick={async () => {
                        if (confirm('确认删除?')) {
                          await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
                          fetchProject();
                        }
                      }}
                      className="text-gray-500 hover:text-red-400 pl-1 shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {data.documents.length === 0 && <div className="text-[10px] text-gray-500 italic">暂无上传文件</div>}
              </div>
            </div>

            {/* Workflow Steps */}
            <div className="flex-1 overflow-y-auto pr-2 relative custom-scrollbar text-sm">
              <div className="absolute left-[11px] top-2 bottom-6 w-[2px] bg-[#333333] z-0"></div>

              {loading && <WorkflowStep icon={<Search className="w-3 h-3 text-[#D4AF37]" />} title="Retrieving Information..." status="active" time="now" />}
              
              {logs.map((log: any, i: number) => {
                const details = JSON.parse(log.details);
                return (
                  <WorkflowStep 
                    key={i}
                    icon={log.action === 'RED_FLAG' ? <AlertTriangle className="w-3 h-3 text-red-500" /> : <Database className="w-3 h-3 text-[#D4AF37]" />} 
                    title={log.action === 'RED_FLAG' ? details.ruleName : '执行日志'} 
                    desc={log.action === 'RED_FLAG' ? details.description : details.message}
                    status={log.action === 'RED_FLAG' ? 'alert' : 'done'} 
                    time={new Date(log.createdAt).toLocaleTimeString()} 
                  />
                )
              })}
              
              {!loading && logs.length === 0 && <div className="text-xs text-gray-500 pl-8">等待输入审计指令...</div>}
            </div>
          </div>

          {/* Center Panel: Risk Summary */}
          <div className="w-[320px] lg:w-[380px] flex flex-col bg-[#242424] border border-[#333333] rounded-lg p-4 shadow-lg shrink-0">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="text-sm font-semibold text-gray-200 tracking-wide">风险概览</h2>
              </div>
            </div>

            {/* Score Card */}
            <div className="flex items-center justify-between bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] border border-[#333333] rounded p-4 mb-5 shadow-md relative overflow-hidden">
              {score > 75 && <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full blur-xl"></div>}
              <div className="relative z-10">
                <div className="text-[11px] text-gray-400 mb-1 tracking-wide">综合风险评分</div>
                <div className="text-4xl font-bold text-[#D4AF37] tracking-tight">{score}<span className="text-sm text-gray-500 font-normal ml-1">/100</span></div>
              </div>
              <div className="flex flex-col items-end relative z-10">
                <div className={`px-2.5 py-1 ${score > 75 ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'bg-gray-800 border-gray-600 text-gray-400'} text-[11px] font-medium rounded border flex items-center gap-1.5`}>
                  <AlertOctagon className="w-3.5 h-3.5" />
                  {score > 75 ? '高风险' : score > 0 ? '中高风险' : '无评分'}
                </div>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <KPICard title="识别实体数" value={entities.length} icon={<Network className="w-3.5 h-3.5 text-blue-400" />} />
              <KPICard title="关联关系数" value={rels.length} icon={<LinkIcon className="w-3.5 h-3.5 text-green-400" />} />
              <KPICard title="触发规则数" value={behHits} icon={<Activity className="w-3.5 h-3.5 text-purple-400" />} />
              <KPICard title="可用证据" value={docsCount} icon={<FileText className="w-3.5 h-3.5 text-amber-400" />} />
            </div>

            {/* Top Red Flags */}
            <div className="flex-1 flex flex-col min-h-0">
              <h3 className="text-[10px] font-semibold text-gray-500 mb-3 uppercase tracking-widest">Top Red Flags</h3>
              <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                {logs.filter((l: any) => l.action === 'RED_FLAG').map((l: any, i: number) => {
                  const d = JSON.parse(l.details);
                  return <RedFlagItem key={i} text={d.description} severity={d.severity} />
                })}
              </div>
            </div>
          </div>

          {/* Right Panel: Dynamic Evidence & Visualization */}
          <div className="flex-1 flex flex-col bg-[#242424] border border-[#333333] rounded-lg p-4 shadow-lg min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="text-sm font-semibold text-gray-200 tracking-wide">图谱与证据锚点</h2>
              </div>
            </div>

            {/* Graph Area */}
            <div className="mb-4 shrink-0 h-[260px]">
              {entities.length > 0 ? <D3Graph entities={entities} relationships={rels} /> : (
                <div className="w-full h-full border border-dashed border-[#333333] rounded flex items-center justify-center text-xs text-gray-500">
                  运行分析以生成图谱
                </div>
              )}
            </div>

            {/* Evidence Panel */}
            <div className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded p-3 flex flex-col overflow-hidden">
              <h3 className="text-[11px] font-semibold text-gray-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                <FileSearch className="w-3.5 h-3.5 text-[#D4AF37]" />
                证据追踪 (Relationship Evidence)
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {rels.map((r: any, i: number) => (
                  <EvidenceCard 
                    key={i}
                    source="系统溯源" 
                    page="API/Doc" 
                    snippet={`${r.source} 与 ${r.target} 存在 [${r.relationType}] 关系: ${r.evidenceSnippet}`} 
                  />
                ))}
                {rels.length === 0 && <div className="text-xs text-gray-600 p-2">无锚点证据</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Area: Audit Output */}
        <div className="h-[140px] bg-[#242424] border border-[#333333] rounded-lg p-4 flex gap-6 shadow-lg shrink-0">
          <div className="flex-1 flex flex-col">
            <h3 className="text-[11px] font-semibold text-[#D4AF37] mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              风险简报
            </h3>
            <p className="text-[11px] text-gray-400 leading-relaxed text-justify pr-4">
              {score > 50 ? '经AI多维分析，存在显著风险关联。核心疑点集中在图谱高亮的重合节点，资金与人员构成潜在闭环。建议立即启动专项核查。' : '暂未发现高危交叉风险节点。'}
            </p>
          </div>
          
          <div className="w-px bg-[#333333] my-1"></div>

          <div className="flex-1 flex flex-col pl-2">
            <h3 className="text-[11px] font-semibold text-gray-300 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <CheckSquare className="w-3.5 h-3.5" />
              审计建议
            </h3>
            <ul className="text-[11px] text-gray-400 space-y-1.5 list-disc list-inside">
              <li>对高危节点实体进行实地走访问询。</li>
              <li>调取关联账号资金流水，穿透核查资金去向。</li>
            </ul>
          </div>

          <div className="w-px bg-[#333333] my-1"></div>

          <div className="flex-1 flex flex-col pl-2">
            <h3 className="text-[11px] font-semibold text-gray-300 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Maximize className="w-3.5 h-3.5" />
              扩大抽样建议
            </h3>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="px-2 py-1 bg-[#1A1A1A] border border-[#333333] rounded text-[10px] text-gray-400">核查历史异常交易</span>
              <span className="px-2 py-1 bg-[#1A1A1A] border border-[#333333] rounded text-[10px] text-gray-400">异常高管变动监控</span>
            </div>
          </div>

          <div className="flex items-center justify-center pl-6 border-l border-[#333333]">
            <button onClick={handleExport} className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#C5A028] hover:from-[#E5C048] hover:to-[#D4AF37] text-[#1A1A1A] font-bold text-xs rounded shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center gap-2 whitespace-nowrap">
              <DownloadCloud className="w-4 h-4" />
              导出专项报告
            </button>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333333;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4B5563;
        }
      `}} />
    </div>
  );
}

function relationshipsCount(rels: any[]) { return rels.length; }
