/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ShieldAlert, Bot, User, Database, FileText, Users, AlertTriangle, 
  Activity, Network, TrendingDown, Link as LinkIcon, AlertOctagon, 
  Download, FileSearch, Clock, CheckSquare, Maximize, DownloadCloud,
  Search, Bell, Settings, ChevronRight, Menu
} from 'lucide-react';

const WorkflowStep = ({ icon, title, desc, status, time }: { icon: React.ReactNode, title: string, desc?: string, status: 'done' | 'active' | 'alert', time: string }) => {
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

const KPICard = ({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) => (
  <div className="bg-[#1A1A1A] border border-[#333333] rounded p-3 flex flex-col justify-between">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] text-gray-400">{title}</span>
      {icon}
    </div>
    <div className="text-xl font-bold text-gray-100">{value}</div>
  </div>
);

const RedFlagItem = ({ text, severity }: { text: string, severity: 'high' | 'medium' }) => (
  <div className="flex items-start gap-2 p-2 rounded bg-[#1A1A1A] border border-[#333333]">
    <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
    <span className="text-xs text-gray-300 leading-tight">{text}</span>
  </div>
);

const EvidenceCard = ({ source, page, snippet, highlight, alert }: { source: string, page: string, snippet: string, highlight?: string, alert?: string }) => {
  const parts = highlight ? snippet.split(highlight) : [snippet];
  
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
        {highlight ? (
          <>
            {parts[0]}
            <span className="bg-[#D4AF37]/20 text-[#D4AF37] px-0.5 rounded">{highlight}</span>
            {parts[1]}
          </>
        ) : snippet}
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

const TimelineItem = ({ date, desc, alert }: { date: string, desc: string, alert?: boolean }) => (
  <div className="relative flex gap-2 pb-4 z-10">
    <div className={`w-3.5 h-3.5 rounded-full border-2 border-[#1A1A1A] shrink-0 mt-0.5 ${alert ? 'bg-red-500' : 'bg-[#4B5563]'}`}></div>
    <div>
      <div className="text-[10px] font-mono text-gray-500">{date}</div>
      <div className={`text-[11px] mt-0.5 ${alert ? 'text-red-400 font-medium' : 'text-gray-300'}`}>{desc}</div>
    </div>
  </div>
);

const RelationshipGraph = () => {
  return (
    <div className="relative w-full h-[260px] bg-[#1A1A1A] rounded border border-[#333333] overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 600 260" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#333333" strokeWidth="0.5" strokeOpacity="0.3"/>
          </pattern>
          <linearGradient id="redGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Links */}
        <line x1="150" y1="130" x2="300" y2="80" stroke="#4B5563" strokeWidth="1.5" strokeDasharray="4" />
        <line x1="300" y1="80" x2="450" y2="130" stroke="#4B5563" strokeWidth="1.5" />
        <line x1="300" y1="80" x2="300" y2="200" stroke="#ef4444" strokeWidth="2" />
        <line x1="150" y1="130" x2="300" y2="200" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" />
        
        {/* Nodes */}
        {/* Node A */}
        <circle cx="150" cy="130" r="28" fill="#242424" stroke="#D4AF37" strokeWidth="2" />
        <text x="150" y="134" fill="#E2E8F0" fontSize="12" fontWeight="500" textAnchor="middle">A公司</text>
        
        {/* Node B */}
        <circle cx="450" cy="130" r="28" fill="#242424" stroke="#D4AF37" strokeWidth="2" />
        <text x="450" y="134" fill="#E2E8F0" fontSize="12" fontWeight="500" textAnchor="middle">B公司</text>

        {/* Executive */}
        <circle cx="300" cy="80" r="22" fill="#242424" stroke="#4B5563" strokeWidth="1.5" />
        <text x="300" y="84" fill="#9CA3AF" fontSize="11" textAnchor="middle">高管张某</text>

        {/* Supplier (Suspicious) */}
        <circle cx="300" cy="200" r="32" fill="url(#redGlow)" stroke="#ef4444" strokeWidth="2" />
        <circle cx="300" cy="200" r="28" fill="#242424" stroke="#ef4444" strokeWidth="1" strokeDasharray="2" />
        <text x="300" y="204" fill="#ef4444" fontSize="12" fontWeight="600" textAnchor="middle">供应商Y</text>

        {/* Labels on links */}
        <g transform="translate(200, 95)">
          <rect x="-25" y="-8" width="50" height="16" fill="#1A1A1A" border="#333333" rx="8" stroke="#333333" strokeWidth="1" />
          <text x="0" y="3" fill="#9CA3AF" fontSize="9" textAnchor="middle">曾任职</text>
        </g>

        <g transform="translate(375, 95)">
          <rect x="-30" y="-8" width="60" height="16" fill="#1A1A1A" rx="8" stroke="#333333" strokeWidth="1" />
          <text x="0" y="3" fill="#9CA3AF" fontSize="9" textAnchor="middle">现任法人</text>
        </g>

        <g transform="translate(225, 165)">
          <rect x="-30" y="-8" width="60" height="16" fill="#1A1A1A" rx="8" stroke="#ef4444" strokeWidth="1" />
          <text x="0" y="3" fill="#ef4444" fontSize="9" textAnchor="middle">地址重合</text>
        </g>

        <g transform="translate(300, 140)">
          <rect x="-25" y="-8" width="50" height="16" fill="#1A1A1A" rx="8" stroke="#ef4444" strokeWidth="1" />
          <text x="0" y="3" fill="#ef4444" fontSize="9" textAnchor="middle">大额交易</text>
        </g>
      </svg>
      
      {/* Graph Controls overlay */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button className="w-6 h-6 bg-[#242424] border border-[#333333] rounded flex items-center justify-center text-gray-400 hover:text-white">
          <span className="text-sm leading-none">+</span>
        </button>
        <button className="w-6 h-6 bg-[#242424] border border-[#333333] rounded flex items-center justify-center text-gray-400 hover:text-white">
          <span className="text-sm leading-none">-</span>
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="h-screen w-screen bg-[#1A1A1A] text-gray-200 font-sans flex flex-col overflow-hidden selection:bg-[#D4AF37]/30">
      {/* Header */}
      <header className="h-14 border-b border-[#333333] flex items-center px-4 justify-between bg-[#1A1A1A] shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-lg tracking-wide">
            <ShieldAlert className="w-5 h-5" />
            AuditEye
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <button className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-[#242424] rounded border border-[#333333]">工作台</button>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors">项目管理</button>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors">规则引擎</button>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors">知识库</button>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="搜索企业、高管、案卷..." 
              className="bg-[#242424] border border-[#333333] rounded pl-8 pr-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#D4AF37] w-64 transition-colors"
            />
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <button className="hover:text-gray-200 transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="hover:text-gray-200 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-[#333333]"></div>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-6 h-6 rounded bg-[#333333] flex items-center justify-center text-xs font-medium text-[#D4AF37]">李</div>
              <span className="text-xs font-medium hidden sm:block">李工 (高级审计)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden bg-[#121212]">
        {/* Top 3 panels */}
        <div className="flex-1 flex gap-4 min-h-0">
          
          {/* Left Panel: AI Assistant */}
          <div className="w-[280px] lg:w-[320px] flex flex-col bg-[#242424] border border-[#333333] rounded-lg p-4 shadow-lg shrink-0">
            <div className="flex items-center gap-2 mb-5">
              <Bot className="w-4 h-4 text-[#D4AF37]" />
              <h2 className="text-sm font-semibold text-gray-200 tracking-wide">AI 审计助手</h2>
            </div>
            
            {/* User Query */}
            <div className="bg-[#1A1A1A] border border-[#333333] rounded p-3 mb-5 shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded bg-[#333333] flex items-center justify-center">
                  <User className="w-3 h-3 text-gray-400" />
                </div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">User Input</span>
              </div>
              <p className="text-xs text-gray-200 leading-relaxed font-medium">“分析A公司与B公司的关联风险”</p>
            </div>

            {/* Workflow Steps */}
            <div className="flex-1 overflow-y-auto pr-2 relative custom-scrollbar">
              <div className="absolute left-[11px] top-2 bottom-6 w-[2px] bg-[#333333] z-0"></div>

              <WorkflowStep 
                icon={<Database className="w-3 h-3 text-[#D4AF37]" />} 
                title="多源数据检索中" 
                status="done" 
                time="0.2s" 
              />
              <WorkflowStep 
                icon={<FileText className="w-3 h-3 text-[#D4AF37]" />} 
                title="正在解析年报与招股书" 
                status="done" 
                time="1.5s" 
              />
              <WorkflowStep 
                icon={<Users className="w-3 h-3 text-[#D4AF37]" />} 
                title="识别高管履历交集" 
                status="done" 
                time="0.8s" 
              />
              <WorkflowStep 
                icon={<AlertTriangle className="w-3 h-3 text-red-500" />} 
                title="命中风险规则" 
                desc="地址重合 / 电话重合 / 存贷双高" 
                status="alert" 
                time="0.5s" 
              />
              <WorkflowStep 
                icon={<Activity className="w-3 h-3 text-[#D4AF37]" />} 
                title="生成综合风险评分" 
                status="active" 
                time="..." 
              />
            </div>
          </div>

          {/* Center Panel: Risk Summary */}
          <div className="w-[320px] lg:w-[380px] flex flex-col bg-[#242424] border border-[#333333] rounded-lg p-4 shadow-lg shrink-0">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="text-sm font-semibold text-gray-200 tracking-wide">风险概览</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-[#1A1A1A] border border-[#333333] rounded text-gray-400">Target: A公司 & B公司</span>
            </div>

            {/* Score Card */}
            <div className="flex items-center justify-between bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] border border-[#333333] rounded p-4 mb-5 shadow-md relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full blur-xl"></div>
              <div className="relative z-10">
                <div className="text-[11px] text-gray-400 mb-1 tracking-wide">综合风险评分</div>
                <div className="text-4xl font-bold text-[#D4AF37] tracking-tight">82<span className="text-sm text-gray-500 font-normal ml-1">/100</span></div>
              </div>
              <div className="flex flex-col items-end relative z-10">
                <div className="px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-500 text-[11px] font-medium rounded flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  高风险
                </div>
                <div className="text-[9px] text-gray-500 mt-2">基于 142 项审计规则</div>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <KPICard title="关联关系命中数" value="12" icon={<Network className="w-3.5 h-3.5 text-blue-400" />} />
              <KPICard title="财务异常命中数" value="3" icon={<TrendingDown className="w-3.5 h-3.5 text-amber-400" />} />
              <KPICard title="行为异动命中数" value="5" icon={<Activity className="w-3.5 h-3.5 text-purple-400" />} />
              <KPICard title="可追溯证据数" value="28" icon={<LinkIcon className="w-3.5 h-3.5 text-green-400" />} />
            </div>

            {/* Top Red Flags */}
            <div className="flex-1 flex flex-col min-h-0">
              <h3 className="text-[10px] font-semibold text-gray-500 mb-3 uppercase tracking-widest">Top Red Flags</h3>
              <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                <RedFlagItem text="隐性关联方疑似存在" severity="high" />
                <RedFlagItem text="供应商电话与注册地址异常重合" severity="high" />
                <RedFlagItem text="存贷双高，利息收益率偏低" severity="medium" />
                <RedFlagItem text="审计前夕存在异常工商变更" severity="medium" />
              </div>
            </div>
          </div>

          {/* Right Panel: Dynamic Evidence & Visualization */}
          <div className="flex-1 flex flex-col bg-[#242424] border border-[#333333] rounded-lg p-4 shadow-lg min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="text-sm font-semibold text-gray-200 tracking-wide">动态证据与图谱分析</h2>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-[11px] font-medium bg-[#1A1A1A] border border-[#333333] rounded hover:border-[#D4AF37]/50 text-gray-300 transition-colors flex items-center gap-1.5">
                  <LinkIcon className="w-3 h-3" />
                  证据链锚点
                </button>
                <button className="px-3 py-1.5 text-[11px] font-medium bg-[#1A1A1A] border border-[#333333] rounded hover:border-[#D4AF37]/50 text-gray-300 transition-colors flex items-center gap-1.5">
                  <Download className="w-3 h-3" />
                  底稿导出
                </button>
              </div>
            </div>

            {/* Graph Area */}
            <div className="mb-4 shrink-0">
              <RelationshipGraph />
            </div>

            {/* Evidence & Timeline Split */}
            <div className="flex gap-4 flex-1 min-h-0">
              {/* Evidence Panel */}
              <div className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded p-3 flex flex-col overflow-hidden">
                <h3 className="text-[11px] font-semibold text-gray-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                  <FileSearch className="w-3.5 h-3.5 text-[#D4AF37]" />
                  证据溯源
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  <EvidenceCard 
                    source="A公司2022年报.pdf" 
                    page="P. 45" 
                    snippet="...本公司第一大供应商为Y公司，采购金额达3.2亿元，占年度采购总额的45%..." 
                    highlight="Y公司"
                  />
                  <EvidenceCard 
                    source="工商登记信息_Y公司" 
                    page="企查查 API" 
                    snippet="注册地址：高新区科技路88号3栋201室。联系电话：021-8888****" 
                    highlight="高新区科技路88号3栋201室"
                    alert="与A公司注册地址完全重合"
                  />
                </div>
              </div>

              {/* Timeline */}
              <div className="w-[220px] bg-[#1A1A1A] border border-[#333333] rounded p-3 flex flex-col overflow-hidden shrink-0">
                <h3 className="text-[11px] font-semibold text-gray-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                  关键事件
                </h3>
                <div className="flex-1 overflow-y-auto relative pl-1 custom-scrollbar">
                  <div className="absolute left-[10px] top-2 bottom-2 w-[1px] bg-[#333333] z-0"></div>
                  <TimelineItem date="2022.11.15" desc="Y公司突击成立" />
                  <TimelineItem date="2022.12.20" desc="A公司大额采购 (3.2亿)" alert />
                  <TimelineItem date="2023.03.05" desc="高管张某离职" />
                  <TimelineItem date="2023.05.12" desc="B公司入股Y公司 (控股)" alert />
                </div>
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
              经AI多维分析，A公司与B公司之间存在极高的隐性关联交易风险。核心疑点集中在共同供应商Y公司，其注册地址与A公司重合，且在成立次月即获得A公司大额采购订单。同时，B公司随后入股Y公司，形成完整的资金闭环疑似。建议立即启动专项核查。
            </p>
          </div>
          
          <div className="w-px bg-[#333333] my-1"></div>

          <div className="flex-1 flex flex-col pl-2">
            <h3 className="text-[11px] font-semibold text-gray-300 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <CheckSquare className="w-3.5 h-3.5" />
              审计建议
            </h3>
            <ul className="text-[11px] text-gray-400 space-y-1.5 list-disc list-inside">
              <li>对Y公司进行实地走访，核实其实际办公地址与人员情况。</li>
              <li>调取A公司与Y公司的完整资金流水，穿透核查资金最终去向。</li>
              <li>约谈前高管张某，了解其离职原因及与B公司的潜在联系。</li>
            </ul>
          </div>

          <div className="w-px bg-[#333333] my-1"></div>

          <div className="flex-1 flex flex-col pl-2">
            <h3 className="text-[11px] font-semibold text-gray-300 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Maximize className="w-3.5 h-3.5" />
              扩大抽样建议
            </h3>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="px-2 py-1 bg-[#1A1A1A] border border-[#333333] rounded text-[10px] text-gray-400">成立不满1年的供应商</span>
              <span className="px-2 py-1 bg-[#1A1A1A] border border-[#333333] rounded text-[10px] text-gray-400">毛利率异常波动的业务线</span>
              <span className="px-2 py-1 bg-[#1A1A1A] border border-[#333333] rounded text-[10px] text-gray-400">年底突击交易大客户</span>
            </div>
          </div>

          <div className="flex items-center justify-center pl-6 border-l border-[#333333]">
            <button className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#C5A028] hover:from-[#E5C048] hover:to-[#D4AF37] text-[#1A1A1A] font-bold text-xs rounded shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center gap-2 whitespace-nowrap">
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
