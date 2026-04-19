import React, { useState } from 'react';
import { BookOpen, Search, FileText, Database, Calendar, Tag, ChevronDown } from 'lucide-react';

export default function KnowledgeBase() {
  const [query, setQuery] = useState('');

  const documents = [
    { id: 'DOC-1029', name: 'A公司 2025 年度审计报告.pdf', status: '解析完成', chunks: 145, entities: 32, type: '财务文书', date: '2026-04-18' },
    { id: 'DOC-1030', name: '供应商采购协议-B公司.docx', status: '解析完成', chunks: 42, entities: 8, type: '业务合同', date: '2026-04-18' },
    { id: 'DOC-1031', name: '高管名册及履历表.xlsx', status: '解析完成', chunks: 86, entities: 54, type: '人事档案', date: '2026-04-17' },
    { id: 'DOC-1032', name: '尽职调查初步问卷.md', status: '解析中...', chunks: '-', entities: '-', type: '工作底稿', date: '2026-04-19' }
  ];

  return (
    <div className="h-full w-full bg-[#1A1A1A] p-6 text-gray-200 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#D4AF37]" />
              企业知识库 (RAG Vector Store)
            </h1>
            <p className="text-xs text-gray-500 mt-1">集中管理结构化/非结构化业务档案，支撑大模型智能召回与知识抽取。</p>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
            <input 
              type="text" 
              placeholder="通过实体、文档名称或全文检索知识库..." 
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-[#242424] border border-[#333333] rounded px-9 py-2.5 text-sm focus:outline-none focus:border-[#D4AF37] text-white"
            />
          </div>
          <button className="px-6 bg-[#242424] border border-[#333333] hover:border-[#D4AF37] text-gray-300 rounded text-sm flex items-center gap-2 transition-colors">
            筛选类型 <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-[#242424] border border-[#333333] p-4 rounded-lg flex flex-col">
            <div className="text-[11px] text-gray-500 mb-2">总存储体量</div>
            <div className="text-2xl font-bold text-gray-200">1.2<span className="text-sm font-normal text-gray-500 ml-1">GB</span></div>
          </div>
          <div className="bg-[#242424] border border-[#333333] p-4 rounded-lg flex flex-col">
            <div className="text-[11px] text-gray-500 mb-2">向量化分片 (Chunks)</div>
            <div className="text-2xl font-bold text-gray-200">24,592</div>
          </div>
          <div className="bg-[#242424] border border-[#333333] p-4 rounded-lg flex flex-col">
            <div className="text-[11px] text-gray-500 mb-2">已沉淀实体 (Entities)</div>
            <div className="text-2xl font-bold text-[#D4AF37]">3,105</div>
          </div>
          <div className="bg-[#242424] border border-[#333333] p-4 rounded-lg flex flex-col">
            <div className="text-[11px] text-gray-500 mb-2">知识库版本</div>
            <div className="text-2xl font-bold text-gray-200 font-mono">v4.2.0</div>
          </div>
        </div>

        <div className="bg-[#242424] border border-[#333333] rounded-lg shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#333333] flex items-center justify-between bg-[#1A1A1A]">
            <h3 className="text-sm font-medium">源文件解析列表</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1A1A1A] border-b border-[#333333] text-gray-400 text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">文件名称</th>
                <th className="px-4 py-3 font-medium">类型标签</th>
                <th className="px-4 py-3 font-medium">解析状态</th>
                <th className="px-4 py-3 font-medium text-right">语料切片</th>
                <th className="px-4 py-3 font-medium text-right">提取实体</th>
                <th className="px-4 py-3 font-medium text-right">入库时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333]">
              {documents.map((doc, i) => (
                <tr key={i} className="hover:bg-[#1f1f1f] transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#D4AF37]" />
                      <div>
                        <div className="font-medium text-gray-200 text-xs">{doc.name}</div>
                        <div className="font-mono text-[10px] text-gray-500">{doc.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-[#1A1A1A] border border-[#333333] rounded text-[10px] text-gray-300 flex items-center gap-1 w-max">
                      <Tag className="w-3 h-3" /> {doc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 text-[11px] ${doc.status.includes('中') ? 'text-blue-400' : 'text-green-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${doc.status.includes('中') ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`}></div>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-400">{doc.chunks}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-400">{doc.entities}</td>
                  <td className="px-4 py-3 text-right text-[11px] text-gray-500">{doc.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
