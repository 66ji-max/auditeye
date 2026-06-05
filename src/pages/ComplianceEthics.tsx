import React from 'react';
import { ShieldCheck, Lock, Activity, Eye, FileText, AlertTriangle, Fingerprint, Database, CheckSquare } from 'lucide-react';

export default function ComplianceEthics() {
  return (
    <div className="h-full w-full bg-[#1A1A1A] text-gray-200 overflow-y-auto custom-scrollbar p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12 pb-12">
        
        {/* Header section */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-[#D4AF37]/10 flex items-center justify-center rounded-2xl border border-[#D4AF37]/20 mb-6">
            <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">AI治理与数据可信体系</h1>
          <p className="text-lg text-gray-400">构建安全、可解释、合规的企业级AI审计平台</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: 数据安全 */}
          <div className="bg-[#242424] border border-[#333333] rounded-xl overflow-hidden hover:border-[#D4AF37]/50 transition-colors">
            <div className="p-6 border-b border-[#333333] bg-[#1A1A1A]">
              <div className="w-10 h-10 bg-blue-500/10 rounded flex items-center justify-center mb-3 border border-blue-500/20">
                <Lock className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">01 数据安全</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-4">
                <Database className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300">数据隔离</h3>
                  <p className="text-xs text-gray-500 mt-1">支持本地化部署，企业数据权限物理隔离，确保绝密审计资料不外泄。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Lock className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300">加密存储</h3>
                  <p className="text-xs text-gray-500 mt-1">数据传输与存储全程加密，访问全链路审计。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Eye className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300">防反推与最小化采集</h3>
                  <p className="text-xs text-gray-500 mt-1">仅提取与调用审计规则高度相关的脱敏字段，降低数据过度暴露风险。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Fingerprint className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300">系统级脱敏展示</h3>
                  <p className="text-xs text-gray-500 mt-1">针对核心标的公司名称、人员、电话、财务账户等敏感标识符，默认开启脱敏展示机制。</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: AI治理 */}
          <div className="bg-[#242424] border border-[#333333] rounded-xl overflow-hidden hover:border-[#D4AF37]/50 transition-colors">
            <div className="p-6 border-b border-[#333333] bg-[#1A1A1A]">
              <div className="w-10 h-10 bg-[#D4AF37]/10 rounded flex items-center justify-center mb-3 border border-[#D4AF37]/20">
                <Activity className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h2 className="text-xl font-semibold text-white">02 AI治理</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-4">
                <FileText className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300">可解释智能推理</h3>
                  <p className="text-xs text-gray-500 mt-1">拒绝黑盒模型。系统输出的每一项风险判断均会绑定依据片段与证据链条，高度可溯源。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckSquare className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300">人机协同复核机制</h3>
                  <p className="text-xs text-gray-500 mt-1">针对高风险（≥85分）及重大违规建议，必须经过注册会计师或风控专家人工干预确认。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <AlertTriangle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300">模型幻觉控制设计</h3>
                  <p className="text-xs text-gray-500 mt-1">依托本地知识图谱（RAG）和规则推理双驱架构，严格限制发散生成，杜绝无中生有定性结论。</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: 合规机制 */}
          <div className="bg-[#242424] border border-[#333333] rounded-xl overflow-hidden hover:border-[#D4AF37]/50 transition-colors">
            <div className="p-6 border-b border-[#333333] bg-[#1A1A1A]">
              <div className="w-10 h-10 bg-green-500/10 rounded flex items-center justify-center mb-3 border border-green-500/20">
                <ShieldCheck className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">03 合规机制</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-4">
                <Database className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300">完整审计留痕</h3>
                  <p className="text-xs text-gray-500 mt-1">系统记录每次底层模型调用的版本、预设提示词、文档切片及输出结果与修正反馈，操作全记录。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <ShieldCheck className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300">操作追踪</h3>
                  <p className="text-xs text-gray-500 mt-1">用户行为全链路追踪，关键操作不可篡改。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Lock className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300">不可篡改的日志体系</h3>
                  <p className="text-xs text-gray-500 mt-1">对于工作底稿导出和定性结论判定建立签名校验，任何后编辑都会留有版本控制痕迹。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <FileText className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300">合规免责申明框架</h3>
                  <p className="text-xs text-gray-500 mt-1">全平台强制明示：系统分析仅作为辅助工具。它能够有效缩小怀疑范围，但绝不能替代人类的专业审计意见（Audit Opinion）。</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="mt-12 p-8 bg-[#242424] border border-[#333333] rounded-xl text-center">
          <p className="text-base text-gray-300 leading-relaxed max-w-3xl mx-auto font-medium">
            "AuditEye 致力于构建可解释、可追溯、可信任的企业级AI审计体系。<br className="hidden md:block" />
            <span className="text-[#D4AF37]">安全是底线，治理是关键，合规是保障</span> —— 让 AI 面向业务深度赋能，而非带来未知黑盒风险。"
          </p>
        </div>
      </div>
    </div>
  );
}
