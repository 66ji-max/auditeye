import { calculateProjectRisk, RISK_DIMENSIONS } from '../config/riskScoring.ts';

export const demoProjectDetailsMap: Record<string, any> = {
  '1001': {
    project: { id: '1001', name: "星巴达（大连）企业重组审查项目", scenario: "深度欺诈审查", createdAt: new Date().toISOString() },
    documents: [
      { id: 1, fileName: 'bank_statement.pdf', originalName: '1-星巴达2024对公流水.pdf', sourceType: '.pdf' },
      { id: 2, fileName: 'contract.pdf', originalName: '补充借款协议（密）.pdf', sourceType: '.pdf' },
      { id: 3, fileName: 'board.pdf', originalName: '2023年度董事会决议.docx', sourceType: '.docx' }
    ],
    audit_logs: [
      { action: 'INFO', createdAt: new Date(Date.now() - 300000).toISOString(), details: JSON.stringify({ message: '成功连接至全国企业信用信息公示系统进行实名校验。' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 280000).toISOString(), details: JSON.stringify({ message: '解析 14 份非结构化文书，共切分得到 402 个独立语块。' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 250000).toISOString(), details: JSON.stringify({ message: '利用图计算发现隐藏 4 层网络嵌套的实际控制人体系。' }) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 100000).toISOString(), details: JSON.stringify({ ruleName: '隐藏高管交叉控股 (R-MGMT-02)', ruleId: 'R-MGMT-02', dimension: 'relation', scoreImpact: 85, description: '检测到目标企业【星巴达】的边缘小微供应商【大连海润实业】其实际受益人为星巴达副总裁李某，涉嫌违规体外循环输送利益。', severity: 'high'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 90000).toISOString(), details: JSON.stringify({ ruleName: '注册地址重叠 (R-ADDR-01)', ruleId: 'R-ADDR-01', dimension: 'relation', scoreImpact: 50, description: '五家近期发生大规模贸易往来的“壳公司”均集中注册于同一地址（科技硅谷大厦3栋A座401），存在虚假虚开发票嫌疑。', severity: 'high'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 80000).toISOString(), details: JSON.stringify({ ruleName: '短期异常资金回流 (R-FUND-09)', ruleId: 'R-FUND-09', dimension: 'behavior', scoreImpact: 90, description: '流水记录显示多笔过千万大额资金在72小时内通过第三方通道绕回主体公司账户，典型粉饰报表与虚增营收特征。', severity: 'critical'}) }
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
  },
  '1002': {
    project: { id: '1002', name: "绿能科技IPO主体资金流穿透", scenario: "IPO审查", createdAt: new Date(Date.now() - 86400000).toISOString() },
    documents: [
      { id: 11, fileName: 'prospectus_v2.pdf', originalName: '绿能科技首次公开发行股票招股说明书(申报稿).pdf', sourceType: '.pdf' },
      { id: 12, fileName: 'subsidy_records.xlsx', originalName: '1-6月地方政府新能源补贴明细_密.xlsx', sourceType: '.xlsx' },
      { id: 13, fileName: 'bank_stream.csv', originalName: '核心基本户建行全年流水.csv', sourceType: '.csv' },
      { id: 14, fileName: 'top5_contracts.pdf', originalName: '前五大客户年度框架合同汇总.pdf', sourceType: '.pdf' }
    ],
    audit_logs: [
      { action: 'INFO', createdAt: new Date(Date.now() - 7200000).toISOString(), details: JSON.stringify({ message: '开始对【绿能科技】及其主要关联方进行穿透分析...' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 7100000).toISOString(), details: JSON.stringify({ message: '解析 32 份财务确认底稿与合同，提取结构化实体 45 个。' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 6800000).toISOString(), details: JSON.stringify({ message: '执行大额资金出入匹配检测逻辑。' }) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 6500000).toISOString(), details: JSON.stringify({ ruleName: '重大客户收入依赖及返流 (R-FIN-08)', ruleId: 'R-FIN-08', dimension: 'financial', scoreImpact: 80, description: '前五大客户之一的【远景新能源】与其实控人在报告期内存在通过保荐机构指定账户间接进行资金回转（约1200万）的情况，存在提前确认收入粉饰利润的嫌疑。', severity: 'critical'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 6000000).toISOString(), details: JSON.stringify({ ruleName: '政府补贴依赖度超红线 (R-FIN-03)', ruleId: 'R-FIN-03', dimension: 'financial', scoreImpact: 50, description: '扣非净利润中有近65%来源于地方新能源补贴，且该补贴政策将于明年一季度到期，面临极高持续盈利风险。', severity: 'medium'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 5000000).toISOString(), details: JSON.stringify({ ruleName: '隐层关联控制嫌疑', ruleId: 'R-MGMT-09', dimension: 'relation', scoreImpact: 40, description: '绿能科技部分非核心高管具有在主要供应商处兼职经历，风险需进一步核查。', severity: 'medium'}) }
    ],
    entities: [
      { type: 'COMPANY', name: '绿能科技(拟发行)', attributes: { registeredCapital: '1.2亿', address: '苏州工业园区' } },
      { type: 'COMPANY', name: '远景新能源(第一大客户)', attributes: { address: '常州国家高新区' } },
      { type: 'COMPANY', name: '汇通电池材料(主要供应商)', attributes: { address: '无锡惠山区' } },
      { type: 'PERSON', name: '赵宏图(实控人)', attributes: { role: '董事长' } },
      { type: 'COMPANY', name: '国泰君安(保荐机构)', attributes: { address: '上海' } },
      { type: 'COMPANY', name: '远景投资有限合伙', attributes: { address: '霍尔果斯' } }
    ],
    relationships: [
      { source: '绿能科技(拟发行)', target: '赵宏图(实控人)', relationType: 'CONTROL', evidenceSnippet: '招股书披露实控人持有公司表决权比例达68.5%。' },
      { source: '远景新能源(第一大客户)', target: '绿能科技(拟发行)', relationType: 'MAJOR_CLIENT', evidenceSnippet: '招股书披露该客户贡献了2023年度32%的营业额。' },
      { source: '绿能科技(拟发行)', target: '汇通电池材料(主要供应商)', relationType: 'SUPPLIER', evidenceSnippet: '框架采购协议，占年度采购比例达40%。' },
      { source: '远景投资有限合伙', target: '远景新能源(第一大客户)', relationType: 'CONTROL', evidenceSnippet: '企查查数据明确远景新能源由远景投资100%控股。' },
      { source: '赵宏图(实控人)', target: '远景投资有限合伙', relationType: 'HIDDEN_INTEREST', evidenceSnippet: '银行流水附言显示赵宏图个人账户向远景投资代持人转账1200万作为借款。' }
    ]
  },
  '1003': {
    project: { id: '1003', name: "鼎信资本年度审计关联方排查", scenario: "年度审计异常追踪", createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    documents: [
      { id: 21, fileName: 'board_reso_2023.pdf', originalName: '第一届董事会第三次决议(关联交易).pdf', sourceType: '.pdf' },
      { id: 22, fileName: 'investment_agreement.docx', originalName: 'A轮跟投协议_修正版.docx', sourceType: '.docx' },
      { id: 23, fileName: 'related_party_list.xlsx', originalName: '2023年鼎信资本关联方披露清单.xlsx', sourceType: '.xlsx' },
      { id: 24, fileName: 'audit_working_papers.pdf', originalName: '普华永道审计往来款底稿.pdf', sourceType: '.pdf' }
    ],
    audit_logs: [
      { action: 'INFO', createdAt: new Date(Date.now() - 150000).toISOString(), details: JSON.stringify({ message: '导入年审关联方披露清单与投资备案数据。' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 140000).toISOString(), details: JSON.stringify({ message: '核对投资组合内85家被投企业及其董监高体系。' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 120000).toISOString(), details: JSON.stringify({ message: '抽取【普华永道审计往来款底稿】中的资金往来记录进行比对。' }) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 90000).toISOString(), details: JSON.stringify({ ruleName: '未披露大额关联拆借 (R-AUDIT-04)', ruleId: 'R-AUDIT-04', dimension: 'behavior', scoreImpact: 50, description: '审计清单中存在一笔向【星光创投合伙企业】支出的3000万短期过桥借款，该合伙企业实质GP为鼎信资本CFO陈某，未在当年关联交易决议中明确披露。', severity: 'medium'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 60000).toISOString(), details: JSON.stringify({ ruleName: '高管违规跨层兼职 (R-MGMT-05)', ruleId: 'R-MGMT-05', dimension: 'relation', scoreImpact: 20, description: '投资总监王某在旗下三家被投企业担任执行董事且领取薪酬，违反内部利益冲突豁免条款。', severity: 'low'}) }
    ],
    entities: [
      { type: 'COMPANY', name: '鼎信资本控股', attributes: { registeredCapital: '10亿', address: '深圳南山区' } },
      { type: 'PERSON', name: '陈建国 (CFO)', attributes: { role: '财务中心负责人' } },
      { type: 'PERSON', name: '王敏 (投资总监)', attributes: { role: '高管' } },
      { type: 'COMPANY', name: '星光创投合伙企业', attributes: { address: '前海深港合作区' } },
      { type: 'COMPANY', name: '智芯科技(被投企业)', attributes: { address: '东莞松山湖' } },
      { type: 'COMPANY', name: '云联医疗(被投企业)', attributes: { address: '广州生物岛' } },
      { type: 'COMPANY', name: '普华永道中天', attributes: { address: '深圳前海' } }
    ],
    relationships: [
      { source: '鼎信资本控股', target: '陈建国 (CFO)', relationType: 'EXECUTIVE', evidenceSnippet: '高管花名册与工资单。' },
      { source: '鼎信资本控股', target: '王敏 (投资总监)', relationType: 'EXECUTIVE', evidenceSnippet: '人事任免红头文件。' },
      { source: '鼎信资本控股', target: '智芯科技(被投企业)', relationType: 'INVESTOR', evidenceSnippet: '持股25%，派驻董事。' },
      { source: '鼎信资本控股', target: '云联医疗(被投企业)', relationType: 'INVESTOR', evidenceSnippet: '跟投项目，持股5%。' },
      { source: '陈建国 (CFO)', target: '星光创投合伙企业', relationType: 'ACTUAL_GP', evidenceSnippet: '工商底稿显示陈某持有该GP实体99%份额。' },
      { source: '鼎信资本控股', target: '星光创投合伙企业', relationType: 'FUND_TRANSFER', evidenceSnippet: '底稿记录借款项3000万，附言“过桥资金”。' },
      { source: '王敏 (投资总监)', target: '智芯科技(被投企业)', relationType: 'DUAL_EMPLOYMENT', evidenceSnippet: '同时签署两份劳动/劳务合同。' },
      { source: '王敏 (投资总监)', target: '云联医疗(被投企业)', relationType: 'DUAL_EMPLOYMENT', evidenceSnippet: '在董事会兼任外部薪酬专员。' }
    ]
  },
  '1004': {
    project: { id: '1004', name: "华泰置业烂尾楼资金抽逃协查", scenario: "内部反欺诈审查", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    documents: [
      { id: 31, fileName: 'contract_sub.pdf', originalName: '君汇名城土方工程分包合同.pdf', sourceType: '.pdf' },
      { id: 32, fileName: 'approval_flow.pdf', originalName: '工程款支付节点OA审批流出件.pdf', sourceType: '.pdf' },
      { id: 33, fileName: 'funds_ledger.xlsx', originalName: '预售资金监管专户流水账单.xlsx', sourceType: '.xlsx' },
      { id: 34, fileName: 'suppliers_list.csv', originalName: '华南区域入库供应商清单及资质评级.csv', sourceType: '.csv' },
      { id: 35, fileName: 'bidding_docs.docx', originalName: '13标段围标询价单底稿.docx', sourceType: '.docx' }
    ],
    audit_logs: [
      { action: 'INFO', createdAt: new Date(Date.now() - 800000).toISOString(), details: JSON.stringify({ message: '载入【君汇名城】工程专项账户资金出入记录及预售款监管数据。' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 750000).toISOString(), details: JSON.stringify({ message: 'NLP解析工程款审批流、监理签名及施工支付节点明细...' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 600000).toISOString(), details: JSON.stringify({ message: '触发全量围标清洗及关系人比对脚本。' }) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 500000).toISOString(), details: JSON.stringify({ ruleName: '预售资金违规挪用 (R-REAL-01)', ruleId: 'R-REAL-01', dimension: 'behavior', scoreImpact: 100, description: '发现累计1.2亿预售款在进入监管账户后48小时内，以“主体土建工程预付款”名义超额支付给总包【中建九局】，总包随后即划转入体外的材料贸易空壳公司。', severity: 'critical'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 450000).toISOString(), details: JSON.stringify({ ruleName: '重大项目舞弊与利益输送 (R-FRAUD-09)', ruleId: 'R-FRAUD-09', dimension: 'relation', scoreImpact: 85, description: '土方工程分包商【广州鼎盛沙石】的实际控制人与其项目的开发工程总监刘某存在直系亲属关系，且该分包商资质评级D级却连续中标。', severity: 'critical'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 400000).toISOString(), details: JSON.stringify({ ruleName: '工程节点假审签 (R-DOC-03)', ruleId: 'R-DOC-03', dimension: 'behavior', scoreImpact: 35, description: '识别到第三期工程款请款单上的监理签审笔迹及时间与施工日志严重悖离。', severity: 'high'}) }
    ],
    entities: [
      { type: 'COMPANY', name: '华泰置业项目公司', attributes: { registeredCapital: '5亿', address: '广州天河' } },
      { type: 'COMPANY', name: '中建九局(总包)', attributes: { address: '北京' } },
      { type: 'COMPANY', name: '广州鼎盛沙石(分包)', attributes: { address: '广州番禺某民房' } },
      { type: 'COMPANY', name: '监管银行(建行)', attributes: { address: '广州分行' } },
      { type: 'PERSON', name: '刘建明 (工程总监)', attributes: { role: '开发项目负责人' } },
      { type: 'PERSON', name: '刘浩 (鼎盛沙石实控)', attributes: { role: '法定代表人' } },
      { type: 'COMPANY', name: '鑫源建材贸易(空壳)', attributes: { address: '珠海横琴' } },
      { type: 'PERSON', name: '陈工 (独立监理)', attributes: { role: '监理组长' } }
    ],
    relationships: [
      { source: '华泰置业项目公司', target: '监管银行(建行)', relationType: 'ESCROW_ACCOUNT', evidenceSnippet: '预售资金监管三方协议。' },
      { source: '监管银行(建行)', target: '中建九局(总包)', relationType: 'FUND_TRANSFER', evidenceSnippet: '专户资金划拨记录，累计1.2亿。' },
      { source: '华泰置业项目公司', target: '刘建明 (工程总监)', relationType: 'EXECUTIVE', evidenceSnippet: 'OA系统组织架构，项目开发一部。' },
      { source: '广州鼎盛沙石(分包)', target: '刘浩 (鼎盛沙石实控)', relationType: 'LEGAL_REP', evidenceSnippet: '工商登记穿透。' },
      { source: '刘建明 (工程总监)', target: '刘浩 (鼎盛沙石实控)', relationType: 'RELATIVES', evidenceSnippet: '户籍地址查询与关联人脸比对确认为父子关系。' },
      { source: '中建九局(总包)', target: '广州鼎盛沙石(分包)', relationType: 'SUBCONTRACTOR', evidenceSnippet: '工程承建合同第3标段。' },
      { source: '中建九局(总包)', target: '鑫源建材贸易(空壳)', relationType: 'FUND_TRANSFER', evidenceSnippet: '收取工程款后立即打散转入该空壳建材公司虚列成本。' },
      { source: '陈工 (独立监理)', target: '中建九局(总包)', relationType: 'FORGED_SIGNATURE', evidenceSnippet: 'AI比对查明关键节点工程进度确认单签名系总包方施工员代签。' }
    ]
  }
};

// Initialize dynamic risk calculations
Object.values(demoProjectDetailsMap).forEach(detail => {
  const ruleHits = detail.audit_logs
    .filter((l: any) => l.action === 'RED_FLAG')
    .map((l: any) => JSON.parse(l.details));
  
  const riskResult = calculateProjectRisk(ruleHits);
  
  detail.project.riskScore = riskResult.totalScore;
  detail.project.riskLevel = riskResult.level;
  detail.project.dimensionScores = riskResult.dimensionScores;
});

export const mockProjects = [
  { id: 1001, name: "星巴达（大连）企业重组审查项目", scenario: "深度欺诈审查", riskScore: demoProjectDetailsMap['1001'].project.riskScore, riskLevel: demoProjectDetailsMap['1001'].project.riskLevel, docCount: 14, createdAt: demoProjectDetailsMap['1001'].project.createdAt },
  { id: 1002, name: "绿能科技IPO主体资金流穿透", scenario: "IPO审查", riskScore: demoProjectDetailsMap['1002'].project.riskScore, riskLevel: demoProjectDetailsMap['1002'].project.riskLevel, docCount: 32, createdAt: demoProjectDetailsMap['1002'].project.createdAt },
  { id: 1003, name: "鼎信资本年度审计关联方排查", scenario: "年度审计异常追踪", riskScore: demoProjectDetailsMap['1003'].project.riskScore, riskLevel: demoProjectDetailsMap['1003'].project.riskLevel, docCount: 8, createdAt: demoProjectDetailsMap['1003'].project.createdAt },
  { id: 1004, name: "华泰置业烂尾楼资金抽逃协查", scenario: "内部反欺诈审查", riskScore: demoProjectDetailsMap['1004'].project.riskScore, riskLevel: demoProjectDetailsMap['1004'].project.riskLevel, docCount: 105, createdAt: demoProjectDetailsMap['1004'].project.createdAt },
];

// mock data constants end around line 191
// Note: createNewMockProject has been removed. All new projects MUST be created via Neon DB.

export const getMockProjectDetail = (id: string | number) => {
  const projectId = String(id);
  // Find project or return null to trigger 404
  return demoProjectDetailsMap[projectId] || null;
};

export const mockRules = [
  { id: 'R-ADDR-01', name: '高密聚类注册地址重叠', category: RISK_DIMENSIONS.relation.name, weight: 50, status: 'enabled', updatedAt: '2026-04-10', owner: '审计风控组' },
  { id: 'R-MGMT-02', name: '隐藏高管交叉控股/任职', category: RISK_DIMENSIONS.relation.name, weight: 85, status: 'enabled', updatedAt: '2026-04-12', owner: '审计风控组' },
  { id: 'R-FUND-09', name: '短期异常资金回路 (72h内)', category: RISK_DIMENSIONS.behavior.name, weight: 90, status: 'enabled', updatedAt: '2026-04-15', owner: '资金合规组' },
  { id: 'R-TEND-04', name: '供应商与员工电话/邮箱重叠', category: RISK_DIMENSIONS.behavior.name, weight: 35, status: 'enabled', updatedAt: '2026-03-22', owner: '采购合规组' },
  { id: 'R-FIN-01', name: '毛利率显著背离行业均值', category: RISK_DIMENSIONS.financial.name, weight: 15, status: 'disabled', updatedAt: '2026-01-05', owner: '数据模型组' }
];

export const mockKb = [
  { id: 'KB-2026-X1', name: '大连星巴达重组资产评估补充协议.pdf', type: 'PDF', status: '已解析', chunks: 145, entities: 22, date: '2026-04-18' },
  { id: 'KB-2026-X2', name: '2024年供应商尽职调查(海润实业).docx', type: 'Word', status: '已解析', chunks: 89, entities: 15, date: '2026-04-18' },
  { id: 'KB-2026-X3', name: '招行银企直联流水明细 (30天).xlsx', type: 'Excel', status: '提取中...', chunks: '-', entities: '-', date: '2026-04-19' },
  { id: 'KB-2026-X4', name: '高层核心治理人员任免决议汇编.pdf', type: 'PDF', status: '已解析', chunks: 204, entities: 41, date: '2026-04-15' },
  { id: 'KB-2026-X5', name: '往来邮件存档_财务总监部.pst', type: 'Email', status: '排队中', chunks: '-', entities: '-', date: '2026-04-19' },
];
