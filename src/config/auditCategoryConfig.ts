export const AUDIT_CATEGORIES = {
  all: {
    id: "all",
    label: "全部门类",
    modelWeights: { W1: 2.35, W2: 3.05, W3: 1.55, b: -3.1 },
    ruleWeights: {
      identity: 36,
      transaction: 45,
      external: 28
    },
    description: "综合视图，用于查看所有门类规则。"
  },
  general: {
    id: "general",
    label: "通用审计模型",
    modelWeights: { W1: 2.2, W2: 3.0, W3: 1.2, b: -3.0 },
    ruleWeights: {
      identity: 30,
      transaction: 40,
      external: 20
    },
    description: "默认兜底模型，重点关注基础交易异常与通用关联关系。"
  },
  ipo: {
    id: "ipo",
    label: "IPO / 上市审查",
    modelWeights: { W1: 2.8, W2: 3.2, W3: 1.0, b: -3.2 },
    ruleWeights: {
      identity: 45,
      transaction: 50,
      external: 18
    },
    description: "IPO场景更关注隐性关联方、实控人同源、客户供应商资金回流和突击交易。"
  },
  financial_investment: {
    id: "financial_investment",
    label: "金融投资 / 基金审计",
    modelWeights: { W1: 3.1, W2: 2.4, W3: 1.1, b: -3.0 },
    ruleWeights: {
      identity: 50,
      transaction: 35,
      external: 20
    },
    description: "基金和投资审计更关注GP、LP、管理层、被投企业之间的隐性控制与利益冲突。"
  },
  real_estate_construction: {
    id: "real_estate_construction",
    label: "地产工程 / 建设反舞弊",
    modelWeights: { W1: 2.2, W2: 3.6, W3: 1.8, b: -3.3 },
    ruleWeights: {
      identity: 35,
      transaction: 60,
      external: 35
    },
    description: "地产工程反舞弊更关注工程款异常流转、虚列成本、伪造签字、资金抽逃。"
  },
  manufacturing_supply_chain: {
    id: "manufacturing_supply_chain",
    label: "制造业 / 供应链采购",
    modelWeights: { W1: 2.4, W2: 3.1, W3: 1.2, b: -3.1 },
    ruleWeights: {
      identity: 38,
      transaction: 50,
      external: 22
    },
    description: "制造业采购场景更关注供应商异常、采购价格异常、员工亲属企业和空壳供应商。"
  },
  energy_subsidy: {
    id: "energy_subsidy",
    label: "能源 / 补贴 / 政府项目",
    modelWeights: { W1: 1.9, W2: 2.6, W3: 2.2, b: -3.0 },
    ruleWeights: {
      identity: 28,
      transaction: 42,
      external: 45
    },
    description: "能源补贴场景更关注政策补贴依赖、环保处罚、行政监管和舆情风险。"
  }
};

export const getAuditCategory = (id: string) => {
  return AUDIT_CATEGORIES[id as keyof typeof AUDIT_CATEGORIES] || AUDIT_CATEGORIES.general;
};

export const getCategoryModelWeights = (id: string) => {
  return getAuditCategory(id).modelWeights;
};

export const getCategoryRuleWeights = (id: string) => {
  return getAuditCategory(id).ruleWeights;
};
