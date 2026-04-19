import React, { useState, useEffect } from 'react';
import { Settings, Plus, Activity, Edit3, Trash2, Shield, Calendar, User } from 'lucide-react';
import { toast } from '../components/Toast.tsx';

export default function RuleEngine() {
  const [rules, setRules] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/rules')
      .then(res => res.json())
      .then(data => setRules(data));
  }, []);

  return (
    <div className="h-full w-full bg-[#1A1A1A] p-6 text-gray-200 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6 text-[#D4AF37]" />
              审计规则引擎
            </h1>
            <p className="text-xs text-gray-500 mt-1">管理并调试用于实体交叉验证与风险评分的规则集版本。</p>
          </div>
          <button onClick={() => toast('审计规则编辑需管理员权限', 'warning')} className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C048] text-[#1A1A1A] font-medium text-sm rounded shadow-[0_0_15px_rgba(212,175,55,0.2)] flex items-center gap-2">
            <Plus className="w-4 h-4" /> 新建规则
          </button>
        </div>

        <div className="bg-[#242424] border border-[#333333] rounded-lg shadow-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1A1A1A] border-b border-[#333333] text-gray-400 text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">规则编号 / 名称</th>
                <th className="px-4 py-3 font-medium">风险维度</th>
                <th className="px-4 py-3 font-medium">风险权重 (0-50)</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">更新人 & 时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333]">
              {rules.map((r, i) => (
                <tr key={i} className="hover:bg-[#1f1f1f] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono text-[10px] text-gray-500 mb-0.5">{r.id}</div>
                    <div className="font-medium text-gray-200 text-xs">{r.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-[#1A1A1A] border border-[#333333] rounded text-[10px] text-gray-300">
                      {r.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#333333]">
                        <div className="h-full bg-[#D4AF37]" style={{ width: `${(r.weight / 50) * 100}%` }}></div>
                      </div>
                      <span className="font-mono text-xs text-gray-400">{r.weight}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] ${r.status === 'enabled' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                      {r.status === 'enabled' ? '生效中' : '已停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[11px] text-gray-400 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1"><User className="w-3 h-3"/> {r.owner}</div>
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {r.updatedAt}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toast('审计规则编辑需管理员权限', 'warning')} className="p-1.5 text-gray-400 hover:text-[#D4AF37] transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => toast('核心内置规则禁止删除', 'error')} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
