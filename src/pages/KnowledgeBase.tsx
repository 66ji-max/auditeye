import React, { useState, useEffect } from 'react';
import { BookOpen, Search, FileText, Database, Calendar, Tag, ChevronDown, CheckSquare, X, Eye } from 'lucide-react';
import { toast } from '../components/Toast.tsx';

export default function KnowledgeBase() {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('全部');
  const [showFilter, setShowFilter] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  useEffect(() => {
    fetch('/api/kb')
      .then(res => {
        if (!res.ok) throw new Error('网络请求失败');
        return res.json();
      })
      .then(data => {
        setDocuments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        toast('加载知识库失败，请稍后重试', 'error');
      });
  }, []);

  const types = ['全部', 'PDF', 'DOCX', 'XLSX', 'CSV', '图片', '邮件'];

  const filteredDocs = documents.filter(doc => {
    const matchQuery = (doc.name || '').toLowerCase().includes(query.toLowerCase());
    const matchType = filterType === '全部' || (doc.type || '').toUpperCase().includes(filterType.toUpperCase());
    return matchQuery && matchType;
  });

  return (
    <div className="h-full w-full bg-[#1A1A1A] p-6 text-gray-200 overflow-y-auto custom-scrollbar relative">
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
          <div className="relative">
            <button onClick={() => setShowFilter(!showFilter)} className="px-6 py-2.5 bg-[#242424] border border-[#333333] hover:border-[#D4AF37] text-gray-300 rounded text-sm flex items-center gap-2 transition-colors">
              {filterType === '全部' ? '筛选类型' : filterType} <ChevronDown className="w-4 h-4" />
            </button>
            {showFilter && (
              <div className="absolute top-full mt-2 w-full bg-[#242424] border border-[#333333] rounded shadow-xl z-20 overflow-hidden">
                {types.map(t => (
                  <div key={t} onClick={() => { setFilterType(t); setShowFilter(false); }} className={`px-4 py-2 text-sm cursor-pointer hover:bg-[#333333] ${filterType === t ? 'text-[#D4AF37]' : 'text-gray-300'}`}>
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>
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
          {loading ? (
            <div className="p-8 flex justify-center items-center text-gray-500 text-sm">
              <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mr-3"></div>
              正在加载知识库数据...
            </div>
          ) : (
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
                {filteredDocs.map((doc, i) => (
                  <tr key={i} onClick={() => setSelectedDoc(doc)} className="hover:bg-[#1f1f1f] transition-colors cursor-pointer">
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
                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-xs">暂无匹配的解析数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 详情弹窗 */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDoc(null)}>
           <div className="bg-[#242424] border border-[#333333] w-[800px] h-[80vh] rounded-lg shadow-2xl flex flex-col" onClick={e=>e.stopPropagation()}>
              <div className="p-5 border-b border-[#333333] flex justify-between items-center bg-[#1A1A1A] rounded-t-lg">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-[#D4AF37]" />
                  <h2 className="text-lg font-bold text-gray-100">知识库文档详情</h2>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5"/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                 <div className="bg-[#1A1A1A] border border-[#333333] rounded p-4 grid grid-cols-3 gap-6">
                    <div>
                       <div className="text-xs text-gray-500 mb-1">文件名称</div>
                       <div className="text-sm font-semibold truncate" title={selectedDoc.name}>{selectedDoc.name}</div>
                    </div>
                    <div>
                       <div className="text-xs text-gray-500 mb-1">状态 & 分片</div>
                       <div className="text-sm">{selectedDoc.status} ({selectedDoc.chunks} Chunks)</div>
                    </div>
                    <div>
                       <div className="text-xs text-gray-500 mb-1">入库时间</div>
                       <div className="text-sm">{selectedDoc.date}</div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-gray-300 font-semibold border-b border-[#333333] pb-2">样例分片 (Top 3)</h4>
                    {[1,2,3].map(i => (
                      <div key={i} className="bg-[#1A1A1A] border border-[#333333] p-4 rounded relative group">
                        <div className="absolute top-2 right-2 text-[10px] bg-[#333333] text-gray-400 px-2 py-0.5 rounded">Chunk 00{i}</div>
                        <p className="text-xs text-gray-400 leading-relaxed max-w-[90%]">
                          这是从文档中自动分割并向量化的测试文本段落。审计文档经过 OCR 与 NLP 模型处理，识别并关联到目标实体与账户信息。此文本段落是进行相似度匹配的最小单元。
                        </p>
                      </div>
                    ))}
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-gray-300 font-semibold border-b border-[#333333] pb-2">已提取关系实体</h4>
                    <div className="flex flex-wrap gap-2">
                       <span className="px-3 py-1 bg-[#333333] border border-[#444] rounded text-xs text-gray-300">目标公司 A</span>
                       <span className="px-3 py-1 bg-[#333333] border border-[#444] rounded text-xs text-gray-300">法定代表人 B</span>
                       <span className="px-3 py-1 bg-[#333333] border border-[#444] rounded text-xs text-gray-300">离岸账户 C</span>
                       <span className="px-3 py-1 bg-[#333333] border border-[#444] rounded text-xs text-gray-300">关联企业 D</span>
                    </div>
                 </div>
              </div>

              <div className="p-5 border-t border-[#333333] bg-[#1A1A1A] rounded-b-lg flex justify-end gap-3">
                 <button onClick={() => toast('原文件由于跨域访问限制仅供展示', 'info')} className="px-4 py-2 border border-[#333333] rounded hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors text-sm flex items-center gap-2">
                   <Eye className="w-4 h-4"/> 查看原文
                 </button>
                 <button onClick={() => setSelectedDoc(null)} className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C048] text-[#1A1A1A] rounded shadow-lg transition-colors text-sm font-medium">关闭</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
