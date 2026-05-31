const fs = require('fs');
let c = fs.readFileSync('src/pages/Workspace.tsx', 'utf-8');

const modalCode = `
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
                              <span className={\`text-[11px] px-2 py-1 rounded \${ds.status === '已解析' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}\`}>{ds.status}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">{ds.date}</td>
                            <td className="px-4 py-3 text-gray-300 font-mono text-right">{ds.entities}</td>
                            <td className="px-4 py-3 text-gray-300 font-mono text-right">{ds.evidenceCount || (ds.entities > 0 ? ds.entities * 2 : 0)}</td>
                            <td className="px-4 py-3 text-right space-x-2">
                               <button className="text-gray-500 hover:text-[#D4AF37] transition-colors" onClick={() => {
                                   setExpandedPanel({ 
                                      title: \`文件预览：\${ds.name}\`, 
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
                                   setRightTab('evidence'); 
                                   setGraphMode('full'); 
                                   toast('已定位到该数据源关联证据', 'success');
                               }} title="关联图谱">关联图谱</button>
                               <button className="text-gray-500 hover:text-red-500 transition-colors" onClick={() => {
                                   if(window.confirm(\`确定要移除数据源 \${ds.name} 吗？相关图谱关联线索也将失效。\`)) {
                                       setDataSources(dataSources.filter((_,i) => i!==idx)); 
                                       setData((prev:any) => ({...prev, documents: (prev.documents||[]).filter((d:any) => d.fileName !== ds.name)}));
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
`;

c = c.replace('      <style dangerouslySetInnerHTML={{__html: `', modalCode + '\\n      <style dangerouslySetInnerHTML={{__html: `');

const replaceStr = `const newDocs = uploadFiles.map((fac, i) => ({ id: Date.now()+i, fileName: fac.name, originalName: fac.name, sourceType: 'EXT' }));
                         setData((prev:any) => ({...prev, documents: [...(prev.documents||[]), ...newDocs]}));
                         
                         const newDS = uploadFiles.map(fac => {
                            const ext = fac.name.split('.').pop()?.toUpperCase() || '未知';
                            return {
                               name: fac.name,
                               type: ext,
                               size: (fac.size / 1024 / 1024).toFixed(2) + ' MB',
                               source: "手动上传",
                               status: "解析中",
                               date: new Date().toLocaleDateString(),
                               entities: 0,
                               evidenceCount: 0
                            };
                         });
                         setDataSources((prev: any) => [...newDS, ...prev]);
                         
                         setShowUploadModal(false);
                         setUploadFiles([]);
                         toast("数据源上传成功，已加入当前项目证据库", "success");
                         setLogs((prev:any) => [{action:'SYSTEM_INFO', createdAt: new Date().toISOString(), details: '追加数据源已接入并完成解析'}, ...prev]);
                         
                         // simulate parsing completion
                         setTimeout(() => {
                             setDataSources((prev: any) => prev.map((ds: any) => ds.status === '解析中' ? {...ds, status: '已解析', entities: 15, evidenceCount: 32} : ds));
                             toast("追加数据源解析完成", "success");
                         }, 2000);`;


c = c.replace(
  /const newDocs = uploadFiles.map\(\(fac, i\) => \(\{[^]*?toast\("已通过模拟模式加入文档列表", "success"\);/m,
  replaceStr
);

fs.writeFileSync('src/pages/Workspace.tsx', c);
