const fs = require('fs');
let content = fs.readFileSync('src/lib/mockData.ts', 'utf-8');

// The replacement for 1002
const replacement1002 = `'1002': {
    project: { id: '1002', name: "绿能科技IPO主体资金流穿透", scenario: "IPO审查", createdAt: new Date(Date.now() - 86400000).toISOString() },
    documents: [
      { id: 11, fileName: 'IPO_bank_statement.pdf', originalName: '绿能科技IPO申报期银行流水.pdf', sourceType: '.pdf' },
      { id: 12, fileName: 'Supplier_contracts.docx', originalName: '核心供应商采购合同汇总.docx', sourceType: '.docx' },
      { id: 13, fileName: 'Client_check.xlsx', originalName: '回款客户穿透核查表.xlsx', sourceType: '.xlsx' }
    ],
    audit_logs: [
      { action: 'INFO', createdAt: new Date(Date.now() - 860000).toISOString(), details: JSON.stringify({ message: '开始对绿能科技IPO申报期流水进行穿透分析。' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 850000).toISOString(), details: JSON.stringify({ message: '发现核心供应商汇通电池材料的回流资金网络。' }) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 800000).toISOString(), details: JSON.stringify({ ruleName: '重大客户资金闭环', ruleId: 'R-IPO-01', dimension: 'transaction', scoreImpact: 50, description: '发现前五大客户与发行方之间的隐蔽回流，涉嫌虚构销售款项回转。', severity: 'critical'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 750000).toISOString(), details: JSON.stringify({ ruleName: '重大关联方身份隐匿', ruleId: 'R-IPO-02', dimension: 'identity', scoreImpact: 35, description: '第一大客户背后的实控人与发行方关联紧密，疑似同源。', severity: 'high'}) }
    ],
    entities: [
      { type: 'COMPANY', name: '绿能科技', attributes: { address: '苏州工业园区' } },
      { type: 'COMPANY', name: '核心客户远景', attributes: { address: '常州高新' } },
      { type: 'COMPANY', name: '汇通电池材料', attributes: { address: '无锡惠山' } },
      { type: 'COMPANY', name: '远景投资空壳', attributes: { address: '霍尔果斯' } },
      { type: 'PERSON', name: '实控人赵宏图', attributes: { role: '董事长' } },
      { type: 'ACCOUNT', name: '中转资金账户A', attributes: { bank: '建行' } }
    ],
    relationships: [
      { source: '绿能科技', target: '核心客户远景', relationType: 'MAJOR_CLIENT', evidenceSnippet: '贡献32%营收' },
      { source: '绿能科技', target: '汇通电池材料', relationType: 'SUPPLIER', evidenceSnippet: '年度采购比例40%' },
      { source: '核心客户远景', target: '远景投资空壳', relationType: 'ULTIMATE_CONTROLLER', evidenceSnippet: '同源控股100%' },
      { source: '远景投资空壳', target: '中转资金账户A', relationType: 'FUND_TRANSFER', evidenceSnippet: '资金隐蔽划转' },
      { source: '中转资金账户A', target: '实控人赵宏图', relationType: 'FUND_TRANSFER', evidenceSnippet: '大额过桥资金最终回流至实控人' },
      { source: '实控人赵宏图', target: '绿能科技', relationType: 'CONTROL', evidenceSnippet: '实际控制' }
    ],
    riskScoring: buildRiskScoring({
      identityNetwork: [
        {
          id: "x1a", label: "核心客户同源", value: 0.85, method: "知识图谱穿透",
          evidence: "第一大客户与发行人实控人赵宏图存在共用疑似代持主体。",
          explanation: "客户实控人实质上受发行人实控网影响，严重违反独立性原则。",
          subIndex: "X1",
          evidenceSource: { documentName: "回款客户穿透核查表.xlsx", page: "Sheet1", paragraph: "股东结构", originalText: "赵宏图个人账户向远景投资代持人转账1200万作为借款。" }
        },
        {
          id: "x1b", label: "隐藏的控制链路", value: 0.70, method: "股权层级检测",
          evidence: "远景新能源由远景投资100%控股，远景投资背后涉及发行人实控人。",
          explanation: "通过霍尔果斯空壳企业的层级嵌套，隐蔽大客户与发行人实控人之间的控制实质。",
          subIndex: "X1",
          evidenceSource: { documentName: "核心供应商采购合同汇总.docx", page: "附件", paragraph: "尽调说明", originalText: "远景新能源由远景投资100%控股。" }
        },
        {
          id: "x1c", label: "人员交叉任职", value: 0.60, method: "高管名册比对",
          evidence: "发行人部分非核心高管具有在主要供应商处兼职经历。",
          explanation: "增加业务协同与利益输送的操作便利性。",
          subIndex: "X1",
          evidenceSource: { documentName: "绿能科技IPO申报期银行流水.pdf", page: "说明页", paragraph: "流水摘要", originalText: "绿能科技部分高管具有在主要供应商处兼职经历。" }
        }
      ],
      transactionAbnormality: [
        {
          id: "x2a", label: "第一大客户交易回流", value: 0.95, method: "资金回环检测",
          evidence: "前五大客户在报告期内存在通过指定账户间接进行资金回转（约1200万）。",
          explanation: "大客户巨额销售伴随资金流回发行人保荐机构，高度疑似“虚构销售”。",
          subIndex: "X2",
          evidenceSource: { documentName: "绿能科技IPO申报期银行流水.pdf", page: "第12页", paragraph: "异常流水清单", originalText: "在前五大客户名下发现1200万资金间接回转的情况。" }
        },
        {
          id: "x2b", label: "交易额陡峭突增", value: 0.85, method: "趋势面分析",
          evidence: "申报前一年对核心客户销售额骤增 400%。",
          explanation: "单一年份针对单一客户的收入集中度异常偏高，存在典型的突击交易粉饰业绩特征。",
          subIndex: "X2",
          evidenceSource: { documentName: "回款客户穿透核查表.xlsx", page: "销售统计", paragraph: "2023年度", originalText: "第四季度环比销售额激增400%。" }
        },
        {
          id: "x2c", label: "供应商款项倒闭", value: 0.80, method: "时序反常分析",
          evidence: "公司在未确认收货前向汇通电池预付大额货款。",
          explanation: "存在预付账款流出变相为关联方输血的极大嫌疑。",
          subIndex: "X2",
          evidenceSource: { documentName: "核心供应商采购合同汇总.docx", page: "第3页", paragraph: "付款条款", originalText: "框架协议中包含无理的大额预付款项（占比超越货值60%）。" }
        }
      ],
      externalTrace: [
        {
          id: "x3a", label: "外部补贴极度依赖", value: 0.90, method: "财报异动分析",
          evidence: "扣非净利润中有近65%来源于地方新能源补贴。",
          explanation: "企业的盈利模型对外部政策性补贴的依赖度超过健康红线。",
          subIndex: "X3",
          evidenceSource: { documentName: "绿能科技IPO申报期银行流水.pdf", page: "第1行", paragraph: "流水", originalText: "政府大额补贴款项占该季度利润大头。" }
        },
        {
          id: "x3b", label: "外围关联企业注销", value: 0.85, method: "工商状态监测",
          evidence: "实控人曾任职的多家商贸企业在申报前三个月密集注销。",
          explanation: "可能存在销毁违规交易或体外资金痕迹的掩饰行为。",
          subIndex: "X3",
          evidenceSource: { documentName: "回款客户穿透核查表.xlsx", page: "关联方", paragraph: "注销名单", originalText: "赵宏图曾任职的3家壳公司接连注销。" }
        }
      ]
    }, "存在严重大客户资金回转异常，隐形关联与突击交易并存。", "IPO发行风险极其严重")
  },`;

const replacement1003 = `'1003': {
    project: { id: '1003', name: "鼎信资本年度审计关联方排查", scenario: "年度审计异常追踪", createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    documents: [
      { id: 21, fileName: 'audit_doc1.pdf', originalName: '鼎信资本年度审计底稿.pdf', sourceType: '.pdf' },
      { id: 22, fileName: 'management_interview.docx', originalName: '关联方管理层访谈记录.docx', sourceType: '.docx' },
      { id: 23, fileName: 'transaction_details.xlsx', originalName: '供应商与被投企业交易明细.xlsx', sourceType: '.xlsx' }
    ],
    audit_logs: [
      { action: 'INFO', createdAt: new Date(Date.now() - 150000).toISOString(), details: JSON.stringify({ message: '导入年审关联方披露清单与被投企业报表。' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 140000).toISOString(), details: JSON.stringify({ message: '核实投资组合与管理层董监高名录的交叉重叠。' }) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 90000).toISOString(), details: JSON.stringify({ ruleName: '未披露大额关联拆借', ruleId: 'R-AUDIT-04', dimension: 'behavior', scoreImpact: 50, description: '存在一笔向星光创投的短期过桥借款未在决议中公开。', severity: 'medium'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 60000).toISOString(), details: JSON.stringify({ ruleName: '违规跨层兼职', ruleId: 'R-MGMT-05', dimension: 'identity', scoreImpact: 20, description: '管理层在被投企业内担任实权职位并领取异常高薪。', severity: 'low'}) }
    ],
    entities: [
      { type: 'COMPANY', name: '鼎信资本', attributes: { address: '深圳南山区' } },
      { type: 'PERSON', name: '陈建国 (CFO)', attributes: { role: '财务负责人' } },
      { type: 'PERSON', name: '王敏 (投资总监)', attributes: { role: '高管' } },
      { type: 'COMPANY', name: '星光创投合伙企业', attributes: { address: '前海' } },
      { type: 'COMPANY', name: '智芯科技(被投企业)', attributes: { address: '东莞' } },
      { type: 'COMPANY', name: '审计遗漏关联方', attributes: { address: '珠海' } }
    ],
    relationships: [
      { source: '鼎信资本', target: '陈建国 (CFO)', relationType: 'EXECUTIVE', evidenceSnippet: '财务授权人' },
      { source: '鼎信资本', target: '王敏 (投资总监)', relationType: 'EXECUTIVE', evidenceSnippet: '投资主管' },
      { source: '陈建国 (CFO)', target: '星光创投合伙企业', relationType: 'ACTUAL_CONTROLLER', evidenceSnippet: '工商底稿显示持股99%' },
      { source: '王敏 (投资总监)', target: '智芯科技(被投企业)', relationType: 'DUAL_EMPLOYMENT', evidenceSnippet: '兼职提成' },
      { source: '星光创投合伙企业', target: '审计遗漏关联方', relationType: 'RELATED_PARTY_TRANSACTION', evidenceSnippet: '隐性关联' },
      { source: '鼎信资本', target: '审计遗漏关联方', relationType: 'DOCUMENT_MATCH', evidenceSnippet: '未申报关联明细' }
    ],
    riskScoring: buildRiskScoring({
      identityNetwork: [
        {
          id: "x1a", label: "核心高管隐性控制", value: 0.85, method: "穿透比对",
          evidence: "星光创投实质GP为鼎信资本CFO陈建国。",
          explanation: "企业CFO私下控制体外募资平台，极易形成利益冲突。",
          subIndex: "X1",
          evidenceSource: { documentName: "鼎信资本年度审计底稿.pdf", page: "第2页", paragraph: "GP结构", originalText: "工商底稿显示陈建国持有星光创投GP实体99%份额。" }
        },
        {
          id: "x1b", label: "高管跨层兼职", value: 0.70, method: "利益冲突核查",
          evidence: "王敏在智芯科技担任执行董事且领取巨额薪酬。",
          explanation: "可能损害基金基本LP利益。",
          subIndex: "X1",
          evidenceSource: { documentName: "关联方管理层访谈记录.docx", page: "访谈", paragraph: "职务确认", originalText: "王敏承认兼任执行董事并领取报酬。" }
        },
        {
          id: "x1c", label: "隐性遗漏关联方", value: 0.75, method: "审计底稿稽核",
          evidence: "星光创投未列入年度关联交易排查库。",
          explanation: "管理层主观遗漏披露义务，直接挑战审计独立性。",
          subIndex: "X1",
          evidenceSource: { documentName: "供应商与被投企业交易明细.xlsx", page: "关联清单", paragraph: "底表", originalText: "清单外发现星光创投。并未在名录内。" }
        }
      ],
      transactionAbnormality: [
        {
          id: "x2a", label: "未批关联拆借", value: 0.80, method: "审批回溯",
          evidence: "向星光创投拨付3000万短期资金。",
          explanation: "实质为违规的大额关联过桥。",
          subIndex: "X2",
          evidenceSource: { documentName: "鼎信资本年度审计底稿.pdf", page: "异常卷", paragraph: "流水", originalText: "支付给星光创投的3000万过桥款。" }
        },
        {
          id: "x2b", label: "审批流断层", value: 0.70, method: "签批缺失识别",
          evidence: "3000万过桥资金缺乏董事会立项签字。",
          explanation: "脱离合规审批流程，坐实内控失效。",
          subIndex: "X2",
          evidenceSource: { documentName: "关联方管理层访谈记录.docx", page: "决议", paragraph: "内控", originalText: "全篇未见针对这笔过桥资金的审批记录。" }
        },
        {
          id: "x2c", label: "异常输送对价", value: 0.65, method: "公信力核对",
          evidence: "被投企业在无需顾问的情况下向关联人支付高额顾问费。",
          explanation: "通过虚构服务名义进行利益输送。",
          subIndex: "X2",
          evidenceSource: { documentName: "供应商与被投企业交易明细.xlsx", page: "人工成本", paragraph: "附带顾问费", originalText: "发现无业务来往的异常顾问薪酬。" }
        }
      ],
      externalTrace: [
        {
          id: "x3a", label: "外部函证异常", value: 0.70, method: "回函率统计",
          evidence: "向特定关联实体发出的数封询证函均被退签。",
          explanation: "审计外围支持失效，资产真实性严重存疑。",
          subIndex: "X3",
          evidenceSource: { documentName: "鼎信资本年度审计底稿.pdf", page: "第112页", paragraph: "函证总结", originalText: "星光创投的询证函被拒收。" }
        },
        {
          id: "x3b", label: "曾受监管通报", value: 0.60, method: "过往处罚追踪",
          evidence: "相似体外资金池曾遭监管口头警告。",
          explanation: "行业合规雷区，可能再次引发重罚。",
          subIndex: "X3",
          evidenceSource: { documentName: "关联方管理层访谈记录.docx", page: "附件", paragraph: "备查", originalText: "类似担保违规曾有警示函先例。" }
        }
      ]
    }, "存在多起高等级高管隐形关联及未披露的资金拆借。", "审计发现显著内控漏洞")
  },`;

const replacement1004 = `'1004': {
    project: { id: '1004', name: "华泰置业烂尾楼资金抽逃协查", scenario: "内部反欺诈审查", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    documents: [
      { id: 31, fileName: 'fund_flow_1004.pdf', originalName: '华泰置业项目工程款流水.pdf', sourceType: '.pdf' },
      { id: 32, fileName: 'progress_report.docx', originalName: '烂尾楼工程进度确认单.docx', sourceType: '.docx' },
      { id: 33, fileName: 'vendor_payments.xlsx', originalName: '建材供应商付款明细.xlsx', sourceType: '.xlsx' }
    ],
    audit_logs: [
      { action: 'INFO', createdAt: new Date(Date.now() - 800000).toISOString(), details: JSON.stringify({ message: '载入华泰项目工程专户流水...' }) },
      { action: 'INFO', createdAt: new Date(Date.now() - 750000).toISOString(), details: JSON.stringify({ message: '提取工程进度与款项审批底稿。' }) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 500000).toISOString(), details: JSON.stringify({ ruleName: '预售资金违规挪用', ruleId: 'R-REAL-01', dimension: 'behavior', scoreImpact: 100, description: '1.2亿预售款进入监管账户48小时内被立即汇出。', severity: 'critical'}) },
      { action: 'RED_FLAG', createdAt: new Date(Date.now() - 400000).toISOString(), details: JSON.stringify({ ruleName: '监理虚假签审', ruleId: 'R-DOC-03', dimension: 'document', scoreImpact: 60, description: '证实监理签字系施工方代签假冒。', severity: 'high'}) }
    ],
    entities: [
      { type: 'COMPANY', name: '华泰置业', attributes: { address: '项目地' } },
      { type: 'COMPANY', name: '中建九局总包', attributes: { address: '发包方' } },
      { type: 'COMPANY', name: '鼎盛沙石分包', attributes: { address: '土方结算' } },
      { type: 'COMPANY', name: '空壳建材公司', attributes: { address: '虚构标的' } },
      { type: 'PERSON', name: '工程总监老刘', attributes: { role: '开发方代表' } },
      { type: 'PERSON', name: '监理人员老陈', attributes: { role: '第三方监管' } },
      { type: 'ACCOUNT', name: '资金洗白中转户', attributes: { platform: '三方支付' } }
    ],
    relationships: [
      { source: '华泰置业', target: '中建九局总包', relationType: 'FUND_TRANSFER', evidenceSnippet: '超额预付款' },
      { source: '中建九局总包', target: '鼎盛沙石分包', relationType: 'SUBCONTRACTOR', evidenceSnippet: '分包承建违规' },
      { source: '工程总监老刘', target: '鼎盛沙石分包', relationType: 'RELATIVES', evidenceSnippet: '直系亲属裙带关系' },
      { source: '监理人员老陈', target: '华泰置业', relationType: 'FORGED_SIGNATURE', evidenceSnippet: '被模仿签字伪造进度审核' },
      { source: '鼎盛沙石分包', target: '空壳建材公司', relationType: 'SHELL_COMPANY', evidenceSnippet: '做高成本' },
      { source: '空壳建材公司', target: '资金洗白中转户', relationType: 'ABNORMAL_TRANSACTION', evidenceSnippet: '极速分散转移' }
    ],
    riskScoring: buildRiskScoring({
      identityNetwork: [
        {
          id: "x1a", label: "总监亲属关联", value: 0.95, method: "户籍图谱计算",
          evidence: "老刘与鼎盛沙石实控人为父子关系。",
          explanation: "发包核心方与分包商存在直系亲属，构成重大内部舞弊事件。",
          subIndex: "X1",
          evidenceSource: { documentName: "华泰置业项目工程款流水.pdf", page: "附录A", paragraph: "关联排查", originalText: "查询确认父子裙带血缘关系" }
        },
        {
          id: "x1b", label: "利用空壳主体", value: 0.88, method: "注册数据爬取",
          evidence: "空壳建材公司无社保人员，且成立不足三个月。",
          explanation: "通过无实质业务的空壳构建虚假贸易链，专为套现服务。",
          subIndex: "X1",
          evidenceSource: { documentName: "建材供应商付款明细.xlsx", page: "供应商清单", paragraph: "资质审核", originalText: "该企业社保参保人数为0，且法定地址不存在" }
        },
        {
          id: "x1c", label: "劣质供应商中标", value: 0.80, method: "招投标一致性检测",
          evidence: "鼎盛沙石仅拥有丁级资质却大额中标千万级项目。",
          explanation: "资质不符且中标必涉嫌内定暗箱操作。",
          subIndex: "X1",
          evidenceSource: { documentName: "烂尾楼工程进度确认单.docx", page: "中标资质", paragraph: "评估", originalText: "沙石供应商资质评级仅为最低档却连中三标" }
        }
      ],
      transactionAbnormality: [
        {
          id: "x2a", label: "防逃资金秒转", value: 1.00, method: "时序闭环溯源",
          evidence: "1.2亿入库资金在监管专户极速汇出体外账户。",
          explanation: "典型的资金暴力洗白抽逃操作，断绝开发回旋余地。",
          subIndex: "X2",
          evidenceSource: { documentName: "华泰置业项目工程款流水.pdf", page: "第3页", paragraph: "大额表", originalText: "1.2亿预售款在48小时内以主体材料款名义全额转账划出" }
        },
        {
          id: "x2b", label: "虚列成本资金打散", value: 0.90, method: "收款方聚类分析",
          evidence: "分包方转手即把款项切分至数十个空壳账户中。",
          explanation: "资金切分化整为零避开监管大额追踪红线。",
          subIndex: "X2",
          evidenceSource: { documentName: "华泰置业项目工程款流水.pdf", page: "附录图", paragraph: "二级分化", originalText: "发现一级账户资金随即向外离散至26个无规律的商贸散户" }
        },
        {
          id: "x2c", label: "工程进度与拨款倒挂", value: 0.95, method: "工程进度复合评估",
          evidence: "实际工程土方进度仅15%，但已全额拔付65%款项。",
          explanation: "项目预付资金已被过度消耗，后续复工极为艰难。",
          subIndex: "X2",
          evidenceSource: { documentName: "烂尾楼工程进度确认单.docx", page: "对比清单", paragraph: "偏差表", originalText: "已完成实际工作量与预算报量存在惊叹的偏差漏洞" }
        }
      ],
      externalTrace: [
        {
          id: "x3a", label: "签批篡改作假", value: 0.95, method: "文档造假稽查",
          evidence: "关键工程拨款单上独立监理老陈的签字被查实系总包做假伪造的。",
          explanation: "涉及严重合同诈骗行为，破坏项目工程结算的根本信用。",
          subIndex: "X3",
          evidenceSource: { documentName: "烂尾楼工程进度确认单.docx", page: "第二签批面", paragraph: "印鉴", originalText: "比对确认老陈该时间段不在现场，其批注与过往笔迹大相径庭" }
        },
        {
          id: "x3b", label: "外部停工投诉潮", value: 0.85, method: "舆情爬取",
          evidence: "售楼盘遭业主大规模集访和拉横幅抗议。",
          explanation: "社会稳定风险已经显现，烂尾现象被外部事件实质性触发。",
          subIndex: "X3",
          evidenceSource: { documentName: "建材供应商付款明细.xlsx", page: "补充材料", paragraph: "社会风险", originalText: "发生多起要求即刻退房还本及地方问政留言的恶性反馈" }
        }
      ]
    }, "存在严重裙带关系舞弊与不可挽回的伪造签字套壳资金抽逃，属于恶性欺诈。", "确认严重烂尾违规抽逃")
  }
`;

// Replace 1002, 1003, 1004 in content
// Regex to capture from '1002': { ... } to the end of 1004.
// Using a robust regex approach or string slicing since formatting might be variable.

const startToken1002 = "'1002': {";
const startToken1003 = "'1003': {";
const startToken1004 = "'1004': {";

const idx1002 = content.indexOf(startToken1002);
// The end of 1004 is roughly before `};` and `export const mockProjects`
const mockProjectsIdx = content.indexOf('export const mockProjects');

if (idx1002 !== -1 && mockProjectsIdx !== -1) {
    // Find the ending bracket of demoProjectDetailsMap before mockProjects.
    // Usually it's the `};` line before `export const mockProjects`.
    const preMock = content.substring(idx1002, mockProjectsIdx);
    const lastBraceIdx = preMock.lastIndexOf('};');
    
    // We will replace everything from idx1002 to idx1002 + lastBraceIdx
    const newBlock = replacement1002 + \n + replacement1003 + \n + replacement1004 + \n;
    
    // We need to handle the comma separation carefully and properly stringify.
    const finalContent = content.substring(0, idx1002) + newBlock + content.substring(idx1002 + lastBraceIdx);
    fs.writeFileSync('src/lib/mockData.ts', finalContent);
    console.log("Successfully replaced 1002, 1003, 1004 in mockData.ts");
} else {
    console.error("Could not find boundaries.");
}
