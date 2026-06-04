export const INDUSTRY_TYPES = {
  general: {
    label: "通用审计模型",
    description: "默认兜底模型，样本不足或行业未指定时使用。"
  },
  ipo: {
    label: "IPO / 上市审查",
    description: "用于 IPO 关联交易、供应商客户穿透、收入真实性、突击交易。"
  },
  financial_investment: {
    label: "金融投资 / 基金审计",
    description: "用于基金、资管、创投、被投企业、关联方遗漏、管理层利益冲突。"
  },
  real_estate_construction: {
    label: "地产工程 / 建设反舞弊",
    description: "用于烂尾楼、工程款、分包商、虚列成本、资金抽逃。"
  },
  manufacturing_supply_chain: {
    label: "制造业 / 供应链采购",
    description: "用于供应商异常、采购舞弊、员工亲属企业、空壳供应商。"
  },
  energy_subsidy: {
    label: "能源 / 补贴 / 政府项目",
    description: "用于新能源、政府补贴、环保项目、政策资金、行政处罚和舆情风险。"
  }
};

export const DEFAULT_INDUSTRY_WEIGHTS: Record<string, {W1: number, W2: number, W3: number, b: number, rationale: any}> = {
  general: {
    W1: 2.2, W2: 3.0, W3: 1.2, b: -3.0,
    rationale: {
      W1: "通用模型中身份关联是重要风险来源，但不是唯一核心。",
      W2: "多数审计场景中交易金额、频率和资金流异常更直接影响风险判断。",
      W3: "外围诉讼、处罚、舆情作为辅助证据，权重中等。"
    }
  },
  ipo: {
    W1: 2.8, W2: 3.2, W3: 1.0, b: -3.2,
    rationale: {
      W1: "IPO 审查高度关注隐性关联方、实控人同源和控制链路。",
      W2: "收入真实性、突击交易和资金回流是 IPO 审查的核心高危信号。",
      W3: "外围信息有辅助作用，但通常低于身份穿透和交易异常。"
    }
  },
  financial_investment: {
    W1: 3.1, W2: 2.4, W3: 1.1, b: -3.0,
    rationale: {
      W1: "基金、资管和创投场景中，GP、LP、管理层和被投企业之间的隐性控制关系最关键。",
      W2: "资金拆借、顾问费和利益输送重要，但通常依赖身份关系解释。",
      W3: "监管通报和函证异常作为辅助判断。"
    }
  },
  real_estate_construction: {
    W1: 2.2, W2: 3.6, W3: 1.8, b: -3.3,
    rationale: {
      W1: "地产工程中亲属分包、内部人员控制供应商重要，但不是唯一核心。",
      W2: "工程款异常流转、虚列成本、预售资金抽逃是最直接风险。",
      W3: "烂尾、诉讼、业主投诉、伪造签字等外围证据显著增强风险判断。"
    }
  },
  manufacturing_supply_chain: {
    W1: 2.4, W2: 3.1, W3: 1.2, b: -3.1,
    rationale: {
      W1: "制造业采购中员工亲属企业、供应商实控人重合较常见。",
      W2: "采购价格异常、重复付款、空壳供应商交易是核心风险。",
      W3: "工商异常和处罚记录主要作为补充证据。"
    }
  },
  energy_subsidy: {
    W1: 1.9, W2: 2.6, W3: 2.2, b: -3.0,
    rationale: {
      W1: "能源补贴项目中身份关联重要，但通常不是唯一判断依据。",
      W2: "补贴资金流、项目收入和成本异常仍然重要。",
      W3: "政策补贴依赖、环保处罚、行政监管和舆情风险对该行业影响更大。"
    }
  }
};
