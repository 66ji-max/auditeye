import { calculateProjectRisk, RISK_DIMENSIONS } from './riskScoring.js';

export const demoProjectDetailsMap: Record<string, any> = {
  '1001': {
    project: { id: '1001', name: "发行人关联交易智能核查项目", scenario: "IPO关联交易核查", createdAt: new Date().toISOString() },
    documents: [
      { id: 1, fileName: 'bank_statement.pdf', originalName: '登XX发行主体2024年对公流水.pdf', sourceType: '.pdf' },
      { id: 2, fileName: 'contract.pdf', originalName: '重大采购框架协议.pdf', sourceType: '.pdf' },
      { id: 3, fileName: 'board.pdf', originalName: '2023年度董事会决议.docx', sourceType: '.docx' }
    ],
    audit_logs: [
      { action: 'INFO', createdAt: new Date(Date.now() - 300000).toISOString(), details: JSON.stringify({ message: '成功连接至全国企业信用信息公示系统进行实名校验。' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 280000).toISOString(), details: JSON.stringify({ message: '解析 14 份非结构化文书，共切分得到 402 个独立语块。' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 250000).toISOString(), details: JSON.stringify({ message: '执行股权穿透与最终受益人识别，比对境内外主体联系方式。' }) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 100000).toISOString(), details: JSON.stringify({ ruleName: '实控人/最终受益人同源', ruleId: 'R-ID-01', dimension: 'identity', scoreImpact: 25, description: '最终控制人均指向“欧XX”，交易对手实控人与发行人属同一人控制。', severity: 'critical'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 90000).toISOString(), details: JSON.stringify({ ruleName: '多层股权嵌套控制', ruleId: 'R-ID-02', dimension: 'identity', scoreImpact: 15, description: '系统发现4级控股结构：欧XX → 广州富XX（90%）→ 肇庆达XX（80%）→ 山东富XX（50%）→ 山东旺XX汽车零部件有限公司（100%）。涉及广东到山东的跨地域控股。', severity: 'high'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 85000).toISOString(), details: JSON.stringify({ ruleName: '曾用名字号关联', ruleId: 'R-ID-03', dimension: 'identity', scoreImpact: 8, description: '交易对手曾用名为“山东登XX汽配销售有限公司”，不仅包含发行人核心字号，且在申报期前后突击变更为现名，疑似弱化关联痕迹。', severity: 'high'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 80000).toISOString(), details: JSON.stringify({ ruleName: '单一依赖 / 突击交易', ruleId: 'R-BEH-01', dimension: 'behavior', scoreImpact: 29, description: '识别申报期内异常交易增长：2010年115万，至2012年突击增至770.13万，金额连年暴涨。', severity: 'critical'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 75000).toISOString(), details: JSON.stringify({ ruleName: '外围关联佐证/单据同源', ruleId: 'R-CIRC-01', dimension: 'circumstantial', scoreImpact: 10, description: '与境外关联主体（美国登X）多维比对发现：传真、联系地址高度一致，且装箱单模板与制作人员同源。', severity: 'high'}) }
    ],
    entities: [
      { type: 'COMPANY', name: '登XX发行主体', attributes: { registeredCapital: '5000万', address: '广东省肇庆市' } },
      { type: 'COMPANY', name: '山东旺XX汽车零部件有限公司', attributes: { address: '山东省' } },
      { type: 'COMPANY', name: '山东登XX汽配销售有限公司', attributes: { address: '山东省', note: '曾用名' } },
      { type: 'COMPANY', name: '山东富XX', attributes: { address: '山东省' } },
      { type: 'COMPANY', name: '肇庆达XX', attributes: { address: '广东省肇庆市' } },
      { type: 'COMPANY', name: '广州富XX', attributes: { address: '广东省广州市' } },
      { type: 'PERSON', name: '欧XX', attributes: { role: '最终实际控制人' } },
      { type: 'COMPANY', name: '美国登X', attributes: { address: 'USA' } }
    ],
    relationships: [
      { source: '山东旺XX汽车零部件有限公司', target: '山东登XX汽配销售有限公司', relationType: 'FORMER_NAME', evidenceSnippet: '工商底稿显示企业于申报前发生更名。' },
      { source: '山东富XX', target: '山东旺XX汽车零部件有限公司', relationType: 'HOLDING', evidenceSnippet: '持股 100%' },
      { source: '肇庆达XX', target: '山东富XX', relationType: 'HOLDING', evidenceSnippet: '持股 50%' },
      { source: '广州富XX', target: '肇庆达XX', relationType: 'HOLDING', evidenceSnippet: '持股 80%' },
      { source: '欧XX', target: '广州富XX', relationType: 'HOLDING', evidenceSnippet: '持股 90%' },
      { source: '欧XX', target: '登XX发行主体', relationType: 'ULTIMATE_CONTROLLER', evidenceSnippet: '最终控制人指向一致。' },
      { source: '登XX发行主体', target: '美国登X', relationType: 'DOCUMENT_MATCH', evidenceSnippet: '联系方式与装箱单模板制作人一致。' },
      { source: '登XX发行主体', target: '山东富XX', relationType: 'ABNORMAL_TRANSACTION', evidenceSnippet: '交易金额异常：2010年 96.39万，2011年 389.02万。' },
      { source: '登XX发行主体', target: '山东旺XX汽车零部件有限公司', relationType: 'ABNORMAL_TRANSACTION', evidenceSnippet: '连年暴增：2012年突增至 770.13万。' },
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
            subIndex: "X1"
          },
          {
            id: "x1b",
            label: "控制链路层级",
            value: 0.90,
            method: "知识图谱最短路径",
            evidence: "图谱算法发现“4级跨地域逐层控股”。",
            explanation: "控制链路复杂，存在绕层控股和跨地域控制特征。",
            subIndex: "X1"
          },
          {
            id: "x1c",
            label: "高管流转频繁度",
            value: 0.00,
            method: "时间衰减二分图",
            evidence: "经查双方高管无交叉兼职，属于静默特征。",
            explanation: "高管维度未发现明显异常，因此该项不拉高风险。",
            subIndex: "X1"
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
            subIndex: "X2"
          },
          {
            id: "x2b",
            label: "交易额陡峭度",
            value: 0.85,
            method: "时序斜率",
            evidence: "2012 年突击交易 770 万，曲线斜率极陡。",
            explanation: "交易额在短期内异常上升，显示出突击交易风险。",
            subIndex: "X2"
          },
          {
            id: "x2c",
            label: "定价偏离方差",
            value: 0.15,
            method: "Z-score",
            evidence: "毛利被刻意平滑，暂未发现明显定价异常。",
            explanation: "定价偏离维度暂未发现强异常，因此该项权重贡献较低。",
            subIndex: "X2"
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
            subIndex: "X3"
          },
          {
            id: "x3b",
            label: "资产异动频次",
            value: 0.20,
            method: "泊松分布异常低概率事件",
            evidence: "暂无强异常资产异动证据。",
            explanation: "暂未发现强异常资产异动，仅保留低强度外围风险。",
            subIndex: "X3"
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
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 6500000).toISOString(), details: JSON.stringify({ ruleName: '重大客户收入依赖及返流 (R-FIN-08)', ruleId: 'R-FIN-08', dimension: 'behavior', scoreImpact: 80, description: '前五大客户之一的【远景新能源】与其实控人在报告期内存在通过保荐机构指定账户间接进行资金回转（约1200万）的情况，存在提前确认收入粉饰利润的嫌疑。', severity: 'critical'}) },
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
    ]
  }
};

// Initialize dynamic risk calculations
Object.values(demoProjectDetailsMap).forEach(detail => {
  const ruleHits = detail.audit_logs
    .filter((l: any) => l.action === 'RED_FLAG')
    .map((l: any) => JSON.parse(l.details));
  
  if (detail.riskScoring) {
    detail.project.riskScore = detail.riskScoring.probabilityPercent;
    detail.project.riskLevel = {
      label: detail.riskScoring.riskLevel,
      color: "text-red-500",
      bg: "bg-red-500"
    };
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
  { id: 'R-TEND-04', name: '供应商与员工电话/邮箱重叠', category: RISK_DIMENSIONS.behavior.name, weight: 35, status: 'enabled', updatedAt: '2026-03-22', owner: '采购合规组' },
  { id: 'R-FIN-01', name: '毛利率显著背离行业均值', category: RISK_DIMENSIONS.circumstantial.name, weight: 15, status: 'disabled', updatedAt: '2026-01-05', owner: '数据模型组' }
];

export const mockKb = [
  { id: 'KB-2026-X1', name: '大连星巴达重组资产评估补充协议.pdf', type: 'PDF', status: '已解析', chunks: 145, entities: 22, date: '2026-04-18' },
  { id: 'KB-2026-X2', name: '2024年供应商尽职调查(海润实业).docx', type: 'Word', status: '已解析', chunks: 89, entities: 15, date: '2026-04-18' },
  { id: 'KB-2026-X3', name: '招行银企直联流水明细 (30天).xlsx', type: 'Excel', status: '提取中...', chunks: '-', entities: '-', date: '2026-04-19' },
  { id: 'KB-2026-X4', name: '高层核心治理人员任免决议汇编.pdf', type: 'PDF', status: '已解析', chunks: 204, entities: 41, date: '2026-04-15' },
  { id: 'KB-2026-X5', name: '往来邮件存档_财务总监部.pst', type: 'Email', status: '排队中', chunks: '-', entities: '-', date: '2026-04-19' },
];
