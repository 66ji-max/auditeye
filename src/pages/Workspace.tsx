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
import { getMockProjectDetail } from '../lib/mockData.ts';

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
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(95).strength(0.75))
      .force("charge", d3.forceManyBody().strength(-170))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.75))
      .force("x", d3.forceX(width / 2).strength(0.055))
      .force("y", d3.forceY(height / 2).strength(0.055))
      .force("collide", d3.forceCollide().radius(34).strength(0.75));

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
      .attr("stroke-width", (d: any) => isHighRiskRel(d.relationType) ? 2 : 1.5)
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8" onClick={() => setExpandedPanel(null)}>
      <div 
        className="relative bg-[#1A1A1A] border border-[#333333] w-[95vw] max-w-6xl h-[85vh] rounded-lg shadow-2xl flex flex-col overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#333333] bg-[#242424]">
          <h2 className="text-lg font-semibold text-gray-200">{expandedPanel.title}</h2>
          <button onClick={() => setExpandedPanel(null)} className="p-1 hover:bg-[#333333] rounded text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-[#1A1A1A] custom-scrollbar">
          {expandedPanel.content}
        </div>
      </div>
    </div>
  );
};

const RiskScoringModule = ({ data, onFeatureClick, onExpand, expanded = false }: { data: any, onFeatureClick?: (feature: any) => void, onExpand?: () => void, expanded?: boolean }) => {
  if (!data) return null;
  const { probabilityPercent, riskLevel, threshold, zValue, warning, subIndices, rawFeatures, conclusion, globalWeights } = data;
  
  return (
    <div className={`flex flex-col ${expanded ? 'gap-8' : 'gap-5'} pb-8 relative group h-full`}>
      {onExpand && !expanded && (
        <button onClick={onExpand} className="absolute top-0 right-0 z-20 p-1.5 bg-[#2A2A2A] border border-[#333333] rounded text-gray-400 hover:text-white hover:border-[#D4AF37] transition-all opacity-0 group-hover:opacity-100 hidden sm:flex">
          <Maximize className="w-3.5 h-3.5" />
        </button>
      )}
      
      {/* 顶部总览卡片 */}
      <div className={`bg-gradient-to-br from-[#242424] to-[#1A1A1A] border border-[#333333] rounded ${expanded ? 'p-6' : 'p-4'} relative overflow-hidden shadow-lg`}>
        {probabilityPercent > threshold && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl"></div>}
        <div className={`flex justify-between items-start ${expanded ? 'mb-6' : 'mb-4'} relative z-10`}>
          <div>
            <h3 className={`${expanded ? 'text-sm' : 'text-xs'} text-gray-400 font-medium tracking-wider mb-1`}>审计风险概率 P(Risk)</h3>
            <div className="flex items-end gap-3">
              <span className={`${expanded ? 'text-6xl' : 'text-4xl'} font-bold tracking-tighter ${probabilityPercent > threshold ? 'text-red-500' : 'text-[#D4AF37]'}`}>
                {probabilityPercent.toFixed(1)}%
              </span>
              <span className={`${expanded ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1'} rounded mb-1.5 font-medium border ${probabilityPercent > threshold ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20'}`}>
                {riskLevel}
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
            <div className={`${expanded ? 'text-sm' : 'text-[10px]'} text-gray-400 font-mono mt-1`}>Z = {zValue.toFixed(4)}</div>
            <div className={`${expanded ? 'text-xs' : 'text-[10px]'} text-gray-500 font-mono mt-1`}>高危阈值 P &gt; {threshold}%</div>
          </div>
        </div>
        <p className={`${expanded ? 'text-sm' : 'text-[11px]'} text-gray-300 leading-relaxed border-t border-[#333333] ${expanded ? 'pt-4' : 'pt-3'} relative z-10`}>
          <strong>判断说明：</strong>{conclusion}
        </p>
      </div>

      {/* 三个子指数卡片 */}
      <div className={`grid ${expanded ? 'grid-cols-3 gap-6' : 'grid-cols-1 gap-3'} w-full`}>
        {/* X1 */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded p-4 relative hover:border-[#D4AF37]/50 transition-colors flex flex-col justify-between">
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
        <div className="bg-[#1A1A1A] border border-[#333333] rounded p-4 relative hover:border-[#D4AF37]/50 transition-colors flex flex-col justify-between">
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
        <div className="bg-[#1A1A1A] border border-[#333333] rounded p-4 relative hover:border-[#D4AF37]/50 transition-colors flex flex-col justify-between">
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
          
          <div className="border border-[#333333] rounded bg-[#242424] overflow-hidden flex flex-col h-full">
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
                  <div className={`${expanded ? 'text-xs' : 'text-[9px]'} text-gray-500 mb-3 font-mono`}>算法: {f.method}</div>
                  <p className={`${expanded ? 'text-xs leading-relaxed' : 'text-[10px] leading-relaxed'} text-gray-400`}><strong className="text-gray-300">RAG 回溯:</strong> {f.evidence}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#333333] rounded bg-[#242424] overflow-hidden flex flex-col h-full">
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
                  <div className={`${expanded ? 'text-xs' : 'text-[9px]'} text-gray-500 mb-3 font-mono`}>算法: {f.method}</div>
                  <p className={`${expanded ? 'text-xs leading-relaxed' : 'text-[10px] leading-relaxed'} text-gray-400`}><strong className="text-gray-300">RAG 回溯:</strong> {f.evidence}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#333333] rounded bg-[#242424] overflow-hidden flex flex-col h-full">
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
                  <div className={`${expanded ? 'text-xs' : 'text-[9px]'} text-gray-500 mb-3 font-mono`}>算法: {f.method}</div>
                  <p className={`${expanded ? 'text-xs leading-relaxed' : 'text-[10px] leading-relaxed'} text-gray-400`}><strong className="text-gray-300">RAG 回溯:</strong> {f.evidence}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [query, setQuery] = useState('分析登XX发行主体与山东旺XX汽车零部件有限公司的关联交易风险');
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'doc'|'fin'|'graph'>('doc');
  const [graphMode, setGraphMode] = useState<'all'|'minimal'>('all');
  const [showRuleSet, setShowRuleSet] = useState(false);
  const [lastAnalysisAt, setLastAnalysisAt] = useState<Date | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<null | { title: string; type: string; content: React.ReactNode; }>(null);

  const [loadingProject, setLoadingProject] = useState(true);

  const formatWorkflowTime = (time?: string | Date) => {
    const d = time ? new Date(time) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error(`请求失败状态码: ${res.status}`);
      const apiData = await res.json();
      
      if (apiData && apiData.project) {
        setData(apiData);
      } else {
        throw new Error('API 返回数据结构异常');
      }
      setLoadingProject(false);
    } catch (err) {
      console.warn("API unavailable or invalid response, fallback to local mock detail. Error:", err);
      const fallbackData = getMockProjectDetail(id as string);
      
      if (fallbackData && fallbackData.project) {
        setData(fallbackData);
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
  
  const riskScoring = data.riskScoring;
  const score = riskScoring?.probabilityPercent ?? data.project.riskScore ?? 0;
  const riskLevel = riskScoring ? { label: riskScoring.riskLevel, color: 'text-red-500', bg: 'bg-red-500' } : (data.project.riskLevel || { label: '未评估', color: 'text-gray-500' });
  const dimScores = data.project.dimensionScores || { relation: 0, behavior: 0, financial: 0 };
  
  const rulesHit = logs.filter((l: any) => l.action === 'RED_FLAG');
  const docsCount = data.documents.length;

  const downloadWorkpapers = () => {
    toast('正在打包底稿...', 'info');
    let riskEvaluationSection = '';
    
    if (data.riskScoring) {
      riskEvaluationSection = `【全局风险评估】
审计风险概率: ${data.riskScoring.probabilityPercent.toFixed(1)}% (${data.riskScoring.riskLevel}) 
逻辑值 Z: ${data.riskScoring.zValue.toFixed(4)}
高危预警阈值: ${data.riskScoring.threshold}%
判断说明: ${data.riskScoring.conclusion}

【三维子指数分析】
X1 身份关联指数: ${data.riskScoring.subIndices.X1}
X2 交易异常指数: ${data.riskScoring.subIndices.X2}
X3 外围牵连指数: ${data.riskScoring.subIndices.X3}`;
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
    <p>全局风险评估（基于分层逻辑回归模型）：<span class="risk-score">${data.riskScoring.probabilityPercent.toFixed(1)}%（${data.riskScoring.riskLevel}）</span></p>
    <p>Z值：${data.riskScoring.zValue.toFixed(4)} | 高危阈值：P &gt; ${data.riskScoring.threshold}%</p>
    <p><strong>判断说明：</strong>${data.riskScoring.conclusion}</p>
    <p><strong>三维子指数：</strong>X1 身份关联指数 (${data.riskScoring.subIndices.X1}), X2 交易异常指数 (${data.riskScoring.subIndices.X2}), X3 外围牵连指数 (${data.riskScoring.subIndices.X3})</p>
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
          <div className="flex items-center gap-1.5 shrink-0 hidden md:flex"><Database className="w-3.5 h-3.5"/> 数据源: 4</div>
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
                   <div className="p-8 max-w-2xl mx-auto border border-[#333333] rounded bg-[#242424]">
                     <div className="relative">
                       <div className="absolute left-[13px] top-4 bottom-4 w-[2px] bg-[#333333] z-0"></div>
                       {loading && <WorkflowStep icon={<Search className="w-4 h-4 text-[#D4AF37]" />} title="执行多源数据检索中..." status="active" time={lastAnalysisAt ? formatWorkflowTime(lastAnalysisAt) : '现在'} />}
                       {logs.length > 0 && logs.filter((l:any) => l.action !== 'RED_FLAG').map((l:any, i:number) => {
                         const details = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
                         return <WorkflowStep key={i} icon={<CheckSquare className="w-4 h-4 text-gray-400" />} title={details.message || '系统日志'} status="done" time={lastAnalysisAt ? formatWorkflowTime(lastAnalysisAt) : formatWorkflowTime(l.createdAt)} />
                       })}
                       {rulesHit.length > 0 && (
                         <WorkflowStep icon={<AlertTriangle className="w-4 h-4 text-red-500" />} title="风险规则命中警告" desc={`检测到 ${rulesHit.length} 项高亮风险，涉及强关系证据链。段落证据已落至工作底稿。`} status="alert" time={lastAnalysisAt ? formatWorkflowTime(lastAnalysisAt) : formatWorkflowTime(rulesHit[0].createdAt)} rules={rulesHit.length} />
                       )}
                       {logs.length > 0 && <WorkflowStep icon={<FileText className="w-4 h-4 text-gray-400" />} title="生成专项审计建议" desc="根据规则命中情况，已自动生成扩大抽样与业务核查指南。" status="done" time={lastAnalysisAt ? formatWorkflowTime(lastAnalysisAt) : formatWorkflowTime(new Date())} />}
                       {logs.length > 0 && <WorkflowStep icon={<User className="w-4 h-4 text-gray-500" />} title="等待经理复核" status="pending" time="--" />}
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
            
            {logs.length > 0 ? (
              <>
                {logs.filter((l:any) => l.action !== 'RED_FLAG').map((l:any, i:number) => {
                  const details = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
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
        <div className="w-full lg:w-[440px] xl:w-[480px] bg-[#1A1A1A] flex flex-col shrink-0 min-h-max lg:min-h-0 border-y lg:border-y-0 lg:border-l border-[#333333] overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-[#333333] flex items-center justify-between sticky top-0 bg-[#1A1A1A] z-20">
            <h2 className="text-sm font-semibold text-gray-200">全维风险评估报告</h2>
            <div className="text-[10px] text-gray-500 font-mono">模型置信度: 94.2%</div>
          </div>
          
          <div className="p-4 space-y-5">
            {/* Main Score Area */}
            {data.riskScoring ? (
              <RiskScoringModule 
                data={data.riskScoring} 
                onFeatureClick={setSelectedNode} 
                onExpand={() => setExpandedPanel({ 
                  title: '全维风险评估与底层特征分析', 
                  type: 'riskScoring', 
                  content: <RiskScoringModule data={data.riskScoring} onFeatureClick={setSelectedNode} expanded={true} /> 
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
                                       <span className="flex items-center gap-1.5"><Activity className="w-4 h-4"/> 前往审查 <ChevronRight className="w-4 h-4"/></span>
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
                               <span className="flex items-center gap-1"><Activity className="w-3 h-3"/> 前往审查 <ChevronRight className="w-3 h-3"/></span>
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
                  content: <div className="w-full h-full min-h-[70vh]"><D3Graph entities={displayEntities} relationships={displayRels} onNodeClick={setSelectedNode} onEdgeClick={setSelectedEdge} /></div> 
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
                   <button onClick={() => toast('完整穿透画像功能敬请期待', 'info')} className="w-full py-2 bg-[#333333] hover:bg-[#444] text-xs font-medium rounded transition-colors text-gray-200">查看完整画像</button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col bg-[#1A1A1A]">
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#333333] overflow-x-auto whitespace-nowrap custom-scrollbar">
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
                    return (
                    <div key={i} className={`bg-[#242424] border ${isHighRisk ? 'border-red-500/50' : 'border-[#333333]'} rounded hover:border-[#D4AF37]/50 transition-colors flex flex-col`}>
                      <div className="p-3 border-b border-[#333333] flex justify-between items-start">
                        <div>
                          <div className={`text-[10px] font-medium ${isHighRisk ? 'text-red-400' : 'text-[#D4AF37]'} flex items-center gap-1 mb-1`}><FileText className="w-3 h-3" /> API 数据 / 公开库</div>
                          <div className="text-xs text-gray-200 font-medium">段落锚点 #{i+102}</div>
                        </div>
                        <span className={`text-[9px] ${isHighRisk ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-gray-500 bg-[#1A1A1A] border-[#333333]'} px-1.5 py-0.5 rounded border`}>
                          {isHighRisk ? '高风险预警' : 'Page 1'}
                        </span>
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
      
      {expandedPanel && <ExpandedPanelModal expandedPanel={expandedPanel} setExpandedPanel={setExpandedPanel} />}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #666; }
      `}} />
    </div>
  );
}
