import { DEFAULT_INDUSTRY_WEIGHTS, INDUSTRY_TYPES } from '../config/industryWeights.ts';
import { 
  calculateProjectRisk, 
  RISK_DIMENSIONS,
  calculateSubIndices,
  calculateZValue,
  calculateRiskProbability,
  getRiskLevelByProbability,
  GLOBAL_RISK_WEIGHTS
} from '../config/riskScoring.ts';

function buildRiskScoring(rawFeatures: any, conclusion: string, warning?: string, industryType: string = "general") {
  const subIndices = calculateSubIndices(rawFeatures);
  const indWeights = DEFAULT_INDUSTRY_WEIGHTS[industryType] || DEFAULT_INDUSTRY_WEIGHTS['general'];
  const zValue = calculateZValue(subIndices, indWeights);
  const probability = calculateRiskProbability(zValue);
  const probabilityPercent = Math.round(Number((probability * 100).toFixed(1)));
  const riskLevel = getRiskLevelByProbability(probability);
  
  return {
    rawFeatures,
    subIndices,
    zValue,
    probability,
    probabilityPercent,
    riskLevel,
    conclusion,
    warning,
    threshold: 75,
    globalWeights: indWeights,
    industryType,
    industryName: INDUSTRY_TYPES[industryType as keyof typeof INDUSTRY_TYPES]?.label || "通用审计模型",
    weightSource: "expert_prior"
  };
}

export const demoProjectDetailsMap: Record<string, any> = {
  '1001': {
    project: { id: '1001', name: "发行人关联交易智能核查项目", industryType: "ipo", scenario: "IPO关联交易核查", createdAt: new Date().toISOString() },
    documents: [
      { id: 1, fileName: 'bank_statement.pdf', originalName: '1-登XX集团对公流水.pdf', sourceType: '.pdf' },
      { id: 2, fileName: 'contract.pdf', originalName: '与旺XX公司历史采购框架.pdf', sourceType: '.pdf' },
      { id: 3, fileName: 'board.pdf', originalName: '工商变更归档-山东片区.docx', sourceType: '.docx' }
    ],
    audit_logs: [
      { action: 'INFO', createdAt: new Date(Date.now() - 300000).toISOString(), details: JSON.stringify({ message: '成功接入公开工商信息与商业征信数据。' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 280000).toISOString(), details: JSON.stringify({ message: '提取企业曾用名、股东、变更记录、联系方式并分析完毕。' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 250000).toISOString(), details: JSON.stringify({ message: '执行股权穿透与最终受益人识别，比对境内外主体联系方式。' }) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 100000).toISOString(), details: JSON.stringify({ ruleName: '实控人/最终受益人同源', ruleId: 'R-ID-01', dimension: 'identity', scoreImpact: 25, description: '最终控制人均指向“欧XX”，交易对手实控人与发行人属同一人控制。', severity: 'critical'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 90000).toISOString(), details: JSON.stringify({ ruleName: '多层股权嵌套控制', ruleId: 'R-ID-02', dimension: 'identity', scoreImpact: 15, description: '系统发现4级控股结构：欧XX → 广州富XX（90%）→ 肇庆达XX（80%）→ 山东富XX（50%）→ 山东旺XX汽车零部件有限公司（100%）。涉及广东到山东的跨地域控股。', severity: 'high'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 85000).toISOString(), details: JSON.stringify({ ruleName: '曾用名字号关联', ruleId: 'R-ID-03', dimension: 'identity', scoreImpact: 8, description: '交易对手曾用名为“山东登XX汽配销售有限公司”，不仅包含发行人核心字号，且在申报期前后突击变更为现名，疑似弱化关联痕迹。', severity: 'high'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 80000).toISOString(), details: JSON.stringify({ ruleName: '单一依赖 / 突击交易', ruleId: 'R-BEH-01', dimension: 'behavior', scoreImpact: 29, description: '识别申报期内异常交易增长：2010年115万，至2012年突击增至770.13万，金额连年暴涨。', severity: 'critical'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 75000).toISOString(), details: JSON.stringify({ ruleName: '外围关联佐证/单据同源', ruleId: 'R-CIRC-01', dimension: 'circumstantial', scoreImpact: 10, description: '与境外关联主体（美国登X）多维比对发现：传真、联系地址高度一致，且装箱单模板与制作人员同源。', severity: 'high'}) }
    ],
    entities: [
      { type: 'COMPANY', name: '登XX发行主体', attributes: { registeredCapital: '5亿', address: '总部园区' } },
      { type: 'COMPANY', name: '山东旺XX汽车零部件有限公司', attributes: { address: '山东特定园区', label: '现名' } },
      { type: 'COMPANY', name: '山东登XX汽配销售有限公司', attributes: { address: '山东特定园区', label: '曾用名' } },
      { type: 'COMPANY', name: '山东富XX', attributes: { address: '山东' } },
      { type: 'COMPANY', name: '肇庆达XX', attributes: { address: '肇庆' } },
      { type: 'COMPANY', name: '广州富XX', attributes: { address: '广州' } },
      { type: 'PERSON', name: '欧XX', attributes: { role: '最终自然人/实控人' } },
      { type: 'COMPANY', name: '美国登X', attributes: { address: 'USA', label: '境外关联主体' } }
    ],
    relationships: [
      { source: '山东旺XX汽车零部件有限公司', target: '山东登XX汽配销售有限公司', relationType: 'FORMER_NAME', evidenceSnippet: '工商底稿显示企业于申报前发生更名。', evidenceSource: { documentName: "工商变更归档-山东片区.docx", page: "第 3 页", paragraph: "第 2 段", originalText: "工商变更记录显示，山东旺XX汽车零部件有限公司曾用名为山东登XX汽配销售有限公司，并于申报期前后完成企业名称变更。" } },
      { source: '山东富XX', target: '山东旺XX汽车零部件有限公司', relationType: 'HOLDING', evidenceSnippet: '持股 100%' },
      { source: '肇庆达XX', target: '山东富XX', relationType: 'HOLDING', evidenceSnippet: '持股 50%' },
      { source: '广州富XX', target: '肇庆达XX', relationType: 'HOLDING', evidenceSnippet: '持股 80%' },
      { source: '欧XX', target: '广州富XX', relationType: 'HOLDING', evidenceSnippet: '持股 90%', evidenceSource: { documentName: "工商变更归档-山东片区.docx", page: "第 12 页", paragraph: "第 4 段", originalText: "系统发现4级控股结构：欧XX → 广州富XX（90%）→ 肇庆达XX（80%）→ 山东富XX（50%）→ 山东旺XX汽车零部件有限公司（100%）。涉及广东到山东的跨地域控股。" } },
      { source: '欧XX', target: '登XX发行主体', relationType: 'ULTIMATE_CONTROLLER', evidenceSnippet: '最终控制人指向一致。', evidenceSource: { documentName: "招股说明书.pdf", page: "第 45 页", paragraph: "第 1 段", originalText: "发行人的最终控制人指向“欧XX”，交易对手实控人与发行人属同一人控制。" } },
      { source: '登XX发行主体', target: '美国登X', relationType: 'DOCUMENT_MATCH', evidenceSnippet: '联系方式与装箱单模板制作人一致。', evidenceSource: { documentName: "出口单据归档.pdf", page: "第 8 页", paragraph: "装箱单信息", originalText: "经过对该企业与境外主体（美国登X）多维比对发现：两者的传真、联系地址高度一致，且装箱单模板与制作人员同源。" } },
      { source: '登XX发行主体', target: '山东富XX', relationType: 'ABNORMAL_TRANSACTION', evidenceSnippet: '交易金额异常：2010年 96.39万，2011年 389.02万。', evidenceSource: { documentName: "1-登XX集团对公流水.pdf", page: "第 24 页", paragraph: "2010-2011 交易明细", originalText: "登XX发行主体与山东富XX之间的交易金额在报告期内存在异常：2010年实际开票金额为 96.39万，2011年飙升至 389.02万。" } },
      { source: '登XX发行主体', target: '山东旺XX汽车零部件有限公司', relationType: 'ABNORMAL_TRANSACTION', evidenceSnippet: '连年暴增：2012年突增至 770.13万。', evidenceSource: { documentName: "与旺XX公司历史采购框架.pdf", page: "第 2 页", paragraph: "附件清单", originalText: "交易明细表显示，发行人向山东旺XX相关采购金额在 2012 年快速上升至 770.13 万元，较前期金额出现异常陡增。" } },
      { source: '山东富XX', target: '广州富XX', relationType: 'BUSINESS_CROSSCHECK', evidenceSnippet: '【业务交叉查询】通过对“山东富XX与广州富XX”等主体进行历史单据比对，系统在300万份发票及合同底稿中，精准定位到其历史联系方式、联系传真及业务单据制作者存在高度重合（匹配信度：99.2%）。' }
    ],
    riskScoring: buildRiskScoring({identityNetwork: [
          {
            id: "x1a",
            label: "实控网重合度",
            value: 0.85,
            method: "Jaccard 相似度",
            evidence: "算法抓取“突击更名”及“海外主体高度相似”的事实。",
            explanation: "发行人与相关主体在实际控制网络中存在较高重合度。",
            subIndex: "X1",
            evidenceSource: { documentName: "工商变更归档-山东片区.docx", page: "第 3 页", paragraph: "第 2 段", originalText: "工商变更记录显示，山东旺XX汽车零部件有限公司曾用名为山东登XX汽配销售有限公司，并于申报期前后完成企业名称变更。" }
          },
          {
            id: "x1b",
            label: "控制链路层级",
            value: 0.90,
            method: "知识图谱最短路径",
            evidence: "图谱算法发现“4级跨地域逐层控股”。",
            explanation: "控制链路复杂，存在绕层控股和跨地域控制特征。",
            subIndex: "X1",
            evidenceSource: { documentName: "工商变更归档-山东片区.docx", page: "第 12 页", paragraph: "第 4 段", originalText: "系统发现4级控股结构：欧XX → 广州富XX（90%）→ 肇庆达XX（80%）→ 山东富XX（50%）→ 山东旺XX汽车零部件有限公司（100%）。涉及广东到山东的跨地域控股。" }
          },
          {
            id: "x1c",
            label: "高管流转频繁度",
            value: 0.00,
            method: "时间衰减二分图",
            evidence: "经查双方高管无交叉兼职，属于静默特征。",
            explanation: "高管维度未发现明显异常，因此该项不拉高风险。",
            subIndex: "X1",
            evidenceSource: { documentName: "高管及关联方名单.xlsx", page: "Sheet 1", paragraph: "名单比对", originalText: "在高管名单比对中，未发现发行人高级管理人员在相关交易对手处存在交叉任职或历史任职记录。" }
          }
        ],
        transactionAbnormality: [
          {
            id: "x2a",
            label: "空壳化概率",
            value: 0.95,
            method: "孤立森林 / NLP 对比",
            evidence: "NLP 对比发现传真、电话、装箱单模板完全一致，皮包公司特征极其恶劣。",
            explanation: "交易对手存在明显空壳化、皮包化特征，是最核心风险点之一。",
            subIndex: "X2",
            evidenceSource: { documentName: "出口单据归档.pdf", page: "第 8 页", paragraph: "装箱单信息", originalText: "NLP 对比结果显示，山东旺XX与境外主体在传真号码、联系电话、装箱单模板及制作人员字段上高度一致，疑似存在单据同源与空壳化交易对手特征。" }
          },
          {
            id: "x2b",
            label: "交易额陡峭度",
            value: 0.85,
            method: "时序斜率",
            evidence: "2012 年突击交易 770 万，曲线斜率极陡。",
            explanation: "交易额在短期内异常上升，显示出突击交易风险。",
            subIndex: "X2",
            evidenceSource: { documentName: "与旺XX公司历史采购框架.pdf", page: "第 2 页", paragraph: "附件清单", originalText: "交易明细表显示，发行人向山东旺XX相关采购金额在 2012 年快速上升至 770.13 万元，较前期金额出现异常陡增。" }
          },
          {
            id: "x2c",
            label: "定价偏离方差",
            value: 0.15,
            method: "Z-score",
            evidence: "毛利被刻意平滑，暂未发现明显定价异常。",
            explanation: "定价偏离维度暂未发现强异常，因此该项权重贡献较低。",
            subIndex: "X2",
            evidenceSource: { documentName: "毛利分析底稿.xlsx", page: "Sheet 2", paragraph: "定价分析", originalText: "对相关采购单价与市场公开报价比对后，暂未发现存在明显的高买低卖等定价异常情况，整体毛利率稳定。" }
          }
        ],
        externalTrace: [
          {
            id: "x3a",
            label: "利益绑定涉诉率",
            value: 0.20,
            method: "NLP 涉案金额 / 净资产",
            evidence: "仅存在零星小额诉讼。",
            explanation: "外围涉诉痕迹较弱，仅形成轻微风险提示。",
            subIndex: "X3",
            evidenceSource: { documentName: "天眼查诉讼记录导出.csv", page: "全文档", paragraph: "诉讼汇总", originalText: "相关主体涉及的法律诉讼多为小额合同纠纷，涉案总金额占其净资产比例极低，暂未发现可能导致利益输送或资产转移的重大诉讼。" }
          },
          {
            id: "x3b",
            label: "资产异动频次",
            value: 0.20,
            method: "泊松分布异常低概率事件",
            evidence: "暂无强异常资产异动证据。",
            explanation: "暂未发现强异常资产异动，仅保留低强度外围风险。",
            subIndex: "X3",
            evidenceSource: { documentName: "资产评估报告.pdf", page: "第 15 页", paragraph: "资产变动说明", originalText: "报告期内，相关企业的核心资产及注册资本未发生频繁或异常的增减变动，资本运作相对静默。" }
          }
        ]}, "系统输出风险概率为 81.1%，超过 75% 高危阈值，说明该项目存在显著关联交易风险，需要进入底稿回溯和重点审计程序。", "高危预警", "ipo")
  },
  '1002': {
    project: { id: '1002', name: '大客户同源核查项目', industryType: 'ipo', scenario: 'IPO审查', createdAt: new Date().toISOString() },
    documents: [],
    audit_logs: [],
    entities: [],
    relationships: [],
    riskScoring: buildRiskScoring({
      identityNetwork: [{ id: 'x1a', label: '核心客户同源', value: 0.85, method: '知识图谱穿透', evidence: '共用代持主体', explanation: '严重违反独立性原则', subIndex: 'X1', evidenceSource: {documentName:'', page:'', paragraph:'', originalText:''} }],
      transactionAbnormality: [{ id: 'x2a', label: '资金回流', value: 0.9, method: '流水分析', evidence: '回流至实控人', explanation: '冲抵应收', subIndex: 'X2', evidenceSource: {documentName:'', page:'', paragraph:'', originalText:''} }],
      externalTrace: []
    }, '发现客户实控人实质受发行人实控网影响，且存在异常资金回流。', '高危预警', 'ipo')
  },
  '1003': {
    project: { id: '1003', name: '星光创投利益输送审查', industryType: 'financial_investment', scenario: '基金资管审计', createdAt: new Date().toISOString() },
    documents: [],
    audit_logs: [],
    entities: [],
    relationships: [],
    riskScoring: buildRiskScoring({
        identityNetwork: [{ id: 'x1a', label: '核心高管隐性控制', value: 0.85, method: '穿透比对', evidence: '星光创投GP为鼎信CFO陈建国', explanation: '控制体外平台', subIndex: 'X1', evidenceSource: {documentName:'', page:'', paragraph:'', originalText:''} }],
        transactionAbnormality: [{ id: 'x2a', label: '大额咨询费', value: 0.7, method: '时序分析', evidence: '投资前突击支付', explanation: '利益输送', subIndex: 'X2', evidenceSource: {documentName:'', page:'', paragraph:'', originalText:''} }],
        externalTrace: []
    }, '核心高管控制体外募资平台收受咨询费，构成利益冲突。', '高危预警', 'financial_investment')
  },
  '1004': {
    project: { id: '1004', name: '烂尾楼分包商反舞弊审查', industryType: 'real_estate_construction', scenario: '底层资产审查', createdAt: new Date().toISOString() },
    documents: [],
    audit_logs: [],
    entities: [],
    relationships: [],
    riskScoring: buildRiskScoring({
        identityNetwork: [{ id: 'x1a', label: '总监亲属关联', value: 0.95, method: '户籍图谱', evidence: '总监与分包商实控人为父子', explanation: '直系亲属裙带', subIndex: 'X1', evidenceSource: {documentName:'', page:'', paragraph:'', originalText:''} }],
        transactionAbnormality: [{ id: 'x2a', label: '资金快速转移', value: 0.9, method: '流水追踪', evidence: '工程款打入后迅速分散转移', explanation: '洗钱特征', subIndex: 'X2', evidenceSource: {documentName:'', page:'', paragraph:'', originalText:''} }],
        externalTrace: [{ id: 'x3a', label: '签名造假', value: 0.8, method: '笔迹比对', evidence: '伪造监理进度审核签字', explanation: '合规造假', subIndex: 'X3', evidenceSource: {documentName:'', page:'', paragraph:'', originalText:''} }]
    }, '发包核心与分包商存在直系亲属，存在工程款抽逃和进度造假。', '极高风险', 'real_estate_construction')
  }
};

if (demoProjectDetailsMap['1001'] && demoProjectDetailsMap['1001'].riskScoring) {
  demoProjectDetailsMap['1001'].riskScoring.probabilityPercent = 81;
  demoProjectDetailsMap['1001'].riskScoring.probability = 0.81;
}

export function getMockProjectDetail(id: string) {
  return demoProjectDetailsMap[id] || demoProjectDetailsMap['1001'];
}

export function getAllMockProjects() {
  return Object.values(demoProjectDetailsMap).map(d => d.project);
}


export const mockProjects = Object.values(demoProjectDetailsMap).map(d => ({...d.project, riskScore: d.riskScoring?.probabilityPercent, riskLevel: d.riskScoring?.riskLevel}));
export function getMockProjects() {
  return mockProjects;
}


export const mockRules = [
  { id: 'r1', name: '实控人同源网络分析', type: '身份关联', weight: 8.5, status: 'enabled', updatedAt: '2026-05-30', description: '基于图数据计算关联人员最短路径长度与Jaccard重合度。' },
  { id: 'r2', name: '空壳化指标聚合识别', type: '空壳检测', weight: 9.0, status: 'enabled', updatedAt: '2026-05-31', description: '综合运用大模型对比装箱单、发票、社保人数。' }
];

export const mockKb = [
  { id: 'k1', title: '上市公司违规披露案例库', category: '处罚通报', date: '2026-04-12', extract: '监管局于近年发现多起隐匿关联方交易案件...' }
];
