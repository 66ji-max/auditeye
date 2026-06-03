import { 
  calculateProjectRisk, 
  RISK_DIMENSIONS,
  calculateSubIndices,
  calculateZValue,
  calculateRiskProbability,
  getRiskLevelByProbability,
  GLOBAL_RISK_WEIGHTS
} from '../config/riskScoring.ts';

function buildRiskScoring(rawFeatures: any, conclusion: string, warning?: string) {
  const subIndices = calculateSubIndices(rawFeatures);
  const zValue = calculateZValue(subIndices);
  const probability = calculateRiskProbability(zValue);
  const probabilityPercent = Number((probability * 100).toFixed(1));
  const riskLevel = getRiskLevelByProbability(probability);

  return {
    rawFeatures,
    subIndices: {
      X1: Number(subIndices.X1.toFixed(2)),
      X2: Number(subIndices.X2.toFixed(2)),
      X3: Number(subIndices.X3.toFixed(2))
    },
    globalWeights: GLOBAL_RISK_WEIGHTS,
    zValue: Number(zValue.toFixed(4)),
    probability: Number(probability.toFixed(3)),
    probabilityPercent,
    threshold: 75,
    riskLevel,
    warning,
    conclusion
  };
}

export const demoProjectDetailsMap: Record<string, any> = {
  '1001': {
    project: { id: '1001', name: "发行人关联交易智能核查项目", scenario: "IPO关联交易核查", createdAt: new Date().toISOString() },
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
    riskScoring: {
      rawFeatures: {
        identityNetwork: [
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
        ]
      },
      localWeights: {
        X1: { x1a: 0.45, x1b: 0.45, x1c: 0.10 },
        X2: { x2a: 0.40, x2b: 0.40, x2c: 0.20 },
        X3: { x3a: 0.50, x3b: 0.50 }
      },
      globalWeights: {
        W1: 2.2,
        W2: 3.5,
        W3: 0.5,
        b: -3.0
      },
      subIndices: {
        X1: 0.7875,
        X2: 0.75,
        X3: 0.20
      },
      zValue: 1.4575,
      probability: 0.811,
      probabilityPercent: 81.1,
      threshold: 75,
      riskLevel: "极高风险",
      warning: "高危预警",
      triggeredActions: [
        "触发审计底稿回溯",
        "触发 RAG 证据回链"
      ],
      conclusion: "系统输出风险概率为 81.1%，超过 75% 高危阈值，说明该项目存在显著关联交易风险，需要进入底稿回溯和重点审计程序。"
    }
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
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 6500000).toISOString(), details: JSON.stringify({ ruleName: '重大客户收入依赖及返流 (R-FIN-08)', ruleId: 'R-FIN-08', dimension: 'circumstantial', scoreImpact: 80, description: '前五大客户之一的【远景新能源】与其实控人在报告期内存在通过保荐机构指定账户间接进行资金回转（约1200万）的情况，存在提前确认收入粉饰利润的嫌疑。', severity: 'critical'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 6000000).toISOString(), details: JSON.stringify({ ruleName: '政府补贴依赖度超红线 (R-FIN-03)', ruleId: 'R-FIN-03', dimension: 'circumstantial', scoreImpact: 50, description: '扣非净利润中有近65%来源于地方新能源补贴，且该补贴政策将于明年一季度到期，面临极高持续盈利风险。', severity: 'medium'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 5000000).toISOString(), details: JSON.stringify({ ruleName: '隐层关联控制嫌疑', ruleId: 'R-MGMT-09', dimension: 'identity', scoreImpact: 40, description: '绿能科技部分非核心高管具有在主要供应商处兼职经历，风险需进一步核查。', severity: 'medium'}) }
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
    ],
    riskScoring: buildRiskScoring({
      identityNetwork: [
        {
          id: "x1a", label: "实际控制人关联", value: 0.65, method: "知识图谱穿透",
          evidence: "赵宏图银行流水附言向远景投资代持人转账1200万。",
          explanation: "实控人存在与第一大客户相关的隐性资金往来，疑似存在代持或同源控制利益关系。",
          subIndex: "X1",
          evidenceSource: { documentName: "核心基本户建行全年流水.csv", page: "第1页", paragraph: "转账附言", originalText: "赵宏图个人账户向远景投资代持人转账1200万作为借款。" }
        },
        {
          id: "x1b", label: "隐藏的控制链路", value: 0.70, method: "股权层级检测",
          evidence: "远景新能源由远景投资100%控股，远景投资背后涉及发行人实控人赵宏图。",
          explanation: "通过外部合伙企业的层级嵌套，隐蔽大客户与发行人实控人之间的控制实质。",
          subIndex: "X1",
          evidenceSource: { documentName: "企查查商业档案.pdf", page: "第3页", paragraph: "股权结构", originalText: "远景新能源由远景投资100%控股。" }
        },
        {
          id: "x1c", label: "人员交叉任职", value: 0.80, method: "董事监事高管名册比对",
          evidence: "发行人部分非核心高管具有在主要供应商处兼职经历。",
          explanation: "上下游供应商与拟发行企业的高管交叉，增加业务协同与利益输送的操作便利性。",
          subIndex: "X1",
          evidenceSource: { documentName: "绿能科技首次公开发行股票招股说明书(申报稿).pdf", page: "第88页", paragraph: "董事与高管简历", originalText: "绿能科技部分非核心高管具有在主要供应商处兼职经历。" }
        }
      ],
      transactionAbnormality: [
        {
          id: "x2a", label: "第一大客户交易回流", value: 0.95, method: "资金回环检测算法",
          evidence: "前五大客户之一的远景新能源与其实控人在报告期内存在通过保荐机构指定账户间接进行资金回转（约1200万）。",
          explanation: "大客户巨额销售同时伴随资金通过体外账户流回发行人或实控人，高度疑似“虚构销售、资金空转”粉饰利润。",
          subIndex: "X2",
          evidenceSource: { documentName: "核心基本户建行全年流水.csv", page: "第12页", paragraph: "异常流水清单", originalText: "前五大客户之一的【远景新能源】与其实控人在报告期内存在通过保荐机构指定账户间接进行资金回转（约1200万）的情况，存在提前确认收入粉饰利润的嫌疑。" }
        },
        {
          id: "x2b", label: "交易额陡峭度", value: 0.85, method: "趋势面分析",
          evidence: "该第一大客户贡献了2023年度32%的营业额。",
          explanation: "单一年份针对单一客户的收入集中度异常偏高，违背正常商业增长规律。",
          subIndex: "X2",
          evidenceSource: { documentName: "绿能科技首次公开发行股票招股说明书(申报稿).pdf", page: "第115页", paragraph: "前五大客户分析", originalText: "招股书披露该客户贡献了2023年度32%的营业额。" }
        },
        {
          id: "x2c", label: "供应商业务依赖", value: 0.70, method: "集中度分析",
          evidence: "向汇通电池材料的年度采购比例达40%。",
          explanation: "上游供应商极度集中，伴随之前发现的高管交叉任职，关联采购溢价或折价的风险大幅升高。",
          subIndex: "X2",
          evidenceSource: { documentName: "前五大客户年度框架合同汇总.pdf", page: "第8页", paragraph: "采购总结", originalText: "框架采购协议显示，向汇通电池材料占年度采购比例达40%。" }
        }
      ],
      externalTrace: [
        {
          id: "x3a", label: "外部补贴极度依赖", value: 0.90, method: "财报异动分析",
          evidence: "扣非净利润中有近65%来源于地方新能源补贴。",
          explanation: "企业的盈利模型对外部政策性补贴的依赖度超过合规和可持续性健康红线。",
          subIndex: "X3",
          evidenceSource: { documentName: "1-6月地方政府新能源补贴明细_密.xlsx", page: "Sheet1", paragraph: "第1行", originalText: "扣非净利润中有近65%来源于地方新能源补贴。" }
        },
        {
          id: "x3b", label: "利润断层风险", value: 0.85, method: "政策持续性评估",
          evidence: "补贴政策将于明年一季度到期，面临极高持续盈利风险。",
          explanation: "若补贴彻底退坡，企业核心盈利能力即刻丧失，构成IPO重大不确定性因素。",
          subIndex: "X3",
          evidenceSource: { documentName: "1-6月地方政府新能源补贴明细_密.xlsx", page: "Sheet1", paragraph: "第2行", originalText: "且该补贴政策将于明年一季度到期，面临极高持续盈利风险。" }
        }
      ]
    }, "该IPO主体资金流水呈现严重的大客户资金回转异常，且盈利质量高度依赖即将到期的补贴，综合触发极高发行风险警示。", "发现存在严重资金空转与利润粉饰嫌疑")
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
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 60000).toISOString(), details: JSON.stringify({ ruleName: '高管违规跨层兼职 (R-MGMT-05)', ruleId: 'R-MGMT-05', dimension: 'identity', scoreImpact: 20, description: '投资总监王某在旗下三家被投企业担任执行董事且领取薪酬，违反内部利益冲突豁免条款。', severity: 'low'}) }
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
    ],
    riskScoring: buildRiskScoring({
      identityNetwork: [
        {
          id: "x1a", label: "核心高管隐性关联", value: 0.85, method: "关联交易穿透",
          evidence: "星光创投合伙企业实质GP为鼎信资本CFO陈建国。",
          explanation: "企业CFO私下控制体外资金平台，极易形成利益冲突与资金挪用通道。",
          subIndex: "X1",
          evidenceSource: { documentName: "工商穿透查询底稿", page: "第2页", paragraph: "GP结构", originalText: "工商底稿显示陈建国持有该GP实体99%份额。" }
        },
        {
          id: "x1b", label: "高管违规跨层兼职", value: 0.65, method: "利益冲突检测",
          evidence: "投资总监王某在旗下三家被投企业担任执行董事且领取薪酬。",
          explanation: "违反内部利益冲突豁免条款，可能损害基金LP的整体利益。",
          subIndex: "X1",
          evidenceSource: { documentName: "A轮跟投协议_修正版.docx", page: "第12页", paragraph: "人事安排", originalText: "王敏兼任执行董事并领取月度报酬。" }
        },
        {
          id: "x1c", label: "未披露关联方", value: 0.75, method: "关联清单核对",
          evidence: "审计清单中存在星光创投合伙企业，但实质未在年度关联交易列表中排查和披露。",
          explanation: "管理层主观遗漏或规避关联方披露义务，内控有效性存疑。",
          subIndex: "X1",
          evidenceSource: { documentName: "2023年鼎信资本关联方披露清单.xlsx", page: "Sheet1", paragraph: "整体排查", originalText: "并未发现星光创投在名录内。" }
        }
      ],
      transactionAbnormality: [
        {
          id: "x2a", label: "未披露大额关联拆借", value: 0.80, method: "资金合规比对",
          evidence: "存在一笔向星光创投支出的3000万短期过桥借款，未在决议中且实质为关联方。",
          explanation: "涉及核心高管的违规大额资金流出，严重违反投资管理机构的资金管理红线。",
          subIndex: "X2",
          evidenceSource: { documentName: "普华永道审计往来款底稿.pdf", page: "第45页", paragraph: "大额异常流水", originalText: "存在一笔向【星光创投合伙企业】支出的3000万短期过桥借款。" }
        },
        {
          id: "x2b", label: "资金审批流异常", value: 0.60, method: "签批流程回溯",
          evidence: "决议中未见该笔3000万过桥资金的董事会专项审批签字。",
          explanation: "大额资金脱离合规审批流程，坐实内控失效。",
          subIndex: "X2",
          evidenceSource: { documentName: "第一届董事会第三次决议(关联交易).pdf", page: "第3页", paragraph: "决议事项", originalText: "全篇未见针对星光创投3000万过桥资金的审批记录。" }
        },
        {
          id: "x2c", label: "被投企业异常薪酬", value: 0.50, method: "税务代扣代缴分析",
          evidence: "王某通过被投企业额外获取无正当理由的高额津贴。",
          explanation: "利益输送的常见形式，虽金额相对资金盘较小，但性质违规。",
          subIndex: "X2",
          evidenceSource: { documentName: "普华永道审计往来款底稿.pdf", page: "第88页", paragraph: "薪酬核对", originalText: "发现王某在云联医疗等三家企业有异常薪酬发放记录。" }
        }
      ],
      externalTrace: [
        {
          id: "x3a", label: "外部审计函证异常", value: 0.65, method: "函证校验比对",
          evidence: "普华永道发出的部分关联方往来询证函未收到有效回函或回函不符。",
          explanation: "外部审计程序受阻，侧面印证资产端存在掩盖事实的可能。",
          subIndex: "X3",
          evidenceSource: { documentName: "普华永道审计往来款底稿.pdf", page: "第112页", paragraph: "函证总结", originalText: "向星光创投等实体的账项询证函未被确认或退回。" }
        },
        {
          id: "x3b", label: "监管问询隐患", value: 0.40, method: "舆情合规检测",
          evidence: "前期部分同行业投资机构因此类隐性过桥遭当地证监局出具警示函。",
          explanation: "行业合规趋严，本项目当前发现的问题极易触发进一步的监管现场检查。",
          subIndex: "X3",
          evidenceSource: { documentName: "外部舆情及监管处罚记录库", page: "N/A", paragraph: "案例总结", originalText: "存在类似违规担保及过桥受到警示函的先例。" }
        }
      ]
    }, "审计发现多项高管隐性关联与大额未批过桥拆借行为，严重违反关联交易披露与授权制度，内控失效。", "发现高管隐性关联与关联方未披露的大额资金拆借")
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
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 450000).toISOString(), details: JSON.stringify({ ruleName: '重大项目舞弊与利益输送 (R-FRAUD-09)', ruleId: 'R-FRAUD-09', dimension: 'identity', scoreImpact: 85, description: '土方工程分包商【广州鼎盛沙石】的实际控制人与其项目的开发工程总监刘某存在直系亲属关系，且该分包商资质评级D级却连续中标。', severity: 'critical'}) },
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
    ],
    riskScoring: buildRiskScoring({
      identityNetwork: [
        {
          id: "x1a", label: "核心成员亲属关联", value: 0.95, method: "户籍与图谱比对",
          evidence: "工程总监刘某与分包商鼎盛沙石实控人刘浩为父子关系。",
          explanation: "工程发包方核心人员与中标分包商存在直系亲属关系，涉及严重的舞弊与利益输送。",
          subIndex: "X1",
          evidenceSource: { documentName: "关系人比对报告", page: "第1页", paragraph: "排查结果", originalText: "户籍地址查询与关联人脸比对确认为父子关系。" }
        },
        {
          id: "x1b", label: "利用空壳主体", value: 0.85, method: "图谱特征识别",
          evidence: "收款方鑫源建材贸易被识别为无实质业务的材料贸易空壳公司。",
          explanation: "通过多层级的空壳网络掩盖资金最终流向，是典型的资金抽逃特征手法。",
          subIndex: "X1",
          evidenceSource: { documentName: "商事主体特征库比对", page: "N/A", paragraph: "异常筛查", originalText: "该企业社保参保人数为0，注册地址为虚拟地址库挂靠。" }
        },
        {
          id: "x1c", label: "供应商资质异常", value: 0.75, method: "入库评分比对",
          evidence: "鼎盛沙石资质评级为D级，却能连续中标大规模土方工程。",
          explanation: "低资质企业异常中标，进一步印证了关系网背后的围标串标与暗箱操作。",
          subIndex: "X1",
          evidenceSource: { documentName: "华南区域入库供应商清单及资质评级.csv", page: "行245", paragraph: "评级结果", originalText: "供应商广州鼎盛沙石资质评级D级。" }
        }
      ],
      transactionAbnormality: [
        {
          id: "x2a", label: "预售资金秒级过境", value: 1.00, method: "资金流转时序网络",
          evidence: "累计1.2亿预售款在进入监管账户后48小时内即被全额支取并划出体外。",
          explanation: "预售资金违规挪用的极限操作手段，造成项目即刻处于高位资金断裂风险。",
          subIndex: "X2",
          evidenceSource: { documentName: "预售资金监管专户流水账单.xlsx", page: "明细表", paragraph: "流水序列", originalText: "1.2亿预售款在进入监管账户后48小时内，以“主体土建工程预付款”名义超额支付给总包。" }
        },
        {
          id: "x2b", label: "虚列成本资金打散", value: 0.90, method: "账户聚类分析",
          evidence: "总包收款后立即打散转入空壳建材公司。",
          explanation: "虚列建筑材料采购成本以套现，这是建筑行业资金抽逃的经典路径。",
          subIndex: "X2",
          evidenceSource: { documentName: "资金穿透子表", page: "资金流向图", paragraph: "层级2", originalText: "总包随后即划转入体外的材料贸易空壳公司隐匿资金。" }
        },
        {
          id: "x2c", label: "工程款超付比例", value: 0.85, method: "工程量与资金拟合",
          evidence: "支付节点的实际工程进度约15%，但预付及进度款已支付达合同预算的65%。",
          explanation: "资金支付与现场实际施工量产生巨额脱节，直接印证抽逃事实。",
          subIndex: "X2",
          evidenceSource: { documentName: "工程款支付节点OA审批流出件.pdf", page: "第4页", paragraph: "审批流汇总", originalText: "累计支付比例严重超过当前实际土方工程量。" }
        }
      ],
      externalTrace: [
        {
          id: "x3a", label: "监理签审伪造", value: 0.95, method: "AI笔迹工程检验",
          evidence: "第三期工程款请款单上的监理签审笔迹及时间与施工日志严重悖离，系施工员代签。",
          explanation: "核心支付节点的法定签核存在造假，打破了预售款监管机制中最底层的信用基础。",
          subIndex: "X3",
          evidenceSource: { documentName: "笔迹检验比对说明.pdf", page: "第1页", paragraph: "鉴定结论", originalText: "AI比对查明关键节点工程进度确认单签名系总包方施工员代签。" }
        },
        {
          id: "x3b", label: "客诉及停工隐患", value: 0.80, method: "外部舆情采集",
          evidence: "近期多地曝出施工方欠薪及业主关于该楼盘施工进展迟缓的联名投诉。",
          explanation: "资金挪用已导致实质性的工程停滞，烂尾风险极高，触发群体性稳定隐患。",
          subIndex: "X3",
          evidenceSource: { documentName: "舆情周报", page: "第2页", paragraph: "楼盘热度", originalText: "业主论坛出现大量交房担忧与实地反映停工的图文。" }
        }
      ]
    }, "资金高度异常且伴随监理签字造假、近亲属裙带分包等恶性欺诈动作，确认巨额资金已被抽逃，项目存在极高烂尾风险。", "发现特别重大工程欺诈及资金抽逃")
  }
};

// Initialize dynamic risk calculations
Object.values(demoProjectDetailsMap).forEach(detail => {
  const ruleHits = detail.audit_logs
    .filter((l: any) => l.action === 'RED_FLAG')
    .map((l: any) => JSON.parse(l.details));
  
  if (detail.riskScoring) {
    detail.project.riskScore = detail.riskScoring.probabilityPercent;
    
    const label = detail.riskScoring.riskLevel;
    let color = "text-green-500";
    let bg = "bg-green-500";
    if (label === '极高风险') { color = "text-red-500"; bg = "bg-red-500"; }
    else if (label === '中高风险') { color = "text-orange-500"; bg = "bg-orange-500"; }
    else if (label === '中等风险') { color = "text-yellow-500"; bg = "bg-yellow-500"; }
    
    detail.project.riskLevel = { label, color, bg };
    
    detail.project.dimensionScores = {
      X1: detail.riskScoring.subIndices.X1,
      X2: detail.riskScoring.subIndices.X2,
      X3: detail.riskScoring.subIndices.X3
    };
  } else {
    const riskResult = calculateProjectRisk(ruleHits);
    
    detail.project.riskScore = riskResult.totalScore;
    detail.project.riskLevel = riskResult.level;
    detail.project.dimensionScores = riskResult.dimensionScores;
  }
});

export const mockProjects = [
  { id: 1001, name: "发行人关联交易智能核查项目", scenario: "IPO关联交易核查", riskScore: demoProjectDetailsMap['1001'].project.riskScore, riskLevel: demoProjectDetailsMap['1001'].project.riskLevel, docCount: 14, createdAt: demoProjectDetailsMap['1001'].project.createdAt },
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
  { id: 'R-ADDR-01', name: '高密聚类注册地址重叠', category: RISK_DIMENSIONS.identity.name, weight: 50, status: 'enabled', updatedAt: '2026-04-10', owner: '审计风控组' },
  { id: 'R-MGMT-02', name: '隐藏高管交叉控股/任职', category: RISK_DIMENSIONS.identity.name, weight: 85, status: 'enabled', updatedAt: '2026-04-12', owner: '审计风控组' },
  { id: 'R-FUND-09', name: '短期异常资金回路 (72h内)', category: RISK_DIMENSIONS.behavior.name, weight: 90, status: 'enabled', updatedAt: '2026-04-15', owner: '资金合规组' },
  { id: 'R-TEND-04', name: '供应商与员工电话/邮箱重叠', category: RISK_DIMENSIONS.circumstantial.name, weight: 35, status: 'enabled', updatedAt: '2026-03-22', owner: '采购合规组' },
  { id: 'R-FIN-01', name: '毛利率显著背离行业均值', category: RISK_DIMENSIONS.circumstantial.name, weight: 15, status: 'disabled', updatedAt: '2026-01-05', owner: '数据模型组' }
];

export const mockKb = [
  { id: 'KB-2026-X1', name: '大连星巴达重组资产评估补充协议.pdf', type: 'PDF', status: '已解析', chunks: 145, entities: 22, date: '2026-04-18' },
  { id: 'KB-2026-X2', name: '2024年供应商尽职调查(海润实业).docx', type: 'Word', status: '已解析', chunks: 89, entities: 15, date: '2026-04-18' },
  { id: 'KB-2026-X3', name: '招行银企直联流水明细 (30天).xlsx', type: 'Excel', status: '提取中...', chunks: '-', entities: '-', date: '2026-04-19' },
  { id: 'KB-2026-X4', name: '高层核心治理人员任免决议汇编.pdf', type: 'PDF', status: '已解析', chunks: 204, entities: 41, date: '2026-04-15' },
  { id: 'KB-2026-X5', name: '往来邮件存档_财务总监部.pst', type: 'Email', status: '排队中', chunks: '-', entities: '-', date: '2026-04-19' },
];
