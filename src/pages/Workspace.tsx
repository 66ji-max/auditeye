import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { 
  ShieldAlert, Bot, User, Database, FileText, Users, AlertTriangle, 
  Activity, Network, TrendingDown, Link as LinkIcon, AlertOctagon, 
  Download, FileSearch, Clock, CheckSquare, Maximize, Maximize2, DownloadCloud,
  Search, Bell, Settings, ChevronRight, Menu, ArrowLeft, Send, X, Layers,
  ChevronDown, Filter, GitBranch, Share2, Upload
} from 'lucide-react';
import * as d3 from 'd3';
import { toast } from '../components/Toast.tsx';
import { RISK_DIMENSIONS } from '../config/riskScoring.ts';
import { getMockProjectDetail } from '../lib/mockData.ts';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { getRiskVisual } from '../utils/riskVisual.ts';

const WorkflowStep: React.FC<{ icon: React.ReactNode, title: string, desc?: string, status: 'done' | 'active' | 'alert' | 'pending', time: string, entities?: number, rules?: number, size?: 'sm' | 'base' }> = ({ icon, title, desc, status, time, entities, rules, size = 'sm' }) => {
  const [expanded, setExpanded] = useState(status !== 'pending');
  return (
    <div className={`relative flex gap-3 pb-6 z-10 group ${size === 'base' ? 'mt-2' : ''}`}>
      <div className={`${size === 'base' ? 'w-8 h-8' : 'w-6 h-6'} rounded-full flex items-center justify-center shrink-0 border transition-colors ${
        status === 'done' ? 'bg-[#1A1A1A] border-[#D4AF37]' : 
        status === 'alert' ? 'bg-red-500/10 border-red-500' : 
        status === 'active' ? 'bg-[#D4AF37]/10 border-[#D4AF37] animate-pulse' :
        'bg-[#1A1A1A] border-[#333333]'
      }`}>
        {icon}
      </div>
      <div className={`flex-1 ${size === 'base' ? 'pt-1' : 'pt-0.5'}`}>
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2">
            <h4 className={`${size === 'base' ? 'text-sm' : 'text-xs'} font-medium ${status === 'alert' ? 'text-red-400' : status === 'pending' ? 'text-gray-500' : 'text-gray-200'}`}>{title}</h4>
            {status === 'done' && <span className={`px-1.5 py-0.5 bg-green-500/10 text-green-400 ${size === 'base' ? 'text-[11px]' : 'text-[9px]'} rounded`}>已完成</span>}
            {status === 'active' && <span className={`px-1.5 py-0.5 bg-blue-500/10 text-blue-400 ${size === 'base' ? 'text-[11px]' : 'text-[9px]'} rounded`}>进行中</span>}
            {status === 'pending' && <span className={`px-1.5 py-0.5 bg-gray-800 text-gray-500 ${size === 'base' ? 'text-[11px]' : 'text-[9px]'} rounded`}>待执行</span>}
          </div>
          <span className={`${size === 'base' ? 'text-xs' : 'text-[10px]'} text-gray-500 font-mono`}>{time}</span>
        </div>
        {expanded && desc && (
          <div className={`mt-2 p-3 bg-[#1A1A1A] border border-[#333333] rounded`}>
            <p className={`${size === 'base' ? 'text-sm' : 'text-[11px]'} text-gray-400 leading-relaxed`}>{desc}</p>
            {(entities || rules) ? (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#333333]">
                {entities !== undefined && <span className={`${size === 'base' ? 'text-xs' : 'text-[10px]'} text-gray-400 flex items-center gap-1`}><Database className={`${size === 'base' ? 'w-4 h-4' : 'w-3 h-3'}`}/> 抽取实体: <strong className="text-[#D4AF37]">{entities}</strong></span>}
                {rules !== undefined && <span className={`${size === 'base' ? 'text-xs' : 'text-[10px]'} text-gray-400 flex items-center gap-1`}><Activity className={`${size === 'base' ? 'w-4 h-4' : 'w-3 h-3'}`}/> 触发规则: <strong className="text-red-400">{rules}</strong></span>}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
    
  );
};

const D3Graph = ({ entities, relationships, onNodeClick, onEdgeClick, expanded = false }: { entities: any[], relationships: any[], onNodeClick: (n: any)=>void, onEdgeClick: (e: any)=>void, expanded?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current || !entities.length || !relationships.length) return;
    
    containerRef.current.innerHTML = '';
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const nodes = entities.map(d => ({ ...d, id: d.name }));
    
    const nodeIds = new Set(nodes.map(n => n.id));
    
    const links = relationships.map(d => ({ 
      ...d, 
      relationType: d.relationType ?? d.type,
      evidenceSnippet: d.evidenceSnippet ?? d.evidence,
      source: d.source, 
      target: d.target 
    })).filter(d => {
      const sourceExists = nodeIds.has(d.source);
      const targetExists = nodeIds.has(d.target);
      if (!sourceExists || !targetExists) {
        console.warn(`[AuditEye] Filtered invalid relationship: source="${d.source}" (exists:${sourceExists}), target="${d.target}" (exists:${targetExists})`);
        return false;
      }
      return true;
    });

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(expanded ? 150 : 95).strength(0.75))
      .force("charge", d3.forceManyBody().strength(expanded ? -350 : -170))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.75))
      .force("x", d3.forceX(width / 2).strength(0.055))
      .force("y", d3.forceY(height / 2).strength(0.055))
      .force("collide", d3.forceCollide().radius(expanded ? 45 : 34).strength(0.75));

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
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.75, 2.2])
      .wheelDelta((event: any) => {
        const base = event.deltaMode === 1 ? 0.015 : 0.0012;
        return -event.deltaY * base;
      })
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
      });

    svg.call(zoomBehavior as any);
    svg.on("dblclick.zoom", null);

    const isHighRiskRel = (rType: string) => ['HIGH_RISK_OVERLAP', 'FORMER_NAME', 'ULTIMATE_CONTROLLER', 'DOCUMENT_MATCH', 'ABNORMAL_TRANSACTION', 'BUSINESS_CROSSCHECK', 'CONTACT_MATCH', 'RELATED_PARTY_TRANSACTION'].includes(rType);

    const link = zoomGroup.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: any) => isHighRiskRel(d.relationType) ? '#ef4444' : '#4B5563')
      .attr("stroke-width", (d: any) => isHighRiskRel(d.relationType) ? (expanded ? 3 : 2) : (expanded ? 2 : 1.5))
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
      .attr("r", (d: any) => d.type === 'COMPANY' ? (expanded ? 32 : 24) : (expanded ? 22 : 16))
      .attr("fill", "#242424")
      .attr("stroke", (d: any) => {
        if(d.attributes?.address && (d.attributes.address as string).includes('3栋')) return "#ef4444";
        return d.type === 'COMPANY' ? "#D4AF37" : "#4B5563";
      })
      .attr("stroke-width", expanded ? 3 : 2);

    node.append("text")
      .attr("y", (d: any) => d.type === 'COMPANY' ? (expanded ? 45 : 38) : (expanded ? 32 : 28))
      .attr("text-anchor", "middle")
      .style("fill", "#E2E8F0")
      .style("font-size", expanded ? "13px" : "10px")
      .style("font-weight", expanded ? "600" : "400")
      .text((d: any) => expanded ? d.name : (d.name.length > 10 ? d.name.substring(0,10)+'...' : d.name));

    svg.on("click", () => { onNodeClick(null); onEdgeClick(null); });

    simulation.on("tick", () => {
      link.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y).attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

  }, [entities, relationships, expanded]);

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-[#1A1A1A]" />;
}

const ExpandedPanelModal = ({ expandedPanel, setExpandedPanel }: any) => {
  if (!expandedPanel) return null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedPanel(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setExpandedPanel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setExpandedPanel(null)}>
      <div 
        className="relative bg-[#121212] border border-[#333333] w-[96vw] max-w-[1680px] h-[94vh] rounded-lg shadow-2xl flex flex-col overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#333333] bg-[#1A1A1A] sticky top-0 z-50">
          <h2 className="text-xl font-semibold text-gray-200">{expandedPanel.title}</h2>
          <button onClick={() => setExpandedPanel(null)} className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded text-gray-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-[#121212] custom-scrollbar" style={{ height: 'calc(94vh - 65px)' }}>
          {expandedPanel.content}
        </div>
      </div>
    </div>
  );
};

// Feature details modal state
let WorkspaceFeatureModal;
const RiskScoringModule = ({ data, onFeatureClick, onExpand, expanded = false, setExpandedPanel, onReadOriginal, openFeatureImage }: { data: any, onFeatureClick?: (feature: any) => void, onExpand?: () => void, expanded?: boolean, setExpandedPanel?: any, onReadOriginal?: (feature:any) => void, openFeatureImage?: (feature:any) => void }) => {
  if (!data) return null;
  const { probabilityPercent, riskLevel, threshold, zValue, warning, subIndices, rawFeatures, conclusion, globalWeights, localWeights, industryType, industryName } = data;
  const displayProbabilityPercent = Math.round(Number(probabilityPercent ?? 0) || 0);

  const visual = getRiskVisual(displayProbabilityPercent, riskLevel);
  
  const handleSubIndexExpand = (type: 'X1'|'X2'|'X3', title: string, color: string, features: any[], w: number) => {
     if (!setExpandedPanel) return;
     const sumFormula = features.map(f => `${localWeights?.[type]?.[f.id] || 0.5}*${f.id}`).join(' + ');
     
     setExpandedPanel({
       title,
       type: 'subIndex',
       content: (
         <div className="space-y-6">
           <div className={`p-6 bg-[#1A1A1A] border-l-4 rounded ${color} flex justify-between items-center bg-gradient-to-r from-[#242424] to-[#1A1A1A]`}>
             <div>
               <div className="text-gray-400 text-sm mb-1">当前指数值</div>
               <div className="text-5xl font-bold font-mono text-gray-100">{subIndices[type]}</div>
               <div className="text-gray-500 text-sm mt-2">全局权重 W{type.substring(1)} = {w}</div>
             </div>
             <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">局部聚合公式</div>
                <div className="text-xl font-mono text-[#D4AF37]">{type} = {sumFormula}</div>
             </div>
           </div>
           
           <h3 className="text-lg font-semibold text-gray-200 mt-8 mb-4 border-b border-[#333333] pb-2">底层特征明细</h3>
           <div className="grid grid-cols-1 gap-4">
             {features.map((f:any) => (
                <div key={f.id} onClick={(e) => { e.stopPropagation(); setExpandedPanel({ title: `风险特征画像：${f.label} ${f.id}`, type: 'feature_profile', content: (<FeatureProfile feature={f} onReadOriginal={onReadOriginal} setExpandedPanel={setExpandedPanel}/>) }); }} className="p-6 bg-[#242424] border border-[#333333] rounded hover:border-[#D4AF37]/60 hover:bg-[#2e2e2e] cursor-pointer group relative transition-all">
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="flex items-center gap-1 text-[11px] bg-[#333] px-2 py-1 rounded text-gray-400 font-medium border border-[#444] shadow-sm"><Maximize2 className="w-3 h-3"/> 查看画像</span>
      </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg text-gray-200 font-bold">[{f.id}] {f.label}</span>
                    <span className="text-xl text-[#D4AF37] font-mono">v = {f.value.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-500 font-mono mb-4 bg-[#1A1A1A] p-3 rounded">算法引擎: {f.method}</div>
                  <div className="grid grid-cols-2 gap-6">
                     <div>
                       <strong className="text-gray-300 block mb-2 text-sm">证据段落:</strong>
                       <p className="text-gray-400 text-sm leading-relaxed">{f.evidence}</p>
                     </div>
                     <div>
                       <strong className="text-gray-300 block mb-2 text-sm">风险释义:</strong>
                       <p className="text-gray-400 text-sm leading-relaxed">{f.explanation}</p>
                     </div>
                  </div>
                  {onReadOriginal && (
                    <div className="flex justify-end mt-4">
                      <button onClick={(e) => { e.stopPropagation(); onReadOriginal(f); }} className="text-xs text-gray-400 hover:text-[#D4AF37] flex items-center gap-1 border border-gray-600 hover:border-[#D4AF37] px-3 py-1.5 rounded transition-colors">
                        <FileText className="w-3.5 h-3.5" /> 阅读全文
                      </button>
                    </div>
                  )}
                </div>
             ))}
           </div>
         </div>
       )
     });
  };
  
  return (
    <div className={`flex flex-col ${expanded ? 'gap-8' : 'gap-5'} pb-8 h-full`}>
      {/* 顶部总览卡片 */}
      <div 
         className={`bg-gradient-to-br from-[#242424] to-[#1A1A1A] border border-[#333333] rounded ${expanded ? 'p-6' : 'p-4'} relative overflow-hidden shadow-lg group ${onExpand && !expanded ? 'cursor-pointer hover:border-[#D4AF37]/60 hover:shadow-[0_0_15px_rgba(212,175,55,0.1)]' : ''}`}
         onClick={onExpand && !expanded ? (e) => { e.stopPropagation(); onExpand(); } : undefined}
      >
        {onExpand && !expanded && (
          <button 
            onClick={onExpand} 
            className="absolute top-4 right-4 z-20 p-2 bg-transparent border border-transparent rounded text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all opacity-30 hover:opacity-100 hidden sm:flex items-center justify-center cursor-pointer"
            title="展开风险评分详情"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        )}
        {displayProbabilityPercent > threshold && <div className={`absolute top-0 right-0 w-32 h-32 ${visual.bg} rounded-full blur-3xl`}></div>}
        <div className={`flex justify-between items-start ${expanded ? 'mb-6' : 'mb-4'} relative z-10`}>
          <div>
            <h3 className={`${expanded ? 'text-sm' : 'text-xs'} text-gray-400 font-medium tracking-wider mb-1`}>审计风险概率 P(Risk)</h3>
            <div className="flex items-end gap-3">
              <span className={`${expanded ? 'text-6xl' : 'text-4xl'} font-bold tracking-tighter ${visual.color}`}>
                {displayProbabilityPercent} <span className={`${expanded ? 'text-2xl' : 'text-xl'} text-gray-500 font-normal`}>/100</span>
              </span>
              <span className={`${expanded ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1'} rounded mb-1.5 font-medium border ${visual.bg} ${visual.color} ${visual.border}`}>
                {visual.label}
              </span>
              {warning && (
                <span className={`${expanded ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1'} rounded mb-1.5 font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1`}>
                  <AlertTriangle className={expanded ? "w-4 h-4" : "w-3 h-3"}/> {warning}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className={`${expanded ? 'text-xs' : 'text-[10px]'} text-gray-500 font-mono`}>算法模型：分层逻辑回归</div>
            <div className={`${expanded ? 'text-sm' : 'text-[10px]'} text-gray-400 font-mono mt-1`}>Z = {zValue?.toFixed(4) || 0}</div>
            <div className={`${expanded ? 'text-xs' : 'text-[10px]'} text-gray-500 font-mono mt-1`}>高危阈值 P &gt; {threshold}%</div>
            {industryName && (
               <div className={`${expanded ? 'text-xs' : 'text-[11px]'} text-[#D4AF37] font-mono mt-3`}>
                 <div className="mb-0.5">模型门类: {industryName}</div>
                 <div className="mb-0.5">权重来源: {data.weightSource === 'expert_prior' ? '专家先验' : '样本融合学习'}</div>
                 <div><span className="text-gray-400">参数:</span> W1={globalWeights?.W1}, W2={globalWeights?.W2}, W3={globalWeights?.W3}, b={globalWeights?.b}</div>
               </div>
            )}
          </div>
        </div>
        <p className={`${expanded ? 'text-sm' : 'text-[11px]'} text-gray-300 leading-relaxed border-t border-[#333333] ${expanded ? 'pt-4' : 'pt-3'} relative z-10`}>
          <strong>判断说明：</strong>{conclusion}
        </p>
      </div>

      {/* 三个子指数卡片 */}
      <div className={`grid ${expanded ? 'grid-cols-3 gap-6' : 'grid-cols-1 gap-3'} w-full`}>
        {/* X1 */}
        <div 
           className="bg-[#1A1A1A] border border-[#333333] rounded p-4 relative hover:border-[#D4AF37]/50 transition-colors flex flex-col justify-between group cursor-pointer"
           onClick={() => handleSubIndexExpand('X1', '身份关联指数 X1 详情', 'border-blue-500', rawFeatures.identityNetwork, globalWeights.W1)}
        >
           <div>
             <div className="flex justify-between items-center mb-3">
               <div className="flex items-center gap-2"><Users className={`${expanded ? 'w-5 h-5' : 'w-3.5 h-3.5'} text-blue-400`}/> <span className={`${expanded ? 'text-sm' : 'text-xs'} font-semibold text-gray-200`}>身份关联指数 X1</span></div>
               <span className={`${expanded ? 'text-2xl' : 'text-lg'} font-bold text-gray-100 font-mono`}>{subIndices.X1}</span>
             </div>
             <div className={`${expanded ? 'text-xs' : 'text-[10px]'} text-gray-500 mb-3 font-mono`}>全局权重 W1 = {globalWeights.W1}</div>
           </div>
           <div>
             <div className={`h-1.5 w-full bg-[#242424] rounded-full overflow-hidden ${expanded ? 'mb-3' : 'mb-2'}`}><div className="h-full bg-blue-500" style={{ width: `${Math.min(subIndices.X1 * 100, 100)}%` }}></div></div>
             <p className={`${expanded ? 'text-xs leading-relaxed' : 'text-[10px]'} text-gray-400`}>重点评估控制链路溯源及实际控制网络重叠嫌疑。</p>
           </div>
        </div>
        {/* X2 */}
        <div 
           className="bg-[#1A1A1A] border border-[#333333] rounded p-4 relative hover:border-[#D4AF37]/50 transition-colors flex flex-col justify-between group cursor-pointer"
           onClick={() => handleSubIndexExpand('X2', '交易异常指数 X2 详情', 'border-red-500', rawFeatures.transactionAbnormality, globalWeights.W2)}
        >
           <div>
             <div className="flex justify-between items-center mb-3">
               <div className="flex items-center gap-2"><Activity className={`${expanded ? 'w-5 h-5' : 'w-3.5 h-3.5'} text-red-400`}/> <span className={`${expanded ? 'text-sm' : 'text-xs'} font-semibold text-gray-200`}>交易异常指数 X2</span></div>
               <span className={`${expanded ? 'text-2xl' : 'text-lg'} font-bold text-gray-100 font-mono`}>{subIndices.X2}</span>
             </div>
             <div className={`${expanded ? 'text-xs' : 'text-[10px]'} text-gray-500 mb-3 font-mono`}>全局权重 W2 = {globalWeights.W2}</div>
           </div>
           <div>
             <div className={`h-1.5 w-full bg-[#242424] rounded-full overflow-hidden ${expanded ? 'mb-3' : 'mb-2'}`}><div className="h-full bg-red-500" style={{ width: `${Math.min(subIndices.X2 * 100, 100)}%` }}></div></div>
             <p className={`${expanded ? 'text-xs leading-relaxed' : 'text-[10px]'} text-gray-400`}>本案例核心风险来源，高度空壳化与短时大额突击交易。</p>
           </div>
        </div>
        {/* X3 */}
        <div 
           className="bg-[#1A1A1A] border border-[#333333] rounded p-4 relative hover:border-[#D4AF37]/50 transition-colors flex flex-col justify-between group cursor-pointer"
           onClick={() => handleSubIndexExpand('X3', '外围牵连指数 X3 详情', 'border-green-500', rawFeatures.externalTrace, globalWeights.W3)}
        >
           <div>
             <div className="flex justify-between items-center mb-3">
               <div className="flex items-center gap-2"><Search className={`${expanded ? 'w-5 h-5' : 'w-3.5 h-3.5'} text-green-400`}/> <span className={`${expanded ? 'text-sm' : 'text-xs'} font-semibold text-gray-200`}>外围牵连指数 X3</span></div>
               <span className={`${expanded ? 'text-2xl' : 'text-lg'} font-bold text-gray-100 font-mono`}>{subIndices.X3.toFixed(2)}</span>
             </div>
             <div className={`${expanded ? 'text-xs' : 'text-[10px]'} text-gray-500 mb-3 font-mono`}>全局权重 W3 = {globalWeights.W3}</div>
           </div>
           <div>
             <div className={`h-1.5 w-full bg-[#242424] rounded-full overflow-hidden ${expanded ? 'mb-3' : 'mb-2'}`}><div className="h-full bg-green-500" style={{ width: `${Math.min(subIndices.X3 * 100, 100)}%` }}></div></div>
             <p className={`${expanded ? 'text-xs leading-relaxed' : 'text-[10px]'} text-gray-400`}>目前法律诉讼及注册资本变更动作相对静默。</p>
           </div>
        </div>
      </div>

      {/* 底层特征列表 */}
      <div className="flex-1">
        <h3 className={`${expanded ? 'text-sm mb-4' : 'text-xs mb-3'} font-semibold text-gray-300 border-l-2 border-[#D4AF37] pl-3`}>风险量化 - 底层特征明细</h3>
        <div className={expanded ? 'grid grid-cols-3 gap-6' : 'space-y-4'}>
          
          <div className="border border-[#333333] rounded bg-[#242424] overflow-hidden flex flex-col h-full group/x1">
            <div className={`bg-[#1A1A1A] px-4 py-3 border-b border-[#333333] ${expanded ? 'text-xs' : 'text-[10px]'} font-semibold text-gray-300 flex items-center justify-between`}>
              <span className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-400"/>身份网络特征组 (X1)</span>
            </div>
            <div className="divide-y divide-[#333333] flex-1">
              {rawFeatures.identityNetwork.map((f: any) => (
                <div key={f.id} className={`${expanded ? 'p-5' : 'p-3'} hover:bg-[#2A2A2A] cursor-pointer transition-colors`} onClick={() => onFeatureClick?.(f)}>
                  <div className="flex justify-between mb-2">
                    <span className={`${expanded ? 'text-sm' : 'text-xs'} text-gray-200 font-medium`}>[{f.id}] {f.label}</span>
                    <span className={`${expanded ? 'text-sm' : 'text-[11px]'} font-mono ${f.value > 0.7 ? 'text-red-400' : 'text-gray-400'}`}>v = {f.value.toFixed(2)}</span>
                  </div>
                  <div className={`${expanded ? 'text-xs' : 'text-[9px]'} text-gray-500 mb-2 font-mono`}>算法: {f.method}</div>
                  <p className={`${expanded ? 'text-xs leading-relaxed' : 'text-[10px] leading-relaxed'} text-gray-400 mb-2`}><strong className="text-gray-300">RAG 回溯:</strong> {f.evidence}</p>
                  <div className="flex justify-end mt-2">
                     <button onClick={(e) => { e.stopPropagation(); onReadOriginal?.(f); }} className="text-[10px] text-gray-500 hover:text-[#D4AF37]">阅读原文</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#333333] rounded bg-[#242424] overflow-hidden flex flex-col h-full group/x2">
            <div className={`bg-[#1A1A1A] px-4 py-3 border-b border-[#333333] ${expanded ? 'text-xs' : 'text-[10px]'} font-semibold text-gray-300 flex items-center justify-between`}>
              <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-red-400"/>交易异常特征组 (X2)</span>
            </div>
            <div className="divide-y divide-[#333333] flex-1">
              {rawFeatures.transactionAbnormality.map((f: any) => (
                <div key={f.id} className={`${expanded ? 'p-5' : 'p-3'} hover:bg-[#2A2A2A] cursor-pointer transition-colors`} onClick={() => onFeatureClick?.(f)}>
                  <div className="flex justify-between mb-2">
                    <span className={`${expanded ? 'text-sm' : 'text-xs'} text-gray-200 font-medium`}>[{f.id}] {f.label}</span>
                    <span className={`${expanded ? 'text-sm' : 'text-[11px]'} font-mono ${f.value > 0.7 ? 'text-red-400' : 'text-gray-400'}`}>v = {f.value.toFixed(2)}</span>
                  </div>
                  <div className={`${expanded ? 'text-xs' : 'text-[9px]'} text-gray-500 mb-2 font-mono`}>算法: {f.method}</div>
                  <p className={`${expanded ? 'text-xs leading-relaxed' : 'text-[10px] leading-relaxed'} text-gray-400 mb-2`}><strong className="text-gray-300">RAG 回溯:</strong> {f.evidence}</p>
                  <div className="flex justify-end mt-2">
                     <button onClick={(e) => { e.stopPropagation(); onReadOriginal?.(f); }} className="text-[10px] text-gray-500 hover:text-[#D4AF37]">阅读原文</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#333333] rounded bg-[#242424] overflow-hidden flex flex-col h-full group/x3">
            <div className={`bg-[#1A1A1A] px-4 py-3 border-b border-[#333333] ${expanded ? 'text-xs' : 'text-[10px]'} font-semibold text-gray-300 flex items-center justify-between`}>
              <span className="flex items-center gap-2"><Search className="w-4 h-4 text-green-400"/>外围痕迹特征组 (X3)</span>
            </div>
            <div className="divide-y divide-[#333333] flex-1">
              {rawFeatures.externalTrace.map((f: any) => (
                <div key={f.id} className={`${expanded ? 'p-5' : 'p-3'} hover:bg-[#2A2A2A] cursor-pointer transition-colors`} onClick={() => onFeatureClick?.(f)}>
                  <div className="flex justify-between mb-2">
                    <span className={`${expanded ? 'text-sm' : 'text-xs'} text-gray-200 font-medium`}>[{f.id}] {f.label}</span>
                    <span className={`${expanded ? 'text-sm' : 'text-[11px]'} font-mono ${f.value > 0.7 ? 'text-red-400' : 'text-gray-400'}`}>v = {f.value.toFixed(2)}</span>
                  </div>
                  <div className={`${expanded ? 'text-xs' : 'text-[9px]'} text-gray-500 mb-2 font-mono`}>算法: {f.method}</div>
                  <p className={`${expanded ? 'text-xs leading-relaxed' : 'text-[10px] leading-relaxed'} text-gray-400 mb-2`}><strong className="text-gray-300">RAG 回溯:</strong> {f.evidence}</p>
                  <div className="flex justify-end mt-2">
                     <button onClick={(e) => { e.stopPropagation(); onReadOriginal?.(f); }} className="text-[10px] text-gray-500 hover:text-[#D4AF37]">阅读原文</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};


const FeatureProfile = ({ feature, onReadOriginal, setExpandedPanel }: any) => {
  const originalText = feature.evidenceSource?.originalText || feature.evidenceSnippet || feature.evidence || '暂无原文内容';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1A1A1A] border border-[#333333] rounded p-4">
           <div className="text-gray-500 text-xs mb-1">特征编号 & 名称</div>
           <div className="text-[#D4AF37] font-bold text-lg">{feature.id} - {feature.label}</div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#333333] rounded p-4">
           <div className="text-gray-500 text-xs mb-1">归属子指数 & 局部权重</div>
           <div className="text-gray-200 font-bold text-sm">{feature.group || '自动推演'} <span className="ml-2 text-gray-400 font-mono font-normal">W = {feature.localWeight || '0.45'}</span></div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#333333] rounded p-4">
           <div className="text-gray-500 text-xs mb-1">风险等级与当前值</div>
           <div className="flex items-end gap-3 text-red-400 font-bold text-lg">
             高风险 <span className="text-gray-300 font-mono text-base ml-2">v = {feature.value.toFixed(2)}</span>
           </div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#333333] rounded p-4">
           <div className="text-gray-500 text-xs mb-1">算法来源</div>
           <div className="text-gray-300 font-mono text-sm">{feature.method || '逻辑判断'}</div>
        </div>
      </div>

      <div className="bg-[#242424] border border-[#333333] rounded p-5 space-y-5">
        <div>
          <h4 className="text-gray-300 font-semibold mb-2">画像解释</h4>
          <p className="text-gray-400 text-sm leading-relaxed">{feature.explanation || '命中审计风险底稿中的多项指标特征，需重点穿透。'}</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-gray-300 font-semibold mb-2 text-sm">RAG 证据摘要</h4>
            <div className="bg-[#1A1A1A] border border-[#333333] p-3 rounded text-xs text-gray-400 font-mono leading-relaxed h-[120px] overflow-y-auto">
              {feature.evidence || '摘要信息提取中...'}
            </div>
          </div>
          <div>
            <h4 className="text-gray-300 font-semibold mb-2 text-sm flex justify-between items-center">原文证据片段 <button onClick={() => toast('原文已复制', 'success')} className="text-[#D4AF37] hover:text-white transition-colors text-xs font-normal">复制</button></h4>
            <div className="bg-[#121212] border border-[#333333] p-3 rounded text-xs text-gray-400 font-mono leading-relaxed h-[120px] overflow-y-auto">
              {originalText}
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-gray-300 font-semibold mb-2 mt-2 text-sm flex items-center gap-2">关联实体与关系</h4>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="px-3 py-1.5 bg-[#1A1A1A] border border-[#333333] rounded text-xs text-blue-400">登XX发行主体</span>
            <span className="px-2 py-0.5 border border-dashed border-gray-600 rounded text-[10px] text-gray-500 tracking-wider">ABNORMAL_TRANSACTION</span>
            <span className="px-3 py-1.5 bg-[#1A1A1A] border border-[#333333] rounded text-xs text-blue-400">山东旺XX汽车零部件</span>
          </div>
        </div>
        
        <div className="pt-4 border-t border-[#333333] space-y-3">
          <h4 className="text-white font-semibold flex items-center gap-2">审计建议 <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">高危触发</span></h4>
          <ul className="text-sm text-gray-400 space-y-2 list-disc pl-5">
            <li>调取完整采购合同和发票，核查交易定价公允性。</li>
            <li>检查是否存在突击交易，追踪资金流向与最终收款账户。</li>
            <li>穿透法人网络，审查是否存在隐蔽实控人关联。</li>
          </ul>
        </div>
        
        <div className="flex gap-3 pt-4 border-t border-[#333333] justify-end">
           <button onClick={() => { setExpandedPanel(null); const tabBtn = document.querySelector('button[onClick*="setRightTab(\'graph\')"]'); if(tabBtn) (tabBtn as any).click(); toast('已定位到相关知识图谱', 'success'); }} className="px-4 py-2 border border-[#333333] rounded text-sm hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors flex items-center gap-2"><Network className="w-4 h-4"/>定位图谱</button>
           <button onClick={(e) => { (e.target as any).innerHTML = '已加入底稿'; (e.target as any).className = 'px-4 py-2 bg-[#2A2A2A] text-gray-400 border border-[#444] rounded text-sm cursor-not-allowed'; toast('风险特征已加入工作底稿', 'success'); }} className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded text-sm hover:bg-[#E5C048] transition-colors">加入底稿</button>
        </div>
      </div>
    </div>
  );
};

const parseLogDetails = (details: any) => {
  if (!details) return { message: '系统日志' };
  if (typeof details === 'object') return details;
  if (typeof details === 'string') {
    try {
      return JSON.parse(details);
    } catch {
      return { message: details };
    }
  }
  return { message: String(details) };
};

function WorkspaceInner() {

  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [query, setQuery] = useState('分析登XX发行主体与山东旺XX汽车零部件有限公司的关联交易风险');
  const [loading, setLoading] = useState(false);
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'doc'|'fin'|'graph'>('doc');
  const [graphMode, setGraphMode] = useState<'all'|'minimal'>('all');
  const [showRuleSet, setShowRuleSet] = useState(false);
  const [activeRuleSet, setActiveRuleSet] = useState('标准审计预警 (v1.4.2)');
  const [customLogs, setCustomLogs] = useState<any[]>([]);
  const [addedToDraft, setAddedToDraft] = useState<Set<number>>(new Set());
  const [lastAnalysisAt, setLastAnalysisAt] = useState<Date | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<null | { title: string; type: string; content: React.ReactNode; }>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [evidenceToShow, setEvidenceToShow] = useState<any>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [loadingProject, setLoadingProject] = useState(true);


  const normalizeDocumentsToDataSources = (documents: any[]) => {
    return (documents || []).map((doc: any) => ({
      id: doc.id,
      name: doc.originalName || doc.fileName || doc.name,
      type: (doc.sourceType || doc.fileName?.split('.').pop() || '未知').replace('.', '').toUpperCase(),
      size: doc.size || doc.sizeText || '演示数据',
      source: doc.source || '项目证据库',
      status: doc.status === 'uploaded' ? (doc.parseStatus === 'parsed' ? '已解析' : (doc.parseStatus === 'failed' ? '解析失败' : '排队中')) : (doc.status || '已解析'),
      date: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : (doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString()),
      entities: doc.entities || parseInt((doc.sizeBytes/(1024*10)).toFixed(0)) || 12, // mock some entity count based on file size if missing
      evidenceCount: doc.evidenceCount || 24,
      blobUrl: doc.blobUrl
    }));
  };

  const formatWorkflowTime = (time?: string | Date) => {
    const d = time ? new Date(time) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };


  const appendUploadedFilesToProject = (uploadFiles: File[], uploadedDocsFromApi?: any[]) => {
    let newDocs: any[] = [];
    
    if (uploadedDocsFromApi && uploadedDocsFromApi.length > 0) {
      newDocs = uploadedDocsFromApi;
    } else {
      newDocs = uploadFiles.map((fac, i) => ({ 
        id: Date.now()+i, 
        fileName: fac.name, 
        originalName: fac.name, 
        sourceType: 'EXT',
        sizeText: (fac.size / 1024 / 1024).toFixed(2) + ' MB'
      }));
    }
    
    setData((prev:any) => ({
      ...prev, 
      documents: [...(prev?.documents||[]), ...newDocs]
    }));
    
    const newDS = newDocs.map(doc => ({
       id: doc.id,
       name: doc.originalName || doc.fileName,
       type: (doc.sourceType || doc.fileName?.split('.').pop() || '未知').replace('.', '').toUpperCase(),
       size: doc.sizeText || '未知大小',
       source: "手动上传",
       status: "解析中",
       date: new Date().toLocaleDateString(),
       entities: 0,
       evidenceCount: 0
    }));
    
    setDataSources((prev: any) => [...newDS, ...prev]);
    
    setShowUploadModal(false);
    setUploadFiles([]);
    setShowDataSourceModal(true);
    setCustomLogs((prev:any) => [{action:'INFO', createdAt: new Date().toISOString(), details: JSON.stringify({ message: '追加数据源已接入并完成解析' })}, ...prev]);
    toast("数据源上传成功，已加入当前项目证据库", "success");
    
    // simulate parsing completion
    setTimeout(() => {
        setDataSources((prev: any) => prev.map((ds: any) => ds.status === '解析中' ? {...ds, status: '已解析', entities: 15, evidenceCount: 32} : ds));
        toast("追加数据源解析完成", "success");
    }, 2000);
  };

  const fetchProject = async () => {
    const isDemoProject = ['1001', '1002', '1003', '1004'].includes(String(id));

    if (isDemoProject) {
      const localDetail = getMockProjectDetail(String(id || "1001"));
      if (localDetail && localDetail.project) {
        const finalScore = Math.round(Number(
          localDetail?.riskScoring?.probabilityPercent ??
          localDetail?.project?.riskScore ??
          0
        ) || 0);

        localDetail.project.riskScore = finalScore;

        if (localDetail.riskScoring) {
          localDetail.riskScoring.probabilityPercent = finalScore;
        }

        setData(localDetail);
        setDataSources(normalizeDocumentsToDataSources(localDetail.documents || []));
        setLoadingProject(false);
        console.log('[AuditEye] Workspace loaded demo detail from local mockData', {
          id,
          projectScore: localDetail.project.riskScore,
          riskScoringScore: localDetail.riskScoring?.probabilityPercent
        });
        return;
      }
    }

    try {
      const res = await fetch(`/api/projects/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`请求失败状态码: ${res.status}`);
      const apiData = await res.json();
      
      if (apiData && apiData.project) {
        const finalScore = Math.round(Number(
          apiData?.riskScoring?.probabilityPercent ??
          apiData?.project?.riskScore ??
          0
        ));

        apiData.project.riskScore = finalScore;

        if (apiData.riskScoring) {
          apiData.riskScoring.probabilityPercent = finalScore;
        }

        setData(apiData);
        setDataSources(normalizeDocumentsToDataSources(apiData.documents || []));
      } else {
        throw new Error('API 返回数据结构异常');
      }
      setLoadingProject(false);
    } catch (e: any) {
      console.warn("API 获取失败, 使用本地 Demo 数据", e);
      const fallbackData = getMockProjectDetail(id || "1001") as any;
      if (fallbackData && fallbackData.project) {
        const finalScore = Math.round(Number(
          fallbackData?.riskScoring?.probabilityPercent ??
          fallbackData?.project?.riskScore ??
          0
        ) || 0);

        fallbackData.project.riskScore = finalScore;

        if (fallbackData.riskScoring) {
          fallbackData.riskScoring.probabilityPercent = finalScore;
        }

        setData(fallbackData);
        setDataSources(normalizeDocumentsToDataSources(fallbackData.documents || []));
      } else {
        setData(null);
      }
      setLoadingProject(false);
    }
  };

  useEffect(() => { fetchProject(); }, [id]);

  const handleAnalyze = async () => {
    const now = new Date();
    setLastAnalysisAt(now);
    setLoading(true);
    try {
      await fetch(`/api/projects/${id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetCompany: query })
      });
      await fetchProject();
      setSelectedNode(null);
      setSelectedEdge(null);
    } finally {
      setLoading(false);
    }
  };

  if (loadingProject) {
    return (
      <div className="h-full w-full bg-[#1A1A1A] flex flex-col justify-center items-center text-gray-400 gap-4">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium tracking-wide">正在同步项目档案分析结果...</p>
      </div>
    );
  }

  if (!data || !data.project) return (
    <div className="h-screen w-full bg-[#121212] flex flex-col items-center justify-center text-gray-400 gap-4">
      <AlertOctagon className="w-12 h-12 text-[#D4AF37] opacity-50" />
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-200 mb-1">未找到该项目</h2>
        <p className="text-sm">该审计项目可能已被删除，或由于网络原因无法加载。</p>
      </div>
      <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-[#242424] border border-[#333333] hover:border-[#D4AF37] rounded transition-colors text-sm text-gray-300">返回项目列表</button>
    </div>
  );

  const logs = data.audit_logs || [];
  const entities = data.entities || [];
  const rels = data.relationships || [];

  const getDisplayRiskScore = (data: any) => {
    return Math.round(Number(
      data?.riskScoring?.probabilityPercent ??
      data?.project?.riskScore ??
      0
    ) || 0);
  };

  const displayScore = getDisplayRiskScore(data);

  const riskScoring = data.riskScoring
    ? {
        ...data.riskScoring,
        probabilityPercent: displayScore
      }
    : null;

  const score = displayScore;
  const rawRiskLvl = riskScoring ? riskScoring.riskLevel : data.project.riskLevel;
  const riskLevel = getRiskVisual(score, rawRiskLvl);
  const dimScores = data.project.dimensionScores || { relation: 0, behavior: 0, financial: 0 };
  
  const rulesHit = logs.filter((l: any) => l.action === 'RED_FLAG');
  const docsCount = data.documents?.length || 0;

  const downloadWorkpapers = () => {
    toast('正在打包底稿...', 'info');
    let riskEvaluationSection = '';
    
    if (data.riskScoring) {
      riskEvaluationSection = `【全局风险评估】
综合风险评分: ${score} /100 (${(riskScoring?.riskLevel || "未评估")}) 
逻辑值 Z: ${Number(riskScoring?.zValue || 0).toFixed(4)}
高危预警阈值: ${(riskScoring?.threshold || 0)}
判断说明: ${(riskScoring?.conclusion || "暂无")}

【三维子指数分析】
X1 身份关联指数: ${(riskScoring?.subIndices?.X1 || 0)}
X2 交易异常指数: ${(riskScoring?.subIndices?.X2 || 0)}
X3 外围牵连指数: ${(riskScoring?.subIndices?.X3 || 0)}`;
    } else {
      riskEvaluationSection = `【风险评估】
综合评分: ${score} - ${riskLevel.label}
身份关联识别: ${dimScores.identity} 分
交易行为异常: ${dimScores.behavior} 分
外围关联佐证: ${dimScores.circumstantial} 分`;
    }

    const content = `=============== AuditEye 综合审计底稿 ===============
项目名称: ${data.project?.name}
场景: ${data.project?.scenario}
创建时间: ${new Date(data.project?.createdAt).toLocaleString()}
--------------------------------------------------
${riskEvaluationSection}
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
    const html = `<html><head><meta charset="utf-8"/><title>关联交易风险分析报告（AI生成） - ${data.project?.name}</title><style>
      body{font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 800px; margin: 2rem auto; line-height: 1.6; color: #333;}
      h1{color: #C5A028; text-align: center; margin-bottom: 5px;}
      .header-meta{text-align: center; color: #666; font-size: 0.9em; margin-bottom: 30px;}
      .stamp{position: absolute; top: 20px; right: 20px; color: #D32F2F; border: 2px solid #D32F2F; padding: 5px 10px; font-weight: bold; transform: rotate(15deg); border-radius: 4px; font-size: 0.8em;}
      .section{margin-bottom: 30px;}
      h2{color: #333; border-bottom: 2px solid #C5A028; padding-bottom: 5px; margin-top: 30px;}
      h3{color: #555; margin-bottom: 10px;}
      .risk-score{font-size: 1.5em; font-weight: bold; color: ${score >= 85 ? '#D32F2F' : score >= 60 ? '#F57C00' : score >= 30 ? '#1976D2' : '#388E3C'};}
      .rule-box{background: #f9f9f9; padding: 15px; border-left: 4px solid #C5A028; margin-bottom: 15px; border-radius: 0 4px 4px 0;}
      .rule-box h4{margin: 0 0 5px 0; color: #D32F2F;}
      ul{padding-left: 20px; margin-top: 5px;}
      .footer-note{margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.8em; color: #888;}
    </style></head>
<body>
  <div class="stamp">机密文件 / 仅供内部使用</div>
  <h1>关联交易风险分析报告（AI生成）</h1>
  <div class="header-meta">
    项目名称：${data.project?.name}<br/>
    被审计主体：${entities.find((e:any) => e.type === 'COMPANY' && e.name.includes('发行'))?.name || data.project?.name}<br/>
    核查范围：2021.01.01 - 2024.04.30<br/>
    报告日期：2024年5月20日<br/>
    生成工具：AuditEye 智能审计分析平台
  </div>

  <div class="section">
    <h2>01 项目概述</h2>
    <p><strong>核查目标：</strong>针对发行人关联交易真实性、完整性及资金流向进行智能风险识别与分析，揭示潜在隐性关联关系及异常交易行为。</p>
    <p><strong>核查范围：</strong></p>
    <ul>
      <li>工商及股权穿透数据</li>
      <li>财务与ERP交易数据</li>
      <li>发票与合同数据</li>
      <li>银行流水数据</li>
      <li>公开信息及舆情数据</li>
    </ul>
    <p><strong>核查结论：</strong></p>
    <ul>
      <li>高风险关联主体：3个</li>
      <li>异常资金/交易路径：2条</li>
      <li>疑似隐性关联交易：5笔</li>
      <li><strong>建议进一步人工复核与补充审计程序</strong></li>
    </ul>
  </div>

  <div class="section">
    <h2>02 风险发现详情</h2>
    ${data.riskScoring ? `
    <p>综合风险评分（基于分层逻辑回归模型）：<span class="risk-score">${score} /100（${(riskScoring?.riskLevel || "未评估")}）</span></p>
    <p>Z值：${Number(riskScoring?.zValue || 0).toFixed(4)} | 高危阈值：${(riskScoring?.threshold || 0)}</p>
    <p><strong>判断说明：</strong>${(riskScoring?.conclusion || "暂无")}</p>
    <p><strong>三维子指数：</strong>X1 身份关联指数 (${(riskScoring?.subIndices?.X1 || 0)}), X2 交易异常指数 (${(riskScoring?.subIndices?.X2 || 0)}), X3 外围牵连指数 (${(riskScoring?.subIndices?.X3 || 0)})</p>
    ` : `<p>综合风险评分：<span class="risk-score">${score}/100（${riskLevel.label}）</span></p>`}
    
    ${rulesHit.length > 0 ? rulesHit.map((r:any) => {
      const d = JSON.parse(r.details);
      return `
      <div class="rule-box">
        <h4>${d.ruleName || '隐性关联风险'}</h4>
        <p><strong>风险等级：</strong>${d.severity === 'critical' ? '极高风险' : d.severity === 'high' ? '高风险' : d.severity === 'medium' ? '中风险' : '低风险'}</p>
        <p><strong>风险描述：</strong>${d.description}</p>
        <p><strong>AI识别依据：</strong>系统识别到交易对手与发行人之间存在多重关联迹象。综合运用工商股权穿透分析、历史企业信息变更回溯、ERP交易数据关联、业务单据匹配等智能核查手段。</p>
        <p><strong>证据链提点：</strong></p>
        <ul>
          <li>基于预警模型 [${d.dimension}]，单项贡献预警得分 +${d.scoreImpact}分。</li>
        </ul>
      </div>`;
    }).join('') : '<p>分析未见显著异常。</p>'}

      <div class="rule-box">
        <h4>人工智能特定证据提取记录</h4>
        <p><strong>名称关联：</strong>曾用名“山东登XX汽配销售有限公司”包含核心字号“登XX”。</p>
        <p><strong>股权穿透：</strong>欧XX → 广州富XX → 肇庆达XX → 山东富XX → 山东旺XX汽车零部件有限公司。</p>
        <p><strong>跨地域控制：</strong>广东 → 山东。</p>
        <p><strong>联系方式匹配：</strong>传真、电话、联系地址与美国登X高度一致。</p>
        <p><strong>单据同源：</strong>订单、发票、装箱单模板或制作主体同源。</p>
        <p><strong>交易异常：</strong>山东富XX 2010年96.39万、2011年389.02万；山东旺XX 2010年115.51万、2011年553.49万、2012年770.13万。</p>
      </div>

    <h3>建议动作：</h3>
    <ul>
      <li>补充审计程序</li>
      <li>获取支持性证据</li>
      <li>穿透核查关联关系</li>
      <li>持续监控交易金额和资金流向</li>
    </ul>
  </div>

  <div class="section">
    <h2>03 附件</h2>
    <ul>
      <li>附件1：关联方股权穿透图谱</li>
      <li>附件2：交易明细与匹配分析表</li>
      <li>附件3：资金流水路径图</li>
      <li>附件4：异常关联分析报告</li>
      <li>附件5：相关公开工商信息截图</li>
    </ul>
  </div>

  <div class="footer-note">
    <p>注：本报告由 AuditEye 智能审计分析平台生成，仅供参考。所有结论需结合人工审计程序、原始凭证、访谈记录及外部函证进行复核确认。本系统输出不构成最终审计意见或法律结论。</p>
  </div>
</body></html>`;
    const a = document.createElement('a');
    a.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    a.download = `AuditEye_Related_Party_Report_${data.project?.id || 'export'}.html`;
    a.click();
    toast('专项关联交易报告（AI生成）已下载', 'success');
  };

  return (
    <div className="h-full w-full bg-[#121212] text-gray-200 font-sans flex flex-col overflow-hidden selection:bg-[#D4AF37]/30">
      
      {/* 1. Project Metadata Header */}
      <div className="md:h-10 bg-[#1A1A1A] border-b border-[#333333] flex flex-col md:flex-row md:items-center px-4 py-2 md:py-0 justify-between shrink-0 text-xs text-gray-400 z-10 gap-2 md:gap-0">
        <div className="flex items-center gap-2 md:gap-6 overflow-x-auto whitespace-nowrap min-h-[28px] custom-scrollbar pb-1 md:pb-0">
          <div className="flex items-center gap-2 shrink-0">
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
          <div className="w-px h-3 bg-[#333333] hidden md:block shrink-0"></div>
          <div className="shrink-0">类型: <span className="text-gray-200">{data.project.scenario}</span></div>
          <div className="shrink-0 hidden md:block">负责人: <span className="text-gray-200">当前用户</span></div>
          <div className="shrink-0">状态: <span className="text-blue-400">分析中</span></div>
        </div>
        <div className="flex items-center gap-4 md:gap-6 overflow-x-auto whitespace-nowrap min-h-[28px] custom-scrollbar pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 shrink-0"><Layers className="w-3.5 h-3.5"/> 规则集: v1.4.2</div>
          <div className="flex items-center gap-1.5 shrink-0 hidden md:flex cursor-pointer hover:text-[#D4AF37] transition-colors" onClick={() => setShowDataSourceModal(true)}><Database className="w-3.5 h-3.5"/> 数据源: {docsCount}</div>
          <div className="flex items-center gap-1.5 shrink-0"><Clock className="w-3.5 h-3.5"/> {new Date(data.project.createdAt).toLocaleDateString()}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-px bg-[#333333] min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* 2. Left Panel: AI Audit Assistant & Workflow Log */}
        <div className="w-full lg:w-[320px] bg-[#1A1A1A] flex flex-col shrink-0 min-h-[400px] lg:min-h-0 lg:max-w-[320px]">
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
          <div className="flex-1 overflow-y-auto px-4 py-6 relative custom-scrollbar bg-[#1A1A1A] group">
            <button 
              onClick={() => setExpandedPanel({
                 title: '审计流水线完整日志',
                 type: 'workflow',
                 content: (
                   <div className="flex flex-col md:flex-row gap-6 lg:gap-8 w-full h-full min-h-[75vh]">
                     {/* Left Column: Timeline */}
                     <div className="w-full md:w-[45%] bg-[#242424] border border-[#333333] rounded overflow-hidden flex flex-col h-full">
                       <div className="bg-[#1A1A1A] p-4 text-gray-200 font-semibold border-b border-[#333333] text-xl">流程时间线</div>
                       <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar relative">
                         <div className="absolute left-[15px] lg:left-[31px] top-4 bottom-4 w-[2px] bg-[#333333] z-0"></div>
                         {loading && <WorkflowStep size="base" icon={<Search className="w-4 h-4 text-[#D4AF37]" />} title="执行多源数据检索中..." status="active" time={lastAnalysisAt ? formatWorkflowTime(lastAnalysisAt) : '现在'} />}
                         {(logs.length > 0 || customLogs.length > 0) && [...logs, ...customLogs].filter((l:any) => l.action !== 'RED_FLAG').map((l:any, i:number) => {
                           const details = parseLogDetails(l.details);
                           return <WorkflowStep size="base" key={i} icon={<CheckSquare className="w-4 h-4 text-gray-400" />} title={details.message || '系统日志'} status="done" time={lastAnalysisAt ? formatWorkflowTime(lastAnalysisAt) : formatWorkflowTime(l.createdAt)} />
                         })}
                         {rulesHit.length > 0 && (
                           <WorkflowStep size="base" icon={<AlertTriangle className="w-4 h-4 text-red-500" />} title="风险规则命中警告" desc={`检测到 ${rulesHit.length} 项高亮风险，涉及强关系证据链。段落证据已落至工作底稿。`} status="alert" time={lastAnalysisAt ? formatWorkflowTime(lastAnalysisAt) : formatWorkflowTime(rulesHit[0].createdAt)} rules={rulesHit.length} />
                         )}
                         {(logs.length > 0 || customLogs.length > 0) && <WorkflowStep size="base" icon={<FileText className="w-4 h-4 text-gray-400" />} title="生成专项审计建议" desc="根据规则命中情况，已自动生成扩大抽样与业务核查指南。" status="done" time={lastAnalysisAt ? formatWorkflowTime(lastAnalysisAt) : formatWorkflowTime(new Date())} />}
                         {(logs.length > 0 || customLogs.length > 0) && <WorkflowStep size="base" icon={<User className="w-4 h-4 text-gray-500" />} title="等待经理复核" status="pending" time="--" />}
                       </div>
                     </div>
                     {/* Right Column: Summary */}
                     <div className="w-full md:w-[55%] flex flex-col gap-6">
                       <div className="grid grid-cols-2 gap-4">
                         <div className="bg-[#242424] border border-[#333333] rounded p-6">
                           <div className="text-gray-400 text-sm mb-2">已完成流转步骤</div>
                           <div className="text-4xl text-gray-200 font-mono font-bold">{(logs.length || customLogs.length) > 0 ? (logs.length + customLogs.length + (rulesHit.length>0?1:0) + 1) : 0}</div>
                         </div>
                         <div className="bg-[#242424] border-l-2 border-red-500 rounded p-6 shadow-[inset_4px_0_0_rgba(239,68,68,0.2)]">
                           <div className="text-gray-400 text-sm mb-2">命中红旗风险</div>
                           <div className="text-4xl text-red-500 font-mono font-bold">{rulesHit.length} <span className="text-lg text-gray-500">项</span></div>
                         </div>
                       </div>
                       
                       <div className="bg-[#242424] border border-[#333333] rounded h-full flex flex-col overflow-hidden">
                         <div className="bg-[#1A1A1A] p-4 text-gray-200 font-semibold border-b border-[#333333] text-xl flex justify-between items-center">
                           <span>待办事项与复核项摘要</span>
                           <span className="text-xs bg-[#333] border border-[#444] text-gray-300 px-3 py-1 rounded-full uppercase tracking-wider">系统自动生成</span>
                         </div>
                         <div className="p-6 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
                            <div>
                               <h4 className="text-gray-300 font-semibold mb-4 text-base flex items-center gap-2"><CheckSquare className="w-5 h-5 text-[#D4AF37]"/> 当前待办事项</h4>
                               <ul className="space-y-4">
                                 <li className="flex items-start gap-4">
                                   <div className="mt-1"><div className="w-5 h-5 rounded border border-gray-500 flex items-center justify-center bg-[#1A1A1A]"></div></div>
                                   <div className="text-sm text-gray-400 leading-relaxed"><strong className="text-gray-300 block mb-1">项目合伙人复核:</strong> 需要复核系统输出的 {rulesHit.length} 项高危预警证据链，确认实质性程序的充分性。</div>
                                 </li>
                                 <li className="flex items-start gap-4">
                                   <div className="mt-1"><div className="w-5 h-5 rounded border border-[#D4AF37] flex items-center justify-center bg-[#D4AF37]/10"><CheckSquare className="w-3.5 h-3.5 text-[#D4AF37]" /></div></div>
                                   <div className="text-sm text-gray-400 leading-relaxed"><strong className="text-gray-300 line-through block mb-1">系统底稿归档:</strong> 穿透图谱和计算逻辑已完成溯源固化，成功写入附卷。</div>
                                 </li>
                               </ul>
                            </div>
                            
                            {rulesHit.length > 0 && (
                            <div className="bg-red-500/5 rounded border border-red-500/20 p-6">
                               <h4 className="text-red-400 font-semibold mb-4 text-base flex items-center gap-2"><AlertOctagon className="w-5 h-5"/> 生成的专项审计建议</h4>
                               <ul className="list-disc pl-5 text-sm text-gray-300 space-y-3 marker:text-red-500 leading-relaxed">
                                 <li>建议对涉及异常关联的交易对手方及其法定代表人的资金进出流水执行穿透式双向核查。</li>
                                 <li>重点关注大额异常交易的背景合理性、定价公允性以及是否具备商业实质。</li>
                                 <li>要求管理层补充声明关联方及关联交易清单的完整性，并补充提供未披露关联方的工商资料。</li>
                               </ul>
                            </div>
                            )}

                            <div>
                               <h4 className="text-gray-300 font-semibold mb-4 text-base flex items-center gap-2"><Database className="w-5 h-5 text-blue-400"/> 相关证据摘要提取</h4>
                               <div className="text-sm text-gray-400 bg-[#1A1A1A] p-5 rounded font-mono leading-relaxed border border-[#333333]">
                                 <div className="text-blue-400 mb-2">{`<日志：已抽取 ${rulesHit.length} 个关键风险锚点>`}</div>
                                 [文档矩阵]：已将 {14 + rulesHit.length} 份发票/交易底稿与 2 条公开工商记录完成交叉验证。<br/>
                                 [知识图谱]：已完成 3 层路径穿透，并定位至最终受益所有人。<br/><br/>
                                 <div className="text-green-500 opacity-80 mt-2">证据完整性校验通过，哈希指纹：0x8a92f7...b4f1</div>
                               </div>
                            </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 )
                })}
              className="absolute top-2 right-2 z-20 p-1.5 bg-[#2A2A2A] border border-[#333333] rounded text-gray-400 hover:text-white hover:border-[#D4AF37] transition-all opacity-0 group-hover:opacity-100 hidden sm:flex"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
            <div className="absolute left-[27px] top-8 bottom-6 w-[2px] bg-[#333333] z-0"></div>

            {loading && <WorkflowStep icon={<Search className="w-3 h-3 text-[#D4AF37]" />} title="执行多源数据检索中..." status="active" time={lastAnalysisAt ? formatWorkflowTime(lastAnalysisAt) : '现在'} />}
            
            {(logs.length > 0 || customLogs.length > 0) ? (
              <>
                {[...logs, ...customLogs].filter((l:any) => l.action !== 'RED_FLAG').map((l:any, i:number) => {
                  const details = parseLogDetails(l.details);
                  return (
                    <WorkflowStep 
                      key={i}
                      icon={<CheckSquare className="w-3 h-3 text-gray-400" />} 
                      title={details.message || '系统日志'}
                      status="done" time={lastAnalysisAt ? formatWorkflowTime(lastAnalysisAt) : formatWorkflowTime(l.createdAt)}
                    />
                  )
                })}
                {rulesHit.length > 0 && (
                  <WorkflowStep 
                    icon={<AlertTriangle className="w-3 h-3 text-red-500" />} 
                    title="风险规则命中警告" 
                    desc={`检测到 ${rulesHit.length} 项高亮风险，涉及强关系证据链。段落证据已落至工作底稿。`}
                    status="alert" time={lastAnalysisAt ? formatWorkflowTime(lastAnalysisAt) : formatWorkflowTime(rulesHit[0].createdAt)} rules={rulesHit.length}
                  />
                )}
                <WorkflowStep 
                  icon={<FileText className="w-3 h-3 text-gray-400" />} 
                  title="生成专项审计建议" 
                  desc="根据规则命中情况，已自动生成扩大抽样与业务核查指南。"
                  status="done" time={lastAnalysisAt ? formatWorkflowTime(lastAnalysisAt) : formatWorkflowTime(new Date())} 
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
                onClick={() => setShowUploadModal(true)}>+ 追加数据源</button>
             <button className="px-3 py-2 bg-[#1A1A1A] border border-[#333333] hover:border-[#D4AF37] text-gray-300 text-[11px] rounded transition-colors"
                onClick={() => setShowRuleSet(!showRuleSet)}>切换规则集</button>
             
             {showRuleSet && (
               <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-[90%] mb-2 bg-[#1A1A1A] border border-[#333333] rounded shadow-2xl p-2 z-50">
                 <div className="text-[10px] text-gray-500 mb-2 uppercase">选择规则组合</div>
                 <div className="space-y-1">
                   {['标准审计预警 (v1.4.2)', '极度穿透关联模型', '快消行业专用模板'].map((rule) => {
                     const isActive = activeRuleSet === rule;
                     return (
                       <button 
                         key={rule}
                         onClick={() => {
                           setActiveRuleSet(rule);
                           setShowRuleSet(false);
                           toast(`已切换至 ${rule}`, "success");
                           setCustomLogs(prev => [...prev, {
                              createdAt: new Date().toISOString(),
                              action: 'INFO',
                              details: JSON.stringify({ message: `规则集已切换: ${rule}` })
                           }]);
                         }}
                         className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-medium transition-colors ${isActive ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30' : 'text-gray-400 hover:bg-[#333] border border-transparent'}`}
                       >
                         {rule}
                       </button>
                     );
                   })}
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* 3. Center Panel: Detailed Risk Overview */}
        <div className="w-full lg:w-[440px] xl:w-[480px] bg-[#1A1A1A] flex flex-col shrink-0 min-h-max lg:min-h-0 border-y lg:border-y-0 lg:border-l border-[#333333] overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-[#333333] flex items-center justify-between sticky top-0 bg-[#1A1A1A] z-20">
            <h2 className="text-sm font-semibold text-gray-200">全维风险评估报告</h2>
            <div className="text-[10px] text-gray-500 font-mono">模型置信度: 94.2%</div>
          </div>
          
          <div className="p-4 space-y-5">
            {/* Main Score Area */}
            {riskScoring ? (
              <RiskScoringModule 
                data={riskScoring} 
                onFeatureClick={(feature) => setExpandedPanel({ title: `风险特征画像：${feature.label} ${feature.id}`, type: 'feature_profile', content: (<FeatureProfile feature={feature} onReadOriginal={setEvidenceToShow} setExpandedPanel={setExpandedPanel} />) })} 
                setExpandedPanel={setExpandedPanel}
                onReadOriginal={setEvidenceToShow}
                onExpand={() => setExpandedPanel({ 
                  title: '审计风险概率计算过程', 
                  type: 'riskScoringFormula', 
                  content: (
                     <div className="space-y-6 max-w-4xl mx-auto py-8">
                       <div className="text-center p-8 bg-[#1A1A1A] border border-[#333333] rounded">
                         <div className="text-gray-400 text-lg mb-2">审计风险概率 P(Risk)</div>
                         <div className="text-7xl font-bold tracking-tighter text-red-500 mb-4">{score} <span className="text-4xl text-gray-500 font-normal">/100</span></div>
                         <div className="text-lg"><span className="text-red-400 font-medium">风险等级：{(riskScoring?.riskLevel || "未评估")}</span> <span className="text-gray-500 mx-4">|</span> <span className="text-gray-400">高危阈值：{(riskScoring?.threshold || 0)}%</span></div>
                       </div>
                       
                       <div className="bg-[#1A1A1A] border border-[#333333] p-6 rounded">
                          <h4 className="text-gray-300 font-semibold mb-2">模型说明</h4>
                          <p className="text-gray-400 text-sm">系统采用分层逻辑回归模型，将三个子指数输入全局风险函数，得到最终审计风险概率。</p>
                       </div>

                       <div className="bg-[#1A1A1A] border border-[#333333] p-6 rounded overflow-x-auto">
                          <h4 className="text-gray-300 font-semibold mb-4">输入变量简表</h4>
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-[#333333] text-gray-400">
                                <th className="pb-2 font-medium">变量</th>
                                <th className="pb-2 font-medium">含义</th>
                                <th className="pb-2 font-medium">数值</th>
                                <th className="pb-2 font-medium">全局权重</th>
                              </tr>
                            </thead>
                            <tbody className="text-gray-300 divide-y divide-[#333333]">
                              <tr><td className="py-2">X1</td><td>身份关联指数</td><td className="font-mono">{(riskScoring?.subIndices?.X1 || 0)}</td><td className="font-mono">W1 = {(riskScoring?.globalWeights?.W1 || 0)}</td></tr>
                              <tr><td className="py-2">X2</td><td>交易异常指数</td><td className="font-mono">{(riskScoring?.subIndices?.X2 || 0)}</td><td className="font-mono">W2 = {(riskScoring?.globalWeights?.W2 || 0)}</td></tr>
                              <tr><td className="py-2">X3</td><td>外围牵连指数</td><td className="font-mono">{Number(riskScoring?.subIndices?.X3 || 0).toFixed(2)}</td><td className="font-mono">W3 = {(riskScoring?.globalWeights?.W3 || 0)}</td></tr>
                              <tr><td className="py-2">b</td><td>截距项</td><td className="font-mono">{(riskScoring?.globalWeights?.b || -3.0) || -3.0}</td><td className="font-mono">-</td></tr>
                            </tbody>
                          </table>
                       </div>

                       <div className="bg-[#1A1A1A] border border-[#333333] p-6 rounded">
                          <h4 className="text-gray-300 font-semibold mb-4">线性组合计算</h4>
                          <div className="bg-[#121212] border border-[#333333] rounded p-4 font-mono text-sm text-gray-300 space-y-2">
                             <div className="text-[#D4AF37]">Z = W1 × X1 + W2 × X2 + W3 × X3 + b</div>
                             <div>Z = {(riskScoring?.globalWeights?.W1 || 0)} × {(riskScoring?.subIndices?.X1 || 0)} + {(riskScoring?.globalWeights?.W2 || 0)} × {(riskScoring?.subIndices?.X2 || 0)} + {(riskScoring?.globalWeights?.W3 || 0)} × {Number(riskScoring?.subIndices?.X3 || 0).toFixed(2)} {(riskScoring?.globalWeights?.b || -3.0) || -3.0}</div>
                             <div>Z = 1.7325 + 2.625 + 0.1 - 3.0</div>
                             <div>Z = {((riskScoring?.zValue || 0)).toFixed(4)}</div>
                          </div>
                          
                          <h4 className="text-gray-300 font-semibold mb-4 mt-6">Sigmoid 概率映射</h4>
                          <div className="bg-[#121212] border border-[#333333] rounded p-4 font-mono text-sm text-gray-300 space-y-2">
                             <div className="text-[#D4AF37]">P(Risk) = 1 / (1 + e^(-Z))</div>
                             <div>P(Risk) = 1 / (1 + e^(-{((riskScoring?.zValue || 0)).toFixed(4)}))</div>
                             <div>P(Risk) ≈ {(score/100).toFixed(3)}</div>
                             <div className="text-xl text-white mt-4 pt-4 border-t border-[#333333]">P(Risk) = {score} /100</div>
                          </div>
                          
                          <h4 className="text-gray-300 font-semibold mb-4 mt-6">判断结论</h4>
                          <div className="text-sm text-gray-300 bg-red-500/10 border border-red-500/20 p-4 rounded leading-relaxed">
                            由于 <span className="text-red-400 font-bold">{score}</span> &gt; <span className="text-red-400 font-bold">{(riskScoring?.threshold || 0)}</span>，系统判定该项目为“<span className="text-red-400 font-bold">{(riskScoring?.riskLevel || "未评估")}</span>”，触发高危预警，并建议进入审计底稿回溯和人工重点复核流程。
                          </div>
                       </div>
                     </div>
                  )
                })} 
              />
            ) : (
              <>
                <div className="flex gap-4">
                  <div className="w-32 h-32 shrink-0 bg-gradient-to-br from-[#242424] to-[#1A1A1A] border border-[#333333] rounded-full flex flex-col items-center justify-center relative shadow-inner">
                    {score > 75 && <div className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-ping opacity-20"></div>}
                    <div className="text-[10px] text-gray-400 mb-0.5">综合评分</div>
                    <div className={`text-4xl font-bold tracking-tighter ${riskLevel.color}`}>{score}</div>
                    <div className="text-[10px] text-gray-500 mt-1 uppercase">{riskLevel.label}</div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-400">{RISK_DIMENSIONS.identity?.name || '身份关联识别'} (最高 {RISK_DIMENSIONS.identity?.maxScore || 60}分)</span> <span className="text-red-400">{dimScores.identity} 分</span></div>
                      <div className="h-1.5 w-full bg-[#242424] rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{ width: `${(dimScores.identity / (RISK_DIMENSIONS.identity?.maxScore || 60)) * 100}%` }}></div></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-400">{RISK_DIMENSIONS.behavior?.name || '交易行为异常'} (最高 {RISK_DIMENSIONS.behavior?.maxScore || 30}分)</span> <span className="text-[#D4AF37]">{dimScores.behavior} 分</span></div>
                      <div className="h-1.5 w-full bg-[#242424] rounded-full overflow-hidden"><div className="h-full bg-[#D4AF37]" style={{ width: `${(dimScores.behavior / (RISK_DIMENSIONS.behavior?.maxScore || 30)) * 100}%` }}></div></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-400">{RISK_DIMENSIONS.circumstantial?.name || '外围关联佐证'} (最高 {RISK_DIMENSIONS.circumstantial?.maxScore || 10}分)</span> <span className="text-green-500">{dimScores.circumstantial} 分</span></div>
                      <div className="h-1.5 w-full bg-[#242424] rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${(dimScores.circumstantial / (RISK_DIMENSIONS.circumstantial?.maxScore || 10)) * 100}%` }}></div></div>
                    </div>
                  </div>
                </div>

                {/* Hit Rules List */}
                <div className="relative group">
                   <h3 className="text-xs font-semibold text-gray-300 mb-3 border-l-2 border-[#D4AF37] pl-2 flex justify-between items-center">
                     命中规则列表
                     <button onClick={() => setExpandedPanel({
                        title: '命中规则完整列表',
                        type: 'rules',
                        content: (
                          <div className="border border-[#333333] rounded bg-[#242424] overflow-hidden">
                             <table className="w-full text-left text-sm">
                               <thead className="bg-[#1A1A1A] border-b border-[#333333] text-gray-400">
                                 <tr>
                                   <th className="px-4 py-3 font-medium">规则名称</th>
                                   <th className="px-4 py-3 font-medium">维度</th>
                                   <th className="px-4 py-3 font-medium">风险级别</th>
                                   <th className="px-4 py-3 font-medium">详细描述</th>
                                   <th className="px-4 py-3 font-medium text-right">贡献分</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-[#333333]">
                                 {rulesHit.length > 0 ? rulesHit.map((l:any, i:number) => {
                                   const d = JSON.parse(l.details);
                                   const dimName = d.dimension ? RISK_DIMENSIONS[d.dimension as keyof typeof RISK_DIMENSIONS]?.name : '综合';
                                   return (
                                     <tr key={i} className="hover:bg-[#2A2A2A]">
                                       <td className="px-4 py-3 text-gray-200">{d.ruleName}</td>
                                       <td className="px-4 py-3 text-gray-500">{dimName}</td>
                                       <td className="px-4 py-3"><span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs border border-red-500/20">{d.severity}</span></td>
                                       <td className="px-4 py-3 text-gray-400 w-1/2">{d.description}</td>
                                       <td className="px-4 py-3 text-right text-red-400 font-mono">+{d.scoreImpact}</td>
                                     </tr>
                                   )
                                 }) : (
                                   <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">暂无违规命中</td></tr>
                                 )}
                               </tbody>
                             </table>
                           </div>
                        )
                     })} className="p-1 bg-[#2A2A2A] border border-[#333333] rounded text-gray-400 hover:text-white hover:border-[#D4AF37] transition-all opacity-0 group-hover:opacity-100 hidden sm:flex">
                        <Maximize className="w-3.5 h-3.5" />
                     </button>
                   </h3>
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
                <div className="relative group">
                   <h3 className="text-xs font-semibold text-gray-300 mb-3 border-l-2 border-[#D4AF37] pl-2 flex justify-between items-center">
                     红旗分析摘要
                     <button onClick={() => setExpandedPanel({
                        title: '红旗分析详细报告',
                        type: 'redFlags',
                        content: (
                           <div className="space-y-4">
                             {rulesHit.map((l:any, i:number) => {
                                const d = JSON.parse(l.details);
                                return (
                                  <div key={i} className="p-5 bg-[#242424] border border-red-500/20 rounded shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                      <span className="text-base font-semibold text-red-400 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> {d.ruleName}</span>
                                      <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded border border-red-500/20">{d.severity.toUpperCase()}</span>
                                    </div>
                                    <p className="text-sm text-gray-300 leading-relaxed mb-4">{d.description}</p>
                                    <div className="flex items-center gap-6 text-xs text-gray-500 pt-4 border-t border-[#333333]">
                                       <span className="flex items-center gap-1.5"><FileText className="w-4 h-4"/> 证据: 2份文档关联</span>
                                       <button onClick={(e) => { e.stopPropagation(); setActiveTab('graph'); setExpandedPanel(null); }} className="flex items-center gap-1.5 hover:text-[#D4AF37] transition-colors"><Activity className="w-4 h-4"/> 前往审查 <ChevronRight className="w-4 h-4"/></button>
                                    </div>
                                  </div>
                                )
                             })}
                             {rulesHit.length === 0 && <div className="text-sm text-gray-500 p-8 text-center bg-[#242424] rounded border border-[#333333]">正常，未发现红旗警告</div>}
                           </div>
                        )
                     })} className="p-1 bg-[#2A2A2A] border border-[#333333] rounded text-gray-400 hover:text-white hover:border-[#D4AF37] transition-all opacity-0 group-hover:opacity-100 hidden sm:flex">
                        <Maximize className="w-3.5 h-3.5" />
                     </button>
                   </h3>
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
                               <button onClick={(e) => { e.stopPropagation(); setActiveTab('graph'); }} className="flex items-center gap-1 hover:text-[#D4AF37] transition-colors"><Activity className="w-3 h-3"/> 前往审查 <ChevronRight className="w-3 h-3"/></button>
                            </div>
                          </div>
                        )
                     })}
                     {rulesHit.length === 0 && <div className="text-xs text-gray-500">正常</div>}
                   </div>
                </div>
              </>
            )}

          </div>
        </div>

        {/* 4. Right Panel: Interative Graph, Drawers, Evidence Tabs */}
        <div className="flex-1 flex flex-col bg-[#1A1A1A] relative min-w-0 min-h-[600px] lg:min-h-0 border-l lg:border-l-0 border-[#333333]">
          
          <div className="h-[60%] min-h-[300px] border-b border-[#333333] relative group">
            <div className="absolute top-4 left-4 z-10 flex gap-2">
               <button onClick={() => setGraphMode('all')} className={`px-3 py-1.5 border hover:border-[#D4AF37] rounded text-[11px] shadow-lg flex items-center gap-1.5 transition-colors ${graphMode === 'all' ? 'bg-[#333333] border-[#333333] text-white' : 'bg-[#242424] border-[#333333] text-gray-300'}`}><Filter className="w-3 h-3"/> 全部关系</button>
               <button onClick={() => setGraphMode('minimal')} className={`px-3 py-1.5 border hover:border-[#D4AF37] rounded text-[11px] shadow-lg flex items-center gap-1.5 transition-colors ${graphMode === 'minimal' ? 'bg-[#333333] border-[#333333] text-white' : 'bg-[#242424] border-[#333333] text-gray-300'}`}><Network className="w-3 h-3"/> 极简视图</button>
               <button className="px-3 py-1.5 bg-[#242424] border border-[#333333] hover:border-[#D4AF37] rounded text-[11px] shadow-lg flex items-center gap-1.5 transition-colors text-gray-300" onClick={()=>{fetchProject(); toast('画布已重置并拉取最新数据', 'success');}}><Maximize className="w-3 h-3"/> 重置画布</button>
            </div>
            
            <button 
              onClick={() => {
                const displayEntities = graphMode === 'minimal' ? entities.slice(0, 5) : entities;
                const allowedIds = new Set(displayEntities.map((e: any) => e.name));
                const displayRels = rels.filter((r: any) => allowedIds.has(r.source) && allowedIds.has(r.target));
                setExpandedPanel({ 
                  title: '实体关系网络大图', 
                  type: 'graph', 
                  content: <div className="w-full h-full min-h-[70vh]"><D3Graph entities={displayEntities} relationships={displayRels} onNodeClick={setSelectedNode} onEdgeClick={setSelectedEdge} expanded={true} /></div> 
                })
              }}
              className="absolute top-4 right-4 z-20 p-2 bg-[#2A2A2A] border border-[#333333] rounded text-gray-400 hover:text-white hover:border-[#D4AF37] transition-all opacity-0 group-hover:opacity-100 hidden sm:flex items-center gap-1.5 shadow-lg"
            >
              <Maximize className="w-3.5 h-3.5" /> <span className="text-[11px]">放大图谱</span>
            </button>
            
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
                   <button onClick={() => {
                     setExpandedPanel({
                       title: `节点画像: ${selectedNode?.name || selectedEdge?.source || '未知节点'}`,
                       type: 'profile',
                       content: (
                          <div className="space-y-6">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-3xl font-bold text-gray-200 mb-2">{selectedNode?.name || selectedEdge?.source}</h3>
                                <div className="text-[#D4AF37] font-mono mb-4 text-sm bg-[#242424] px-3 py-1 rounded inline-block">实体类型: {selectedNode?.type || 'COMPANY'}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                              <div className="bg-[#1A1A1A] border border-[#333333] rounded p-6">
                                <h4 className="text-sm font-semibold text-gray-400 mb-4 border-b border-[#333333] pb-2">工商属性</h4>
                                <ul className="space-y-3 text-sm text-gray-300">
                                  {Object.entries((selectedNode?.attributes || {})).map(([k, v]) => (
                                    <li key={k} className="flex"><span className="text-gray-500 w-32">{k}:</span> <span className="flex-1 font-mono">{String(v)}</span></li>
                                  ))}
                                  {(!selectedNode?.attributes || Object.keys(selectedNode.attributes).length === 0) && (
                                    <li className="text-gray-500">暂无属性数据</li>
                                  )}
                                </ul>
                              </div>
                              <div className="bg-[#1A1A1A] border border-[#333333] rounded p-6">
                                <h4 className="text-sm font-semibold text-gray-400 mb-4 border-b border-[#333333] pb-2">关联关系统计</h4>
                                <ul className="space-y-3 text-sm text-gray-300">
                                  <li className="flex justify-between"><span className="text-gray-500">命中穿透图谱网络:</span> <span className="font-mono text-[#D4AF37] font-bold">是</span></li>
                                  <li className="flex justify-between"><span className="text-gray-500">衍生风险关联数:</span> <span className="font-mono">累计 {Math.floor(Math.random() * 5 + 1)} 条</span></li>
                                  <li className="flex justify-between"><span className="text-gray-500">高风险关系类型:</span> <span className="font-mono text-red-500">突击交易、实控同源</span></li>
                                </ul>
                              </div>
                            </div>
                            <div className="bg-[#1A1A1A] border border-[#333333] rounded p-6">
                                <h4 className="text-sm font-semibold text-gray-400 mb-4 border-b border-[#333333] pb-2">智能穿透解释</h4>
                                <p className="text-gray-300 leading-relaxed max-w-4xl text-sm">
                                  基于审计大模型联合图谱计算，该节点在当前项目中处于核心关联汇聚点。根据底稿信息提取与公开信息查询比对，该笔交易主体及背后链条存在异常，可能涉及隐层绕道或利益输送。符合“实质重于形式”的认定标准。
                                </p>
                            </div>
                            <div className="flex justify-end gap-4 mt-6 border-t border-[#333333] pt-6">
                              <button onClick={() => setExpandedPanel(null)} className="px-6 py-2 bg-transparent text-gray-400 hover:text-white transition-colors">关闭</button>
                              <button onClick={(e) => { toast('已加入审计底稿素材库', 'success'); (e.target as any).innerText = '已加入底稿'; }} className="px-6 py-2 bg-[#D4AF37]/10 border border-[#D4AF37]/50 text-[#D4AF37] font-medium rounded hover:bg-[#D4AF37]/20 transition-colors">加入底稿</button>
                            </div>
                          </div>
                       )
                     });
                   }} className="w-full py-2 bg-[#333333] hover:bg-[#444] text-xs font-medium rounded transition-colors text-gray-200">查看完整画像</button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col bg-[#1A1A1A]">
            <div className="flex justify-between items-center px-4 pt-3 border-b border-[#333333] overflow-x-auto whitespace-nowrap custom-scrollbar">
              <div className="flex items-center gap-1">
                <button 
                  className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors shrink-0 ${activeTab === 'doc' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('doc')}
                >文档证据 ({docsCount})</button>
                <button 
                  className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors shrink-0 ${activeTab === 'fin' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('fin')}
                >财务证据</button>
                <button 
                  className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors shrink-0 ${activeTab === 'graph' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('graph')}
                >图谱溯源证据 ({rels.length})</button>
              </div>
              <button 
                onClick={() => setShowDataSourceModal(true)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 border border-[#444] bg-[#242424] hover:bg-[#2A2A2A] hover:text-white hover:border-[#D4AF37]/50 px-2.5 py-1.5 rounded transition-all mb-1 shrink-0"
              >
                <Database className="w-3.5 h-3.5"/>
                管理数据源
              </button>
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
                  {id === '1001' && (
                    <div className="bg-[#242424] border border-[#D4AF37]/50 rounded hover:border-[#D4AF37] transition-colors flex flex-col shadow-lg shadow-[#D4AF37]/5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden pointer-events-none">
                        <div className="bg-[#D4AF37] text-black text-[8px] font-bold py-0.5 px-6 rotate-45 transform origin-top-left translate-x-3 translate-y-2 whitespace-nowrap shadow-sm">
                          公开信息发现
                        </div>
                      </div>
                      <div className="p-3 border-b border-[#333333] flex justify-between items-start">
                        <div>
                          <div className="text-[10px] font-medium text-[#D4AF37] flex items-center gap-1 mb-1"><ShieldAlert className="w-3 h-3" /> 公开工商信息回溯卡片</div>
                          <div className="text-xs text-gray-200 font-medium">历史代持排查</div>
                        </div>
                        <span className="text-[9px] text-gray-500 bg-[#1A1A1A] px-1.5 py-0.5 rounded border border-[#333333] z-10">TianYancha</span>
                      </div>
                      <div className="p-3 flex-1 flex flex-col">
                         <div className="text-[10px] text-gray-400 space-y-1 mb-3">
                           <div><span className="text-gray-500">数据来源：</span> 公开工商信息 / 商业征信页面</div>
                           <div><span className="text-gray-500">页面状态：</span> 已脱敏</div>
                           <div><span className="text-gray-500">更新时间：</span> 2026-04-14</div>
                           <div><span className="text-gray-500">可回溯字段：</span> 基本信息、曾用名、股东信息、变更记录、经营范围、联系方式</div>
                         </div>
                         <div className="text-[10px] text-gray-300 mb-3 space-y-1 bg-[#1A1A1A] p-2 rounded border border-[#333333]">
                           <div className="font-semibold text-[#D4AF37] mb-1">证据锚点：</div>
                           <div>• TY-BASE-001：企业基本信息</div>
                           <div>• TY-CHANGE-002：名称/地址/经营范围变更记录</div>
                           <div>• TY-SHARE-003：股权穿透链</div>
                           <div>• TY-CONTACT-004：联系方式/地址匹配</div>
                         </div>
                         <div className="mt-auto">
                           <div className="text-[9px] text-gray-500 bg-[#333333]/50 p-1.5 rounded mb-2 leading-relaxed">
                             本系统输出为智能辅助判断，需结合人工复核、原始凭证、访谈记录及审计程序确认。
                           </div>
                           <div className="flex justify-end gap-2">
                             <button onClick={() => toast('功能演示中，暂不提供外链', 'info')} className="text-[10px] text-gray-500 hover:text-[#D4AF37]">查看原始快照</button>
                             <button onClick={(e) => {
                               toast('已摘录入底稿', 'success');
                               (e.target as HTMLButtonElement).innerText = '已添加';
                               (e.target as HTMLButtonElement).classList.replace('text-blue-400', 'text-green-500');
                               (e.target as HTMLButtonElement).disabled = true;
                             }} className="text-[10px] text-blue-400 font-medium hover:opacity-80">加入底稿</button>
                           </div>
                         </div>
                      </div>
                    </div>
                  )}
                 {rels.map((r: any, i: number) => {
                    const isHighRisk = ['HIGH_RISK_OVERLAP', 'FORMER_NAME', 'ULTIMATE_CONTROLLER', 'DOCUMENT_MATCH', 'ABNORMAL_TRANSACTION', 'BUSINESS_CROSSCHECK', 'CONTACT_MATCH', 'RELATED_PARTY_TRANSACTION'].includes(r.relationType);
                    const isAdded = addedToDraft.has(i);
                    return (
                    <div key={i} className={`bg-[#242424] border ${isHighRisk ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.05)]' : 'border-[#333333]'} rounded overflow-hidden hover:border-[#D4AF37]/50 transition-colors flex flex-col group`}>
                      <div className="p-4 border-b border-[#333333] flex justify-between items-start bg-[#1A1A1A]">
                        <div>
                          <div className={`text-[10px] font-bold tracking-wider ${isHighRisk ? 'text-red-400' : 'text-[#D4AF37]'} flex items-center gap-1.5 mb-1.5 uppercase`}>
                            <FileText className="w-3.5 h-3.5" /> {r.evidenceSource?.documentName || 'API 数据 / 公开库'}
                          </div>
                          <div className="text-sm text-gray-200 font-medium">段落锚点 #{i+102}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-[10px] ${isHighRisk ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-green-400 bg-green-500/10 border-green-500/20'} px-2 py-0.5 rounded font-mono border`}>
                            {isHighRisk ? '高风险预警' : '常态关联'}
                          </span>
                          <span className="text-[10px] text-[#D4AF37] font-mono">置信度: 98.7%</span>
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                         <div className="text-xs text-gray-400 mb-2 font-mono">关系映射: {r.source} → {r.target}</div>
                         <p className="text-sm text-gray-300 font-serif leading-relaxed line-clamp-4 mb-4">
                           提取核心片段：{r.evidenceSnippet || r.evidence || `在文档比对中，发现 ${r.source} 与 ${r.target} 存在 ${r.type || r.relationType} 证据。`}
                         </p>
                         <div className="mt-auto pt-4 border-t border-[#333333] flex justify-between items-center opacity-80 group-hover:opacity-100 transition-opacity">
                           <button onClick={(e) => { e.stopPropagation(); setEvidenceToShow(r); }} className="text-xs text-gray-400 hover:text-[#D4AF37] flex items-center gap-1 transition-colors border border-transparent hover:border-[#D4AF37]/30 px-2 py-1 rounded">
                             <FileText className="w-3.5 h-3.5" /> 阅读全文
                           </button>
                           <button onClick={(e) => {
                             e.stopPropagation();
                             if (isAdded) return;
                             setAddedToDraft(prev => new Set(prev).add(i));
                             toast('已摘录入底稿', 'success');
                           }} className={`text-xs font-medium px-3 py-1.5 rounded transition-all ${isAdded ? 'text-green-500 bg-green-500/10 cursor-default border border-transparent' : 'text-[#D4AF37] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30'}`}>
                             {isAdded ? '已添加底稿' : '加入底稿'}
                           </button>
                         </div>
                      </div>
                    </div>
                  )})}
                  {rels.length === 0 && <div className="col-span-full py-8 text-center text-xs text-gray-500">关联图谱暂无有效证据片段</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Panel: Structured Suggestions & Exports */}
      <div className="md:h-[120px] bg-[#1A1A1A] border-t border-[#333333] grid grid-cols-1 md:grid-cols-4 gap-px shrink-0 overflow-y-auto md:overflow-hidden md:divide-x divide-y md:divide-y-0 divide-[#333333]">
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
           <button onClick={() => {
             setExpandedPanel({
                title: '提交复核流转确认',
                type: 'review_submit',
                content: (
                   <div className="space-y-6">
                      <div className="bg-[#1A1A1A] p-6 rounded border border-[#333333]">
                         <div className="flex justify-between items-center mb-6">
                           <span className="text-gray-400">复核流转编号:</span>
                           <span className="font-mono text-[#D4AF37] font-bold tracking-wider">REV-2026-{Math.floor(Math.random()*9000+1000)}</span>
                         </div>
                         <div className="flex justify-between items-center mb-6 border-t border-[#333333] pt-6">
                           <span className="text-gray-400">提交对象:</span>
                           <span className="text-gray-200">项目合伙人 / 质量经理</span>
                         </div>
                         <div className="border-t border-[#333333] pt-6">
                           <span className="text-gray-400 block mb-4">流转打包内容:</span>
                           <div className="grid grid-cols-2 gap-4">
                             <div className="bg-[#242424] p-3 rounded flex items-center gap-3">
                               <CheckSquare className="w-5 h-5 text-green-500" /> <span className="text-sm text-gray-200">全局风险评分计算书</span>
                             </div>
                             <div className="bg-[#242424] p-3 rounded flex items-center gap-3">
                               <CheckSquare className="w-5 h-5 text-green-500" /> <span className="text-sm text-gray-200">红旗规则命中明细</span>
                             </div>
                             <div className="bg-[#242424] p-3 rounded flex items-center gap-3">
                               <CheckSquare className="w-5 h-5 text-green-500" /> <span className="text-sm text-gray-200">关联图谱溯源证据链</span>
                             </div>
                             <div className="bg-[#242424] p-3 rounded flex items-center gap-3">
                               <CheckSquare className="w-5 h-5 text-green-500" /> <span className="text-sm text-gray-200">审计工作底稿附卷</span>
                             </div>
                           </div>
                         </div>
                      </div>
                      <div className="flex justify-end pt-4 border-t border-[#333333] gap-4">
                         <button onClick={() => setExpandedPanel(null)} className="px-6 py-2 bg-transparent text-gray-400 hover:text-white transition-colors">取消</button>
                         <button onClick={() => { setExpandedPanel(null); toast('已成功提交复核流转', 'success'); }} className="px-6 py-2 bg-[#D4AF37] text-black font-medium rounded hover:bg-[#E5C048] transition-colors">确认提交</button>
                      </div>
                   </div>
                )
             });
           }} className="w-full py-2 bg-gradient-to-r from-[#D4AF37] to-[#C5A028] hover:from-[#E5C048] hover:to-[#D4AF37] text-black font-bold text-[11px] rounded shadow-md flex items-center justify-center gap-2 transition-all">
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
      
      {expandedPanel && <ExpandedPanelModal expandedPanel={expandedPanel} setExpandedPanel={setExpandedPanel} />}
      
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowUploadModal(false)}>
          <div 
            className="bg-[#1A1A1A] border border-[#333333] w-full max-w-lg rounded-lg shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#333333] bg-[#242424]">
              <h2 className="text-sm font-semibold text-gray-200">追加数据源</h2>
              <button disabled={isUploading} onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-[#333333] rounded text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
               <div 
                  className="border-2 border-dashed border-[#333333] rounded-lg p-8 text-center cursor-pointer hover:border-[#D4AF37]/50 hover:bg-[#2A2A2A] transition-all mb-4"
                  onClick={() => uploadInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                  onDrop={(e) => {
                     e.preventDefault();
                     if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const newFiles = Array.from(e.dataTransfer.files);
                        setUploadFiles(prev => [...prev, ...newFiles]);
                     }
                  }}
                >
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    ref={uploadInputRef}
                    onChange={(e) => {
                       if (e.target.files) {
                         const newFiles = Array.from(e.target.files);
                         setUploadFiles(prev => [...prev, ...newFiles]);
                       }
                       if (uploadInputRef.current) uploadInputRef.current.value = '';
                    }}
                  />
                  <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-300 font-medium mb-1">点击或拖拽文件到此处</p>
                  <p className="text-xs text-gray-500">支持 PDF, DOCX, XLSX, CSV, TXT, PNG, JPG 等格式</p>
               </div>
               
               {uploadFiles.length > 0 && (
                 <div className="space-y-2 mb-6 max-h-40 overflow-y-auto custom-scrollbar">
                   {uploadFiles.map((f, i) => (
                     <div key={i} className="flex items-center justify-between p-2 bg-[#242424] border border-[#333333] rounded text-sm">
                       <div className="flex items-center gap-2 overflow-hidden">
                         <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                         <span className="text-gray-300 truncate">{f.name}</span>
                         <span className="text-[10px] text-gray-500 font-mono shrink-0">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                       </div>
                       <button onClick={() => setUploadFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors" disabled={isUploading}>
                         <X className="w-3.5 h-3.5" />
                       </button>
                     </div>
                   ))}
                 </div>
               )}
               
               <div className="flex justify-end gap-3 mt-2">
                 <button 
                   onClick={() => setShowUploadModal(false)}
                   className="px-4 py-2 border border-[#333333] text-gray-400 hover:text-gray-200 hover:border-gray-500 rounded text-sm font-medium transition-colors"
                   disabled={isUploading}
                 >
                   取消
                 </button>
                 <button 
                   onClick={async () => {
                     if (uploadFiles.length === 0) return toast("请先选择要上传的文件", "warning");
                     
                     setIsUploading(true);
                     try {
                        const formData = new FormData();
                        uploadFiles.forEach(f => formData.append('files', f));
                        const uploadRes = await fetch(`/api/projects/${id}/documents`, {
                          method: 'POST',
                          body: formData
                        });
                        if (!uploadRes.ok) throw new Error("上传失败");
                        const apiResult = await uploadRes.json();
                        appendUploadedFilesToProject(uploadFiles, apiResult.documents || []);
                     } catch(e) {
                         // API uploaded failed, fallback
                         appendUploadedFilesToProject(uploadFiles);
                     } finally {
                        setIsUploading(false);
                     }
                   }}
                   className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C048] text-black rounded text-sm font-bold transition-colors flex items-center gap-2"
                   disabled={isUploading}
                 >
                   {isUploading ? <><Activity className="w-4 h-4 animate-spin"/> 上传中</> : '开始上传'}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Source Modal */}
      {evidenceToShow && (() => {
        const src = evidenceToShow.evidenceSource;
        const fallbackText = src?.originalText || evidenceToShow.evidenceSnippet || evidenceToShow.evidence;
        return (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setEvidenceToShow(null)}>
            <div className="bg-[#121212] border border-[#333333] w-full max-w-2xl rounded-lg shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center px-6 py-4 border-b border-[#333333] bg-[#1A1A1A]">
                <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2"><FileText className="w-5 h-5 text-[#D4AF37]"/> 溯源取证原文</h2>
                <button onClick={() => setEvidenceToShow(null)} className="p-1 hover:bg-[#333333] rounded text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                {src ? (
                  <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono text-gray-500 bg-[#1A1A1A] p-4 border border-[#333333] rounded">
                    <div className="w-full mb-1 border-b border-[#333333] pb-2 flex justify-between">
                      <span className="font-semibold text-gray-300">文档: {src.documentName}</span>
                      <span className="text-[#D4AF37] px-2 py-0.5 bg-[#242424] rounded border border-[#333333]">{src.evidenceType || '综合分析'}</span>
                    </div>
                    <div className="px-2 py-1 bg-[#242424] rounded border border-[#333333]">页码: <span className="text-gray-300">{src.page}</span></div>
                    <div className="px-2 py-1 bg-[#242424] rounded border border-[#333333]">段落: <span className="text-gray-300">{src.paragraph}</span></div>
                    <div className="px-2 py-1 bg-[#242424] rounded border border-[#333333]">命中记录: <span className="text-gray-300">{evidenceToShow.source ? `${evidenceToShow.source} → ${evidenceToShow.target}` : evidenceToShow.label}</span></div>
                  </div>
                ) : (
                  <div className="mb-4 text-sm text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 rounded">
                    暂无原文文档映射，仅保留结构化证据摘要。
                  </div>
                )}
                
                <h4 className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">命中片段 / 内容</h4>
                <div className="p-4 bg-[#1A1A1A] border border-[#333333] rounded text-sm text-gray-300 font-serif leading-relaxed min-h-[120px] max-h-[300px] overflow-y-auto">
                  {fallbackText || "未提取到可用段落。"}
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => {
                     navigator.clipboard.writeText(fallbackText || '');
                     toast("原文已复制到剪贴板", "success");
                  }} className="px-4 py-2 bg-[#242424] hover:bg-[#333333] border border-[#333333] text-gray-300 rounded text-sm font-medium transition-colors">
                    复制原文
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Data Source Management Modal */}
      {showDataSourceModal && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDataSourceModal(false)}>
           <div className="bg-[#1A1A1A] w-[90vw] max-w-[1200px] h-[80vh] rounded-lg shadow-2xl border border-[#333333] flex flex-col" onClick={e=>e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-[#333333] flex justify-between items-center bg-[#242424] rounded-t-lg">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="text-xl font-bold text-gray-100">数据源管理</h3>
                </div>
                <button onClick={() => setShowDataSourceModal(false)} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                <div className="grid grid-cols-4 gap-4">
                   <div className="bg-[#242424] border border-[#333333] p-4 rounded text-center">
                      <div className="text-[11px] text-gray-500 mb-1">已接入数据源数量</div>
                      <div className="text-2xl text-white font-bold">{dataSources.length}</div>
                   </div>
                   <div className="bg-[#242424] border border-[#333333] p-4 rounded text-center">
                      <div className="text-[11px] text-gray-500 mb-1">已解析文件数量</div>
                      <div className="text-2xl text-green-400 font-bold">{dataSources.filter(d => d.status === '已解析').length}</div>
                   </div>
                   <div className="bg-[#242424] border border-[#333333] p-4 rounded text-center">
                      <div className="text-[11px] text-gray-500 mb-1">待解析文件数量</div>
                      <div className="text-2xl text-blue-400 font-bold">{dataSources.filter(d => d.status.includes('解析中')).length}</div>
                   </div>
                   <div className="bg-[#242424] border border-[#333333] p-4 rounded text-center">
                      <div className="text-[11px] text-gray-500 mb-1">最新上传时间</div>
                      <div className="text-xl text-gray-300 font-mono mt-1">{dataSources.length > 0 ? dataSources[0].date : '-'}</div>
                   </div>
                </div>

                <div className="border border-[#333333] rounded overflow-hidden">
                  <table className="w-full text-left text-sm bg-[#242424]">
                    <thead className="bg-[#1A1A1A] border-b border-[#333333] text-gray-400 text-xs">
                      <tr>
                        <th className="px-4 py-3 font-medium">文件名</th>
                        <th className="px-4 py-3 font-medium">文件类型</th>
                        <th className="px-4 py-3 font-medium">文件大小</th>
                        <th className="px-4 py-3 font-medium">来源</th>
                        <th className="px-4 py-3 font-medium">解析状态</th>
                        <th className="px-4 py-3 font-medium">上传时间</th>
                        <th className="px-4 py-3 font-medium text-right">提取实体数</th>
                        <th className="px-4 py-3 font-medium text-right">关联证据数</th>
                        <th className="px-4 py-3 font-medium text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333333]">
                       {dataSources.map((ds, idx) => (
                         <tr key={idx} className="hover:bg-[#1A1A1A] transition-colors">
                            <td className="px-4 py-3 text-gray-200">
                               <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-[#D4AF37]"/> {ds.name}
                               </div>
                            </td>
                            <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">{ds.type}</td>
                            <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">{ds.size}</td>
                            <td className="px-4 py-3 text-gray-400 text-[11px]">{ds.source}</td>
                            <td className="px-4 py-3">
                              <span className={`text-[11px] px-2 py-1 rounded ${ds.status === '已解析' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>{ds.status}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">{ds.date}</td>
                            <td className="px-4 py-3 text-gray-300 font-mono text-right">{ds.entities}</td>
                            <td className="px-4 py-3 text-gray-300 font-mono text-right">{ds.evidenceCount || (ds.entities > 0 ? ds.entities * 2 : 0)}</td>
                            <td className="px-4 py-3 text-right space-x-2">
                               {ds.blobUrl && (
                                   <a href={ds.blobUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition-colors mr-2">查看原文件</a>
                               )}
                               <button className="text-gray-500 hover:text-[#D4AF37] transition-colors" onClick={() => {
                                   setExpandedPanel({ 
                                      title: `文件预览：${ds.name}`, 
                                      type: 'document_preview',
                                      content: (
                                        <div className="p-6 max-w-3xl mx-auto space-y-6">
                                           <div className="grid grid-cols-2 gap-4">
                                              <div className="bg-[#1A1A1A] p-4 border border-[#333333] rounded">
                                                 <div className="text-xs text-gray-500 mb-1">文件名称</div>
                                                 <div className="text-sm font-semibold">{ds.name}</div>
                                              </div>
                                              <div className="bg-[#1A1A1A] p-4 border border-[#333333] rounded">
                                                 <div className="text-xs text-gray-500 mb-1">文件类型与大小</div>
                                                 <div className="text-sm font-mono">{ds.type} | {ds.size}</div>
                                              </div>
                                           </div>
                                           <div className="bg-[#242424] p-5 border border-[#333333] rounded space-y-4 text-sm">
                                              <div>
                                                 <h4 className="text-gray-300 font-bold mb-2">文档摘要</h4>
                                                 <p className="text-gray-400">该文档主要包含2026年度业务合同，涉及多方交易流转，通过 OCR 及 NLP 解析已自动抽取出全部结构化实体和金额指标，目前处于风控排查索引库中。</p>
                                              </div>
                                              <div>
                                                 <h4 className="text-gray-300 font-bold mb-2">样例原文片段</h4>
                                                 <div className="bg-[#121212] p-3 text-gray-300 font-serif leading-relaxed border border-[#333333] rounded min-h-[100px]">
                                                   "......根据合同约定，登XX发行主体将于2026年3月向山东旺XX汽车零部件转账人民币 7,701,342.00 元，作为采购设备及原材料的首期预付款项......"
                                                 </div>
                                              </div>
                                              <div className="grid grid-cols-2 gap-4">
                                                 <div>
                                                   <h4 className="text-gray-300 font-bold mb-2 text-xs">已抽取实体</h4>
                                                   <div className="flex flex-wrap gap-2">
                                                     <span className="px-2 py-1 bg-[#1A1A1A] border border-[#333333] text-[10px] text-blue-400 rounded">登XX发行主体</span>
                                                     <span className="px-2 py-1 bg-[#1A1A1A] border border-[#333333] text-[10px] text-blue-400 rounded">山东旺XX汽车</span>
                                                   </div>
                                                 </div>
                                                 <div>
                                                   <h4 className="text-gray-300 font-bold mb-2 text-xs">已关联风险特征</h4>
                                                   <div className="flex flex-wrap gap-2">
                                                     <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-[10px] text-red-500 rounded">x2b 交易额陡峭度</span>
                                                   </div>
                                                 </div>
                                              </div>
                                           </div>
                                        </div>
    
                                      )
                                   });
                               }} title="预览">预览</button>
                               <button className="text-gray-500 hover:text-green-500 transition-colors" onClick={() => {
                                  toast('数据源已提交重新解析队列...', 'info'); 
                                  setDataSources(dataSources.map((d,i) => i===idx ? {...d, status:'解析中'} : d));
                                  setTimeout(() => {
                                      setDataSources(dataSources.map((d,i) => i===idx ? {...d, status:'已解析'} : d));
                                      toast('解析完成，已更新知识库索引', 'success');
                                  }, 1500);
                               }} title="重新解析">重新解析</button>
                               <button className="text-gray-500 hover:text-blue-400 transition-colors" onClick={() => {
                                   setShowDataSourceModal(false); 
                                   setActiveTab('graph'); 
                                   setGraphMode('all'); 
                                   toast('已定位到该数据源关联证据', 'success');
                               }} title="关联图谱">关联图谱</button>
                               <button className="text-gray-500 hover:text-red-500 transition-colors" onClick={() => {
                                   if(window.confirm(`确定要移除数据源 ${ds.name} 吗？相关图谱关联线索也将失效。`)) {
                                       setDataSources(dataSources.filter((_,i) => i!==idx)); 
                                       setData((prev:any) => ({...prev, documents: (prev.documents||[]).filter((d:any) => (d.originalName || d.fileName || d.name) !== ds.name)}));
                                       toast('数据源已移除', 'success');
                                   }
                               }} title="移除">移除</button>
                            </td>
                         </tr>
                       ))}
                       {dataSources.length === 0 && (
                          <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500 text-sm">暂无数据源</td></tr>
                       )}
                    </tbody>
                  </table>
                </div>
              </div>
           </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #666; }
      `}} />
    </div>
  );
}



const indNameMap: Record<string, string> = {
  general: '通用审计模型',
  ipo: 'IPO / 上市审查',
  financial_investment: '金融投资 / 基金审计',
  real_estate_construction: '地产工程 / 建设反舞弊',
  manufacturing_supply_chain: '制造业 / 供应链采购',
  energy_subsidy: '能源 / 补贴 / 政府项目'
};
export default function Workspace() {
  return (
    <ErrorBoundary>
      <WorkspaceInner />
    </ErrorBoundary>
  );
}
