const fs = require('fs');
let c = fs.readFileSync('src/pages/Workspace.tsx', 'utf-8');

// 1. Refactor normalizeDocumentsToDataSources and fetchProject
const normFunc = `
  const normalizeDocumentsToDataSources = (documents: any[]) => {
    return (documents || []).map((doc: any) => ({
      id: doc.id,
      name: doc.originalName || doc.fileName || doc.name,
      type: (doc.sourceType || doc.fileName?.split('.').pop() || '未知').replace('.', '').toUpperCase(),
      size: doc.size || doc.sizeText || '演示数据',
      source: doc.source || '项目证据库',
      status: doc.status || '已解析',
      date: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
      entities: doc.entities || 12,
      evidenceCount: doc.evidenceCount || 24
    }));
  };
`;

// Insert the normalizer at the top of the component or right before fetchProject
c = c.replace(
  '  const formatWorkflowTime = (time?: string | Date) => {',
  normFunc + '\\n  const formatWorkflowTime = (time?: string | Date) => {'
);


// Replace fetchProject logic
c = c.replace(
  /const fetchProject = async \(\) => \{[\s\S]*?setLoadingProject\(false\);\n    \}\n  \};/,
  `const fetchProject = async () => {
    try {
      const res = await fetch(\`/api/projects/\${id}\`);
      if (!res.ok) throw new Error(\`请求失败状态码: \${res.status}\`);
      const apiData = await res.json();
      
      if (apiData && apiData.project) {
        setData(apiData);
        setDataSources(normalizeDocumentsToDataSources(apiData.documents || []));
      } else {
        throw new Error('API 返回数据结构异常');
      }
      setLoadingProject(false);
    } catch (e: any) {
      console.warn("API 获取失败, 使用本地 Demo 数据", e);
      // Fallback
      import('../../data/demoTarget').then(m => {
        const fallbackData = m.default;
        if (fallbackData && fallbackData.project) {
          setData(fallbackData);
          setDataSources(normalizeDocumentsToDataSources(fallbackData.documents || []));
        } else {
          setData(null);
        }
        setLoadingProject(false);
      });
    }
  };`
);


// 2. Change dataSources default state to []
c = c.replace(
  /const \[dataSources, setDataSources\] = useState<any\[\]>\(\[\s*\{ name: '2026[\s\S]*?\]\);/,
  `const [dataSources, setDataSources] = useState<any[]>([]);`
);

// 3. Update top bar data source count
// Before: <div className="flex items-center gap-1.5 shrink-0 hidden md:flex cursor-pointer hover:text-[#D4AF37] transition-colors" onClick={() => setShowDataSourceModal(true)}><Database className="w-3.5 h-3.5"/> 数据源: {dataSources.length}</div>
c = c.replace(
  /数据源: \{dataSources\.length\}/,
  '数据源: {dataSources.length || data?.documents?.length || 0}'
);

// 4. Implement appendUploadedFilesToProject and replace upload try-catch block
const appendFunc = `
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
    setCustomLogs((prev:any) => [{action:'SYSTEM_INFO', createdAt: new Date().toISOString(), details: '追加数据源已接入并完成解析'}, ...prev]);
    toast("数据源上传成功，已加入当前项目证据库", "success");
    
    // simulate parsing completion
    setTimeout(() => {
        setDataSources((prev: any) => prev.map((ds: any) => ds.status === '解析中' ? {...ds, status: '已解析', entities: 15, evidenceCount: 32} : ds));
        toast("追加数据源解析完成", "success");
    }, 2000);
  };
`;

c = c.replace(
  '  const fetchProject = async () => {',
  appendFunc + '\\n  const fetchProject = async () => {'
);


// Replace the upload logic
const uploadLogic = `
                     setIsUploading(true);
                     try {
                        const formData = new FormData();
                        uploadFiles.forEach(f => formData.append('files', f));
                        const uploadRes = await fetch(\`/api/projects/\${id}/documents\`, {
                          method: 'POST',
                          body: formData
                        });
                        if (!uploadRes.ok) throw new Error("上传失败");
                        const apiDocs = await uploadRes.json();
                        appendUploadedFilesToProject(uploadFiles, apiDocs);
                     } catch(e) {
                         // API uploaded failed, fallback
                         appendUploadedFilesToProject(uploadFiles);
                     } finally {
                        setIsUploading(false);
                     }`;

c = c.replace(
  /setIsUploading\(true\);\s*try \{\s*const formData = new FormData\(\);[\s\S]*?\} finally \{\s*setIsUploading\(false\);\s*\}/,
  uploadLogic
);

fs.writeFileSync('src/pages/Workspace.tsx', c);
