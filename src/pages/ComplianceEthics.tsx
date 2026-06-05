import React from "react";
import {
  ShieldCheck,
  Lock,
  Activity,
  Eye,
  FileText,
  AlertTriangle,
  Fingerprint,
  Database,
  CheckSquare,
} from "lucide-react";

export default function ComplianceEthics() {
  return (
    <div className="h-full w-full bg-[var(--bg-page)] text-brand-primary overflow-y-auto custom-scrollbar p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12 pb-12">
        {/* Header section */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-white shadow-sm flex items-center justify-center rounded-2xl border border-brand-border-medium mb-6">
            <ShieldCheck className="w-8 h-8 text-brand-blue" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-title)]">
            AI治理与数据可信体系
          </h1>
          <p className="text-lg text-brand-secondary">
            构建安全、可解释、合规的企业级AI审计平台
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: 数据安全 */}
          <div className="bg-white border border-[#D9E6F2] rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:border-brand-blue/50 hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] transition-all">
            <div className="p-6 border-b border-brand-border-subtle bg-[#F8FAFC]">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-3 border border-brand-border-medium shadow-sm">
                <Lock className="w-5 h-5 text-brand-blue" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-title)]">
                01 数据安全
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex gap-4">
                <Database className="w-5 h-5 text-brand-muted shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-brand-primary">
                    数据隔离
                  </h3>
                  <p className="text-xs text-brand-secondary mt-1.5 leading-relaxed">
                    支持本地化部署，企业数据权限物理隔离，确保绝密审计资料不外泄。
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Lock className="w-5 h-5 text-brand-muted shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-brand-primary">
                    加密存储
                  </h3>
                  <p className="text-xs text-brand-secondary mt-1.5 leading-relaxed">
                    数据传输与存储全程加密，访问全链路审计。
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Eye className="w-5 h-5 text-brand-muted shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-brand-primary">
                    防反推与最小化采集
                  </h3>
                  <p className="text-xs text-brand-secondary mt-1.5 leading-relaxed">
                    仅提取与调用审计规则高度相关的脱敏字段，降低数据过度暴露风险。
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Fingerprint className="w-5 h-5 text-brand-muted shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-brand-primary">
                    系统级脱敏展示
                  </h3>
                  <p className="text-xs text-brand-secondary mt-1.5 leading-relaxed">
                    针对核心标的公司名称、人员、电话、财务账户等敏感标识符，默认开启脱敏展示机制。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: AI治理 */}
          <div className="bg-white border border-[#D9E6F2] rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:border-brand-blue/50 hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] transition-all">
            <div className="p-6 border-b border-brand-border-subtle bg-[#F8FAFC]">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-3 border border-brand-border-medium shadow-sm">
                <Activity className="w-5 h-5 text-brand-blue" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-title)]">
                02 AI治理
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex gap-4">
                <FileText className="w-5 h-5 text-brand-muted shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-brand-primary">
                    可解释智能推理
                  </h3>
                  <p className="text-xs text-brand-secondary mt-1.5 leading-relaxed">
                    拒绝黑盒模型。系统输出的每一项风险判断均会绑定依据片段与证据链条，高度可溯源。
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckSquare className="w-5 h-5 text-brand-muted shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-brand-primary">
                    人机协同复核机制
                  </h3>
                  <p className="text-xs text-brand-secondary mt-1.5 leading-relaxed">
                    针对高风险（≥85分）及重大违规建议，必须经过注册会计师或风控专家人工干预确认。
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <AlertTriangle className="w-5 h-5 text-brand-muted shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-brand-primary">
                    模型幻觉控制设计
                  </h3>
                  <p className="text-xs text-brand-secondary mt-1.5 leading-relaxed">
                    依托本地知识图谱（RAG）和规则推理双驱架构，严格限制发散生成，杜绝无中生有定性结论。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: 合规机制 */}
          <div className="bg-white border border-[#D9E6F2] rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:border-brand-blue/50 hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] transition-all">
            <div className="p-6 border-b border-brand-border-subtle bg-[#F8FAFC]">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-3 border border-brand-border-medium shadow-sm">
                <ShieldCheck className="w-5 h-5 text-brand-blue" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-title)]">
                03 合规机制
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex gap-4">
                <Database className="w-5 h-5 text-brand-muted shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-brand-primary">
                    完整审计留痕
                  </h3>
                  <p className="text-xs text-brand-secondary mt-1.5 leading-relaxed">
                    系统记录每次底层模型调用的版本、预设提示词、文档切片及输出结果与修正反馈，操作全记录。
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <ShieldCheck className="w-5 h-5 text-brand-muted shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-brand-primary">
                    操作追踪
                  </h3>
                  <p className="text-xs text-brand-secondary mt-1.5 leading-relaxed">
                    用户行为全链路追踪，关键操作不可篡改。
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Lock className="w-5 h-5 text-brand-muted shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-brand-primary">
                    不可篡改的日志体系
                  </h3>
                  <p className="text-xs text-brand-secondary mt-1.5 leading-relaxed">
                    对于工作底稿导出和定性结论判定建立签名校验，任何后编辑都会留有版本控制痕迹。
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <FileText className="w-5 h-5 text-brand-muted shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-brand-primary">
                    合规免责申明框架
                  </h3>
                  <p className="text-xs text-brand-secondary mt-1.5 leading-relaxed">
                    全平台强制明示：系统分析仅作为辅助工具。它能够有效缩小怀疑范围，但绝不能替代人类的专业审计意见（Audit
                    Opinion）。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="mt-12 p-8 bg-white border border-[#D9E6F2] shadow-[0_4px_16px_rgba(15,23,42,0.06)] rounded-2xl text-center">
          <p className="text-base text-brand-main leading-relaxed max-w-3xl mx-auto font-medium">
            "AuditEye 致力于构建可解释、可追溯、可信任的企业级AI审计体系。
            <br className="hidden md:block" />
            <span className="text-brand-blue font-bold">
              安全是底线，治理是关键，合规是保障
            </span>{" "}
            —— 让 AI 面向业务深度赋能，而非带来未知黑盒风险。"
          </p>
        </div>
      </div>
    </div>
  );
}
