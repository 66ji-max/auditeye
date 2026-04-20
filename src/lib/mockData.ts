export const mockProjects = [
  { id: 1001, name: "星巴达（大连）企业重组审查项目", scenario: "深度欺诈审查", riskScore: 92, docCount: 14, createdAt: new Date().toISOString() },
  { id: 1002, name: "绿能科技IPO主体资金流穿透", scenario: "IPO审查", riskScore: 45, docCount: 32, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 1003, name: "鼎信资本年度审计关联方排查", scenario: "年度审计异常追踪", riskScore: 12, docCount: 8, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 1004, name: "华泰置业烂尾楼资金抽逃协查", scenario: "内部反欺诈审查", riskScore: 99, docCount: 105, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
];

export const getMockProjectDetail = (id: string | number) => ({
  project: { id, name: "星巴达（大连）企业重组审查项目", scenario: "深度欺诈审查", riskScore: 92, createdAt: new Date().toISOString() },
  documents: [
    { id: 1, fileName: 'bank_statement.pdf', originalName: '1-星巴达2024对公流水.pdf', sourceType: '.pdf' },
    { id: 2, fileName: 'contract.pdf', originalName: '补充借款协议（密）.pdf', sourceType: '.pdf' },
    { id: 3, fileName: 'board.pdf', originalName: '2023年度董事会决议.docx', sourceType: '.docx' }
  ],
  audit_logs: [
    { action: 'INFO', createdAt: new Date(Date.now() - 300000).toISOString(), details: JSON.stringify({ message: '成功连接至全国企业信用信息公示系统进行实名校验。' }) },
    { action: 'INFO', createdAt: new Date(Date.now() - 280000).toISOString(), details: JSON.stringify({ message: '解析 14 份非结构化文书，共切分得到 402 个独立语块。' }) },
    { action: 'INFO', createdAt: new Date(Date.now() - 250000).toISOString(), details: JSON.stringify({ message: '利用图计算发现隐藏 4 层网络嵌套的实际控制人体系。' }) },
    { action: 'RED_FLAG', createdAt: new Date(Date.now() - 100000).toISOString(), details: JSON.stringify({ ruleName: '隐藏高管交叉控股 (R-MGMT-02)', ruleId: 'R-MGMT-02', scoreImpact: 35, description: '检测到目标企业【星巴达】的边缘小微供应商【大连海润实业】其实际受益人为星巴达副总裁李某，涉嫌违规体外循环输送利益。', severity: 'high'}) },
    { action: 'RED_FLAG', createdAt: new Date(Date.now() - 90000).toISOString(), details: JSON.stringify({ ruleName: '注册地址重叠 (R-ADDR-01)', ruleId: 'R-ADDR-01', scoreImpact: 20, description: '五家近期发生大规模贸易往来的“壳公司”均集中注册于同一地址（科技硅谷大厦3栋A座401），存在虚假虚开发票嫌疑。', severity: 'high'}) },
    { action: 'RED_FLAG', createdAt: new Date(Date.now() - 80000).toISOString(), details: JSON.stringify({ ruleName: '短期异常资金回流 (R-FUND-09)', ruleId: 'R-FUND-09', scoreImpact: 37, description: '流水记录显示多笔过千万大额资金在72小时内通过第三方通道绕回主体公司账户，典型粉饰报表与虚增营收特征。', severity: 'critical'}) }
  ],
  entities: [
    { type: 'COMPANY', name: '星巴达(大连)科技', attributes: { registeredCapital: '5000万', address: '高新园区科技硅谷大厦1栋' } },
    { type: 'COMPANY', name: '大连海润实业', attributes: { address: '科技硅谷大厦3栋A座401' } },
    { type: 'COMPANY', name: '创通物流', attributes: { address: '科技硅谷大厦3栋A座401' } },
    { type: 'COMPANY', name: '鼎力贸易', attributes: { address: '科技硅谷大厦3栋A座401' } },
    { type: 'COMPANY', name: '瑞博咨询服务', attributes: { address: '科技硅谷大厦3栋A座401' } },
    { type: 'COMPANY', name: '万恒资产', attributes: { address: '科技硅谷大厦3栋A座401' } },
    { type: 'PERSON', name: '李明 (副总裁)', attributes: { role: '执行董事' } },
    { type: 'PERSON', name: '张伟 (CEO)', attributes: { role: '法定代表人' } },
    { type: 'COMPANY', name: '离岸开曼星巴达基金', attributes: { address: 'Cayman Islands' } },
    { type: 'PERSON', name: '王强 (财务总监)', attributes: { role: 'CFO' } },
    { type: 'COMPANY', name: '审计核准第三方', attributes: { address: '北京东城区' } }
  ],
  relationships: [
    { source: '星巴达(大连)科技', target: '张伟 (CEO)', relationType: 'LEGAL_REP', evidenceSnippet: '工商登记信息明确张伟自2021年起担任法定代表人。' },
    { source: '星巴达(大连)科技', target: '王强 (财务总监)', relationType: 'EXECUTIVE', evidenceSnippet: '人事档案与年度财报批露。' },
    { source: '星巴达(大连)科技', target: '李明 (副总裁)', relationType: 'EXECUTIVE', evidenceSnippet: '公司组织架构图第4页所示。' },
    { source: '大连海润实业', target: '李明 (副总裁)', relationType: 'HIGH_RISK_OVERLAP', evidenceSnippet: '海润实业的最终穿透受益人协议指向李某的配偶，形成实质利益共同体。' },
    { source: '创通物流', target: '大连海润实业', relationType: 'FUND_TRANSFER', evidenceSnippet: '对公流水第120页，金额2000万，附言"技术服务费"。' },
    { source: '星巴达(大连)科技', target: '大连海润实业', relationType: 'HIGH_RISK_OVERLAP', evidenceSnippet: '年报显示发生重组期间采购额暴增4000%，触发反舞弊拦截体系。' },
    { source: '鼎力贸易', target: '瑞博咨询服务', relationType: 'ADDRESS_SHARED', evidenceSnippet: '两家公司注册地完全相同，连工位号均一致。' },
    { source: '瑞博咨询服务', target: '万恒资产', relationType: 'ADDRESS_SHARED', evidenceSnippet: '营业执照注册地一致。' },
    { source: '万恒资产', target: '鼎力贸易', relationType: 'ADDRESS_SHARED', evidenceSnippet: '企查查数据反馈为关联聚类地址。' },
    { source: '离岸开曼星巴达基金', target: '张伟 (CEO)', relationType: 'SHAREHOLDER', evidenceSnippet: '红筹架构招股书附件披露持有45%股权。' },
    { source: '星巴达(大连)科技', target: '创通物流', relationType: 'SUSPICIOUS_TRADE', evidenceSnippet: '三方凭证比对无法支持真实的物流发生场景。' }
  ]
});

export const mockRules = [
  { id: 'R-ADDR-01', name: '高密聚类注册地址重叠', category: '关联控制', weight: 20, status: 'enabled', updatedAt: '2026-04-10', owner: '审计风控组' },
  { id: 'R-MGMT-02', name: '隐藏高管交叉控股/任职', category: '关联控制', weight: 40, status: 'enabled', updatedAt: '2026-04-12', owner: '审计风控组' },
  { id: 'R-FUND-09', name: '短期异常资金回路 (72h内)', category: '资金洗售', weight: 50, status: 'enabled', updatedAt: '2026-04-15', owner: '资金合规组' },
  { id: 'R-TEND-04', name: '供应商与员工电话/邮箱重叠', category: '舞弊围标', weight: 35, status: 'enabled', updatedAt: '2026-03-22', owner: '采购合规组' },
  { id: 'R-FIN-01', name: '毛利率显著背离行业均值', category: '财务造假', weight: 15, status: 'disabled', updatedAt: '2026-01-05', owner: '数据模型组' }
];

export const mockKb = [
  { id: 'KB-2026-X1', name: '大连星巴达重组资产评估补充协议.pdf', type: 'PDF', status: '已解析', chunks: 145, entities: 22, date: '2026-04-18' },
  { id: 'KB-2026-X2', name: '2024年供应商尽职调查(海润实业).docx', type: 'Word', status: '已解析', chunks: 89, entities: 15, date: '2026-04-18' },
  { id: 'KB-2026-X3', name: '招行银企直联流水明细 (30天).xlsx', type: 'Excel', status: '提取中...', chunks: '-', entities: '-', date: '2026-04-19' },
  { id: 'KB-2026-X4', name: '高层核心治理人员任免决议汇编.pdf', type: 'PDF', status: '已解析', chunks: 204, entities: 41, date: '2026-04-15' },
  { id: 'KB-2026-X5', name: '往来邮件存档_财务总监部.pst', type: 'Email', status: '排队中', chunks: '-', entities: '-', date: '2026-04-19' },
];
