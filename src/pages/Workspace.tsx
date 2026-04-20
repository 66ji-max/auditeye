import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { 
  ShieldAlert, Bot, User, Database, FileText, Users, AlertTriangle, 
  Activity, Network, TrendingDown, Link as LinkIcon, AlertOctagon, 
  Download, FileSearch, Clock, CheckSquare, Maximize, DownloadCloud,
  Search, Bell, Settings, ChevronRight, Menu, ArrowLeft, Send, X, Layers,
  ChevronDown, Filter, GitBranch, Share2
} from 'lucide-react';
import * as d3 from 'd3';
import { toast } from '../components/Toast.tsx';
import { RISK_DIMENSIONS } from '../config/riskScoring.ts';

const WorkflowStep: React.FC<{ icon: React.ReactNode, title: string, desc?: string, status: 'done' | 'active' | 'alert' | 'pending', time: string, entities?: number, rules?: number }> = ({ icon, title, desc, status, time, entities, rules }) => {
  const [expanded, setExpanded] = useState(status !== 'pending');
  return (
    <div className="relative flex gap-3 pb-6 z-10 group">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
        status === 'done' ? 'bg-[#1A1A1A] border-[#D4AF37]' : 
        status === 'alert' ? 'bg-red-500/10 border-red-500' : 
        status === 'active' ? 'bg-[#D4AF37]/10 border-[#D4AF37] animate-pulse' :
        'bg-[#1A1A1A] border-[#333333]'
      }`}>
        {icon}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2">
            <h4 className={`text-xs font-medium ${status === 'alert' ? 'text-red-400' : status === 'pending' ? 'text-gray-500' : 'text-gray-200'}`}>{title}</h4>
            {status === 'done' && <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[9px] rounded">已完成</span>}
            {status === 'active' && <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] rounded">进行中</span>}
            {status === 'pending' && <span className="px-1.5 py-0.5 bg-gray-800 text-gray-500 text-[9px] rounded">待执行</span>}
          </div>
          <span className="text-[10px] text-gray-500 font-mono">{time}</span>
        </div>
        {expanded && desc && (
          <div className="mt-2 p-2 bg-[#1A1A1A] border border-[#333333] rounded">
            <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
            {(entities || rules) ? (
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#333333]">
                {entities !== undefined && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Database className="w-3 h-3"/> 抽取实体: <strong className="text-[#D4AF37]">{entities}</strong></span>}
                {rules !== undefined && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Activity className="w-3 h-3"/> 触发规则: <strong className="text-red-400">{rules}</strong></span>}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

const D3Graph = ({ entities, relationships, onNodeClick, onEdgeClick }: { entities: any[], relationships: any[], onNodeClick: (n: any)=>void, onEdgeClick: (e: any)=>void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current || !entities.length || !relationships.length) return;
    
    containerRef.current.innerHTML = '';
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const nodes = entities.map(d => ({ ...d, id: d.name }));
    const links = relationships.map(d => ({ ...d, source: d.source, target: d.target }));

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(35));

    const svg = d3.select(containerRef.current).append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [0, 0, width, height]);

    // Defs
    const defs = svg.append("defs");
    defs.append("pattern").attr("id", "grid").attr("width", 20).attr("height", 20).attr("patternUnits", "userSpaceOnUse")
      .append("path").attr("d", "M 20 0 L 0 0 0 20").attr("fill", "none").attr("stroke", "#333333").attr("stroke-width", 0.5).attr("stroke-opacity", 0.3);
      
    svg.append("rect").attr("width", "100%").attr("height", "100%").attr("fill", "url(#grid)");

    const zoomGroup = svg.append("g");
    svg.call(d3.zoom().scaleExtent([0.5, 4]).on("zoom", (e) => zoomGroup.attr("transform", e.transform)) as any);

    const link = zoomGroup.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: any) => d.relationType === 'HIGH_RISK_OVERLAP' ? '#ef4444' : '#4B5563')
      .attr("stroke-width", (d: any) => d.relationType === 'HIGH_RISK_OVERLAP' ? 2 : 1.5)
      .attr("stroke-dasharray", (d: any) => d.type === 'SHAREHOLDER' ? "0" : "4")
      .style("cursor", "pointer")
      .on("click", (e, d: any) => { e.stopPropagation(); onEdgeClick(d); });

    const node = zoomGroup.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .on("click", (e, d: any) => { e.stopPropagation(); onNodeClick(d); })
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
      .attr("r", (d: any) => d.type === 'COMPANY' ? 24 : 16)
      .attr("fill", "#242424")
      .attr("stroke", (d: any) => {
        if(d.attributes?.address && (d.attributes.address as string).includes('3栋')) return "#ef4444";
        return d.type === 'COMPANY' ? "#D4AF37" : "#4B5563";
      })
      .attr("stroke-width", 2);

    node.append("text")
      .attr("y", (d: any) => d.type === 'COMPANY' ? 38 : 28)
      .attr("text-anchor", "middle")
      .style("fill", "#E2E8F0")
      .style("font-size", "10px")
      .text((d: any) => d.name.length > 10 ? d.name.substring(0,10)+'...' : d.name);

    svg.on("click", () => { onNodeClick(null); onEdgeClick(null); });

    simulation.on("tick", () => {
      link.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y).attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

  }, [entities, relationships]);

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-[#1A1A1A]" />;
}

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [query, setQuery] = useState('分析A公司与B公司的关联风险');
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'doc'|'fin'|'graph'>('doc');
  const [graphMode, setGraphMode] = useState<'all'|'minimal'>('all');
  const [showRuleSet, setShowRuleSet] = useState(false);

  const [loadingProject, setLoadingProject] = useState(true);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('网络请求失败');
      setData(await res.json());
      setLoadingProject(false);
    } catch (err) {
      console.error(err);
      toast('工作流加载失败，请重试', 'error');
      setLoadingProject(false);
    }
  };

  useEffect(() => { fetchProject(); }, [id]);

  const handleAnalyze = async () => {
    setLoading(true);
    await fetch(`/api/projects/${id}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCompany: query })
    });
    await fetchProject();
    setSelectedNode(null);
    setSelectedEdge(null);
    setLoading(false);
  };

  if (loadingProject) {
    return (
      <div className="h-full w-full bg-[#1A1A1A] flex flex-col justify-center items-center text-gray-400 gap-4">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium tracking-wide">正在同步项目档案分析结果...</p>
      </div>
    );
  }

  if (!data || !data.project) return <div className="h-screen flex items-center justify-center text-[#D4AF37]">数据解析失败/未找到该项目</div>;

  const logs = data.audit_logs || [];
  const entities = data.entities || [];
  const rels = data.relationships || [];
  const score = data.project.riskScore || 0;
  const riskLevel = data.project.riskLevel || { label: '未评估', color: 'text-gray-500' };
  const dimScores = data.project.dimensionScores || { relation: 0, behavior: 0, financial: 0 };
  
  const rulesHit = logs.filter((l: any) => l.action === 'RED_FLAG');
  const docsCount = data.documents.length;

  const downloadWorkpapers = () => {
    toast('正在打包底稿...', 'info');
    const content = `=============== AuditEye 综合审计底稿 ===============
项目名称: ${data.project?.name}
场景: ${data.project?.scenario}
创建时间: ${new Date(data.project?.createdAt).toLocaleString()}
--------------------------------------------------
【风险评估】
综合评分: ${score} - ${riskLevel.label}
关联关系风险: ${dimScores.relation} 分
行为异动风险: ${dimScores.behavior} 分
财务异常风险: ${dimScores.financial} 分
--------------------------------------------------
【红旗规则命中】
${rulesHit.length > 0 ? rulesHit.map((r: any, i: number) => {
  const d = JSON.parse(r.details);
  return `${i + 1}. [${d.ruleId || 'N/A'}] ${d.ruleName} - +${d.scoreImpact}分 (${d.severity})
   说明: ${d.description}`;
}).join('\n\n') : '暂无'}
--------------------------------------------------
【文档及文件列表】 (共 ${docsCount} 份)
${data.documents?.map((d: any, i: number) => `${i + 1}. ${d.originalName}`).join('\n') || '暂无'}
--------------------------------------------------
【实体与关系】
实体数量: ${entities.length}
关系数量: ${rels.length}
`;
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    a.download = `AuditEye_Workpapers_${data.project?.id || 'export'}.txt`;
    a.click();
    toast('底稿下载成功', 'success');
  };

  const downloadBrief = () => {
    const html = `<html><head><meta charset="utf-8"/><title>AuditEye Report - ${data.project?.name}</title><style>body{font-family: sans-serif; max-width: 800px; margin: 2rem auto; line-height: 1.6; color: #333;} h1{color: #C5A028;} .risk{font-weight: bold; color: ${score > 75 ? 'red' : '#C5A028'};} .rule{background: #f9f9f9; padding: 10px; border-left: 4px solid #C5A028; margin-bottom: 10px;}</style></head>
<body>
  <h1>AuditEye 专项审计简报</h1>
  <h2>项目: ${data.project?.name}</h2>
  <p>分析场景: ${data.project?.scenario}</p>
  <p>综合风险评价: <span class="risk">${score} 分 (${riskLevel.label})</span></p>
  <h3>核心风险关注点:</h3>
  ${rulesHit.length > 0 ? rulesHit.map((r:any) => {
    const d = JSON.parse(r.details);
    return `<div class="rule"><strong>${d.ruleName}</strong><br/>${d.description}</div>`;
  }).join('') : '<p>暂无高危风险点</p>'}
</body></html>`;
    const a = document.createElement('a');
    a.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    a.download = `AuditEye_Brief_${data.project?.id || 'export'}.html`;
    a.click();
    toast('专项简报已下载', 'success');
  };

  return (
    <div className="h-full w-full bg-[#121212] text-gray-200 font-sans flex flex-col overflow-hidden selection:bg-[#D4AF37]/30">
      
      {/* 1. Project Metadata Header */}
      <div className="h-10 bg-[#1A1A1A] border-b border-[#333333] flex items-center px-4 justify-between shrink-0 text-xs text-gray-400 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 font-medium cursor-pointer transition-all active:scale-95 group"
              title="返回项目管理"
            >
              <ArrowLeft className="w-3 h-3 opacity-70 group-hover:-translate-x-0.5 transition-all" />
              <span>项目</span>
            </button>
            <span className="text-gray-200 font-semibold">{data.project.name}</span>
          </div>
          <div className="w-px h-3 bg-[#333333]"></div>
          <div>类型: <span className="text-gray-200">{data.project.scenario}</span></div>
          <div>负责人: <span className="text-gray-200">当前用户</span></div>
          <div>状态: <span className="text-blue-400">分析中</span></div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5"/> 规则集版本: v1.4.2</div>
          <div className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5"/> 引用数据源: 4</div>
          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> 最新更新: {new Date(data.project.createdAt).toLocaleString()}</div>
        </div>
      </div>

      <div className="flex-1 flex gap-px bg-[#333333] min-h-0">
        
        {/* 2. Left Panel: AI Audit Assistant & Workflow Log */}
        <div className="w-[320px] bg-[#1A1A1A] flex flex-col shrink-0 flex-1 min-w-[320px] max-w-[320px]">
          <div className="p-4 border-b border-[#333333] shrink-0 bg-[#242424]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="text-sm font-semibold text-gray-200">审计流水线工作流</h2>
              </div>
            </div>
            
            <div className="bg-[#1A1A1A] border border-[#333333] rounded p-2">
              <div className="flex">
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-white flex-1 pl-2"
                  placeholder="输入分析指令..."
                />
                <button onClick={handleAnalyze} disabled={loading} className="w-8 h-8 bg-[#D4AF37] rounded flex items-center justify-center text-black hover:bg-[#E5C048] disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="flex-1 overflow-y-auto px-4 py-6 relative custom-scrollbar bg-[#1A1A1A]">
            <div className="absolute left-[27px] top-8 bottom-6 w-[2px] bg-[#333333] z-0"></div>

            {loading && <WorkflowStep icon={<Search className="w-3 h-3 text-[#D4AF37]" />} title="执行多源数据检索中..." status="active" time="现在" />}
            
            {logs.length > 0 ? (
              <>
                {logs.filter((l:any) => l.action !== 'RED_FLAG').map((l:any, i:number) => {
                  const details = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
                  return (
                    <WorkflowStep 
                      key={i}
                      icon={<CheckSquare className="w-3 h-3 text-gray-400" />} 
                      title={details.message || '系统日志'}
                      status="done" time={new Date(l.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    />
                  )
                })}
                {rulesHit.length > 0 && (
                  <WorkflowStep 
                    icon={<AlertTriangle className="w-3 h-3 text-red-500" />} 
                    title="风险规则命中警告" 
                    desc={`检测到 ${rulesHit.length} 项高亮风险，涉及强关系证据链。段落证据已落至工作底稿。`}
                    status="alert" time={new Date(rulesHit[0].createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} rules={rulesHit.length}
                  />
                )}
                <WorkflowStep 
                  icon={<FileText className="w-3 h-3 text-gray-400" />} 
                  title="生成专项审计建议" 
                  desc="根据规则命中情况，已自动生成扩大抽样与业务核查指南。"
                  status="done" time={new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                />
                <WorkflowStep 
                  icon={<User className="w-3 h-3 text-gray-500" />} 
                  title="等待经理复核" 
                  status="pending" time="--" 
                />
              </>
            ) : (
              !loading && <div className="text-xs text-gray-500 pl-10">请输入指令或右侧上传文件启动执行...</div>
            )}
          </div>

          {/* Quick Actions Base */}
          <div className="p-3 border-t border-[#333333] bg-[#242424] shrink-0 grid grid-cols-2 gap-2 relative">
             <button className="px-3 py-2 bg-[#1A1A1A] border border-[#333333] hover:border-[#D4AF37] text-gray-300 text-[11px] rounded transition-colors"
                onClick={() => toast('请前往【项目管理】面板追加上传数据源', 'info')}>+ 追加数据源</button>
             <button className="px-3 py-2 bg-[#1A1A1A] border border-[#333333] hover:border-[#D4AF37] text-gray-300 text-[11px] rounded transition-colors"
                onClick={() => setShowRuleSet(!showRuleSet)}>切换规则集</button>
             
             {showRuleSet && (
               <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-[90%] mb-2 bg-[#1A1A1A] border border-[#333333] rounded shadow-2xl p-2 z-50">
                 <div className="text-[10px] text-gray-500 mb-2 uppercase">选择规则组合</div>
                 <div className="space-y-1">
                   <button className="w-full text-left px-2 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded text-[11px] font-medium border border-[#D4AF37]/30">标准审计预警 (v1.4.2)</button>
                   <button className="w-full text-left px-2 py-1.5 text-gray-400 hover:bg-[#333] rounded text-[11px] transition-colors" onClick={() => {toast('暂无穿透关联黑盒权限', 'warning'); setShowRuleSet(false);}}>极度穿透关联模型</button>
                   <button className="w-full text-left px-2 py-1.5 text-gray-400 hover:bg-[#333] rounded text-[11px] transition-colors flex items-center justify-between" disabled>
                     <span className="opacity-50">快消行业专用模板</span>
                     <span className="bg-gray-800 text-[9px] px-1 rounded">不可用</span>
                   </button>
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* 3. Center Panel: Detailed Risk Overview */}
        <div className="w-[380px] bg-[#1A1A1A] flex flex-col shrink-0 flex-1 min-w-[380px] max-w-[380px] overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-[#333333] flex items-center justify-between sticky top-0 bg-[#1A1A1A] z-20">
            <h2 className="text-sm font-semibold text-gray-200">全维风险评估报告</h2>
            <div className="text-[10px] text-gray-500 font-mono">模型置信度: 94.2%</div>
          </div>
          
          <div className="p-4 space-y-5">
            {/* Main Score Area */}
            <div className="flex gap-4">
              <div className="w-32 h-32 shrink-0 bg-gradient-to-br from-[#242424] to-[#1A1A1A] border border-[#333333] rounded-full flex flex-col items-center justify-center relative shadow-inner">
                {score > 75 && <div className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-ping opacity-20"></div>}
                <div className="text-[10px] text-gray-400 mb-0.5">综合评分</div>
                <div className={`text-4xl font-bold tracking-tighter ${riskLevel.color}`}>{score}</div>
                <div className="text-[10px] text-gray-500 mt-1 uppercase">{riskLevel.label}</div>
              </div>
              <div className="flex-1 flex flex-col justify-center space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-400">{RISK_DIMENSIONS.relation.name} ({RISK_DIMENSIONS.relation.weight * 100}%)</span> <span className="text-red-400">{dimScores.relation} 分</span></div>
                  <div className="h-1.5 w-full bg-[#242424] rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{ width: `${dimScores.relation}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-400">{RISK_DIMENSIONS.behavior.name} ({RISK_DIMENSIONS.behavior.weight * 100}%)</span> <span className="text-[#D4AF37]">{dimScores.behavior} 分</span></div>
                  <div className="h-1.5 w-full bg-[#242424] rounded-full overflow-hidden"><div className="h-full bg-[#D4AF37]" style={{ width: `${dimScores.behavior}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-400">{RISK_DIMENSIONS.financial.name} ({RISK_DIMENSIONS.financial.weight * 100}%)</span> <span className="text-green-500">{dimScores.financial} 分</span></div>
                  <div className="h-1.5 w-full bg-[#242424] rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${dimScores.financial}%` }}></div></div>
                </div>
              </div>
            </div>

            {/* Hit Rules List */}
            <div>
               <h3 className="text-xs font-semibold text-gray-300 mb-3 border-l-2 border-[#D4AF37] pl-2">命中规则列表</h3>
               <div className="border border-[#333333] rounded bg-[#242424] overflow-hidden">
                 <table className="w-full text-left text-[10px]">
                   <thead className="bg-[#1A1A1A] border-b border-[#333333] text-gray-400">
                     <tr>
                       <th className="px-3 py-2 font-medium">规则名称</th>
                       <th className="px-3 py-2 font-medium">维度</th>
                       <th className="px-3 py-2 font-medium text-right">贡献分</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[#333333]">
                     {rulesHit.length > 0 ? rulesHit.map((l:any, i:number) => {
                       const d = JSON.parse(l.details);
                       const dimName = d.dimension ? RISK_DIMENSIONS[d.dimension as keyof typeof RISK_DIMENSIONS]?.name : '综合';
                       return (
                         <tr key={i} className="hover:bg-[#2A2A2A]">
                           <td className="px-3 py-2 text-gray-200">{d.ruleName}</td>
                           <td className="px-3 py-2 text-gray-500">{dimName}</td>
                           <td className="px-3 py-2 text-right text-red-400">+{d.scoreImpact}</td>
                         </tr>
                       )
                     }) : (
                       <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-500">暂无违规命中</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
            
            {/* Top Red Flags Details */}
            <div>
               <h3 className="text-xs font-semibold text-gray-300 mb-3 border-l-2 border-[#D4AF37] pl-2">红旗分析摘要</h3>
               <div className="space-y-2">
                 {rulesHit.map((l:any, i:number) => {
                    const d = JSON.parse(l.details);
                    return (
                      <div key={i} className="p-3 bg-[#242424] border border-red-500/20 rounded shadow-sm hover:border-red-500/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {d.ruleName}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20">{d.severity.toUpperCase()}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed mb-3">{d.description}</p>
                        <div className="flex items-center gap-4 text-[10px] text-gray-500 pt-2 border-t border-[#333333]">
                           <span className="flex items-center gap-1"><FileText className="w-3 h-3"/> 证据: 2份</span>
                           <span className="flex items-center gap-1"><Activity className="w-3 h-3"/> 前往审查 <ChevronRight className="w-3 h-3"/></span>
                        </div>
                      </div>
                    )
                 })}
                 {rulesHit.length === 0 && <div className="text-xs text-gray-500">正常</div>}
               </div>
            </div>

          </div>
        </div>

        {/* 4. Right Panel: Interative Graph, Drawers, Evidence Tabs */}
        <div className="flex-1 flex flex-col bg-[#1A1A1A] relative min-w-0">
          
          <div className="h-[60%] border-b border-[#333333] relative">
            <div className="absolute top-4 left-4 z-10 flex gap-2">
               <button onClick={() => setGraphMode('all')} className={`px-3 py-1.5 border hover:border-[#D4AF37] rounded text-[11px] shadow-lg flex items-center gap-1.5 transition-colors ${graphMode === 'all' ? 'bg-[#333333] border-[#333333] text-white' : 'bg-[#242424] border-[#333333] text-gray-300'}`}><Filter className="w-3 h-3"/> 全部关系</button>
               <button onClick={() => setGraphMode('minimal')} className={`px-3 py-1.5 border hover:border-[#D4AF37] rounded text-[11px] shadow-lg flex items-center gap-1.5 transition-colors ${graphMode === 'minimal' ? 'bg-[#333333] border-[#333333] text-white' : 'bg-[#242424] border-[#333333] text-gray-300'}`}><Network className="w-3 h-3"/> 极简视图</button>
               <button className="px-3 py-1.5 bg-[#242424] border border-[#333333] hover:border-[#D4AF37] rounded text-[11px] shadow-lg flex items-center gap-1.5 transition-colors text-gray-300" onClick={()=>{fetchProject(); toast('画布已重置并拉取最新数据', 'success');}}><Maximize className="w-3 h-3"/> 重置画布</button>
            </div>
            
            {/* Graph Legend */}
            <div className="absolute bottom-4 left-4 z-10 bg-[#242424]/80 backdrop-blur border border-[#333333] p-2 rounded shadow-lg">
              <div className="text-[9px] text-gray-500 mb-1.5 uppercase font-semibold tracking-wider">实体图例 (模式: {graphMode === 'all' ? '全部' : '极简'})</div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[10px]"><span className="w-2.5 h-2.5 rounded-full border border-[#D4AF37] bg-[#242424]"></span> 公司企业</div>
                <div className="flex items-center gap-1.5 text-[10px]"><span className="w-2.5 h-2.5 rounded-full border border-red-500 bg-[#242424]"></span> 异常高危节点</div>
                <div className="flex items-center gap-1.5 text-[10px]"><span className="w-2.5 h-2.5 rounded-full border border-[#4B5563] bg-[#242424]"></span> 个人/高管</div>
              </div>
            </div>

            {/* Core Graph Component */}
            {entities.length > 0 ? (() => {
              const displayEntities = graphMode === 'minimal' ? entities.slice(0, 5) : entities;
              const allowedIds = new Set(displayEntities.map((e: any) => e.name));
              const displayRels = (graphMode === 'minimal' ? rels : rels).filter((r: any) => 
                allowedIds.has(r.source) && allowedIds.has(r.target)
              );
              return <D3Graph entities={displayEntities} relationships={displayRels} onNodeClick={setSelectedNode} onEdgeClick={setSelectedEdge}/>;
            })() : (
              <div className="flex items-center justify-center w-full h-full text-xs text-gray-500">暂无图谱数据</div>
            )}

            {/* Interaction Drawer */}
            {(selectedNode || selectedEdge) && (
              <div className="absolute top-0 right-0 bottom-0 w-[300px] bg-[#242424] border-l border-[#333333] shadow-2xl flex flex-col animate-in slide-in-from-right-8 fade-in z-20">
                <div className="p-4 border-b border-[#333333] flex justify-between items-center bg-[#1A1A1A]">
                  <h3 className="font-semibold text-sm truncate pr-2">{selectedNode ? selectedNode.name : selectedEdge ? `${selectedEdge.source.name} ↔ ${selectedEdge.target.name}` : ''}</h3>
                  <button onClick={()=>{setSelectedNode(null); setSelectedEdge(null)}} className="text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto text-sm space-y-4">
                  {selectedNode && (
                     <>
                        <div>
                          <div className="text-[10px] text-gray-500 mb-1">实体类型</div>
                          <div className="px-2 py-0.5 bg-[#333333] text-gray-300 text-[11px] rounded w-max inline-block">{selectedNode.type}</div>
                        </div>
                        {selectedNode.attributes && Object.entries(selectedNode.attributes).map(([k, v]) => (
                          <div key={k}>
                            <div className="text-[10px] text-gray-500 mb-1 capitalize">{k}</div>
                            <div className="text-[11px] font-mono text-gray-300 bg-[#1A1A1A] p-2 rounded border border-[#333333] whitespace-pre-wrap">{String(v)}</div>
                          </div>
                        ))}
                        <div>
                          <div className="text-[10px] text-gray-500 mb-1">规则验证</div>
                          <div className="text-[11px] text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> 系统智能探测节点</div>
                        </div>
                     </>
                  )}
                  {selectedEdge && (
                     <>
                        <div>
                          <div className="text-[10px] text-gray-500 mb-1">关系类型</div>
                          <div className="text-[12px] font-medium text-gray-200">{selectedEdge.relationType || selectedEdge.type}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 mb-1">关联置信度</div>
                          <div className="text-[12px] font-mono text-[#D4AF37]">98.5% (High)</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 mb-2">证据溯源</div>
                          <div className="p-2 bg-[#1A1A1A] border border-[#333333] rounded">
                             <div className="text-[10px] font-medium text-[#D4AF37] mb-1 flex items-center gap-1"><FileText className="w-3 h-3"/> 系统提取片段</div>
                             <p className="text-[11px] text-gray-400 font-serif leading-relaxed line-clamp-4">{selectedEdge.evidenceSnippet || selectedEdge.evidence}</p>
                          </div>
                        </div>
                     </>
                  )}
                </div>
                <div className="p-3 border-t border-[#333333] bg-[#1A1A1A]">
                   <button onClick={() => toast('完整穿透画像功能敬请期待', 'info')} className="w-full py-2 bg-[#333333] hover:bg-[#444] text-xs font-medium rounded transition-colors text-gray-200">查看完整画像</button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col bg-[#1A1A1A]">
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#333333]">
              <button 
                className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${activeTab === 'doc' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                onClick={() => setActiveTab('doc')}
              >文档证据 ({docsCount})</button>
              <button 
                className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${activeTab === 'fin' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                onClick={() => setActiveTab('fin')}
              >财务证据</button>
              <button 
                className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${activeTab === 'graph' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                onClick={() => setActiveTab('graph')}
              >图谱溯源证据 ({rels.length})</button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
              {activeTab === 'doc' && (
                 <div className="text-center py-8 flex flex-col items-center justify-center h-full">
                    <FileSearch className="w-10 h-10 text-gray-600 mb-3" />
                    {docsCount === 0 ? (
                      <div>
                        <div className="text-sm font-medium text-gray-300 mb-1">暂无项目底稿/凭证集</div>
                        <div className="text-[11px] text-gray-500">当前依赖系统生成的初始信息。请返回列表上传财务底稿或流水以获取更准确风险评分。</div>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-xs">项目共挂载 {docsCount} 份文档。请前往项目库查看详情。</div>
                    )}
                 </div>
              )}
              {activeTab === 'fin' && (
                 <div className="text-center py-8 text-gray-500 text-xs flex flex-col items-center gap-2">
                   <Activity className="w-6 h-6 text-gray-600 opacity-50" />
                   暂无财务流转或水单证据
                 </div>
              )}
              {activeTab === 'graph' && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                 {rels.map((r: any, i: number) => (
                    <div key={i} className="bg-[#242424] border border-[#333333] rounded hover:border-[#D4AF37]/50 transition-colors flex flex-col">
                      <div className="p-3 border-b border-[#333333] flex justify-between items-start">
                        <div>
                          <div className="text-[10px] font-medium text-[#D4AF37] flex items-center gap-1 mb-1"><FileText className="w-3 h-3" /> API 数据 / 公开库</div>
                          <div className="text-xs text-gray-200 font-medium">段落锚点 #{i+102}</div>
                        </div>
                        <span className="text-[9px] text-gray-500 bg-[#1A1A1A] px-1.5 py-0.5 rounded border border-[#333333]">Page 1</span>
                      </div>
                      <div className="p-3 flex-1 flex flex-col">
                         <p className="text-[11px] text-gray-400 font-serif leading-relaxed line-clamp-3 mb-3">
                           ... {r.source} 与 {r.target} 存在 {r.type || r.relationType} 证据: "{r.evidenceSnippet || r.evidence}" ...
                         </p>
                   <div className="mt-auto flex justify-end gap-2">
                     <button onClick={() => toast(`原文节选: \n${r.evidenceSnippet || r.evidence}`, 'info')} className="text-[10px] text-gray-500 hover:text-[#D4AF37]">阅读原文</button>
                     <button onClick={(e) => {
                       toast('已摘录入底稿', 'success');
                             (e.target as HTMLButtonElement).innerText = '已添加';
                             (e.target as HTMLButtonElement).classList.replace('text-blue-400', 'text-green-500');
                             (e.target as HTMLButtonElement).disabled = true;
                           }} className="text-[10px] text-blue-400 font-medium hover:opacity-80">加入底稿</button>
                         </div>
                      </div>
                    </div>
                  ))}
                  {rels.length === 0 && <div className="col-span-full py-8 text-center text-xs text-gray-500">关联图谱暂无有效证据片段</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Panel: Structured Suggestions & Exports */}
      <div className="h-[120px] bg-[#1A1A1A] border-t border-[#333333] grid grid-cols-4 gap-px shrink-0 overflow-hidden divide-x divide-[#333333]">
         <div className="p-4 bg-[#1A1A1A] flex flex-col justify-center">
            <h3 className="text-[11px] font-semibold text-[#D4AF37] mb-2 flex items-center gap-1.5 tracking-wider"><ShieldAlert className="w-3.5 h-3.5" /> 审计操作指令中心</h3>
            <p className="text-[10px] text-gray-500 leading-relaxed max-w-[90%]">系统依据证据链自动生成推荐的复核策略，您可直接将勾选的清单落入工作底稿或提交复核流程。</p>
         </div>
         
         <div className="p-4 bg-[#1A1A1A] overflow-y-auto custom-scrollbar">
            <h3 className="text-[11px] font-semibold text-gray-300 mb-2 flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5 text-blue-400"/> 当前必做审查指南</h3>
            <div className="space-y-1.5">
               <label className="flex items-start gap-2 text-[11px] text-gray-400 hover:text-gray-200 cursor-pointer">
                 <input type="checkbox" className="mt-0.5 accent-[#D4AF37] rounded-sm bg-[#333333] border-[#444]" />
                 对核心高危交叉实体发起实地走访问询。
               </label>
               <label className="flex items-start gap-2 text-[11px] text-gray-400 hover:text-gray-200 cursor-pointer">
                 <input type="checkbox" className="mt-0.5 accent-[#D4AF37] rounded-sm bg-[#333333] border-[#444]" />
                 调取交叉企业近3年对公银行水单防范走账。
               </label>
            </div>
         </div>

         <div className="p-4 bg-[#1A1A1A] overflow-y-auto custom-scrollbar">
            <h3 className="text-[11px] font-semibold text-gray-300 mb-2 flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-amber-500"/> 扩大抽样策略建议</h3>
            <div className="flex flex-wrap gap-2">
               <span className="px-2 py-1 bg-[#242424] border border-[#333333] rounded text-[10px] text-gray-400 cursor-pointer hover:border-gray-500">+ 成立不满1年的大客户</span>
               <span className="px-2 py-1 bg-[#242424] border border-[#333333] rounded text-[10px] text-gray-400 cursor-pointer hover:border-gray-500">+ 关联地址一致性比对名单</span>
               <span className="px-2 py-1 bg-[#242424] border border-[#333333] rounded text-[10px] text-gray-400 cursor-pointer hover:border-gray-500">+ 毛利异常波动产品线</span>
            </div>
         </div>

         <div className="p-4 bg-[#242424] flex flex-col justify-center gap-2">
           <button onClick={() => toast('审计报告及复核请求已发送至相关合伙人', 'success')} className="w-full py-2 bg-gradient-to-r from-[#D4AF37] to-[#C5A028] hover:from-[#E5C048] hover:to-[#D4AF37] text-black font-bold text-[11px] rounded shadow-md flex items-center justify-center gap-2 transition-all">
             <Share2 className="w-3.5 h-3.5" /> 提交复核流转
           </button>
           <div className="grid grid-cols-2 gap-2">
             <button onClick={downloadWorkpapers} className="py-1.5 bg-[#1A1A1A] border border-[#333333] hover:border-gray-500 text-gray-300 text-[10px] rounded flex items-center justify-center gap-1.5 transition-colors">
               <Download className="w-3 h-3" /> 下载底稿
             </button>
             <button onClick={downloadBrief} className="py-1.5 bg-[#1A1A1A] border border-[#333333] hover:border-gray-500 text-gray-300 text-[10px] rounded flex items-center justify-center gap-1.5 transition-colors">
               <FileText className="w-3 h-3" /> 专项简报
             </button>
           </div>
         </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #666; }
      `}} />
    </div>
  );
}
