export const CATEGORY_FALLBACK_RULES: Record<string, any[]> = {
  general: [
    { id: "R-GEN-ID-01", name: "基础关联方识别", category: "身份关联", dimension: "identity", severity: "medium", status: "enabled" },
    { id: "R-GEN-TX-01", name: "大额异常交易", category: "交易异常", dimension: "transaction", severity: "high", status: "enabled" },
    { id: "R-GEN-EXT-01", name: "外部处罚记录", category: "外围佐证", dimension: "external", severity: "medium", status: "enabled" }
  ],
  ipo: [
    { id: "R-IPO-ID-01", name: "隐性关联方 / 实控人同源", category: "身份关联", dimension: "identity", severity: "critical", status: "enabled" },
    { id: "R-IPO-TX-01", name: "客户供应商资金回流", category: "交易异常", dimension: "transaction", severity: "critical", status: "enabled" },
    { id: "R-IPO-TX-02", name: "申报期突击交易", category: "交易异常", dimension: "transaction", severity: "high", status: "enabled" },
    { id: "R-IPO-EXT-01", name: "突击更名 / 注销主体", category: "外围佐证", dimension: "external", severity: "medium", status: "enabled" }
  ],
  financial_investment: [
    { id: "R-FIN-ID-01", name: "GP / LP / 管理层交叉控制", category: "身份关联", dimension: "identity", severity: "critical", status: "enabled" },
    { id: "R-FIN-ID-02", name: "被投企业高管兼职", category: "身份关联", dimension: "identity", severity: "high", status: "enabled" },
    { id: "R-FIN-TX-01", name: "关联方资金拆借", category: "交易异常", dimension: "transaction", severity: "high", status: "enabled" },
    { id: "R-FIN-EXT-01", name: "监管警示 / 函证异常", category: "外围佐证", dimension: "external", severity: "medium", status: "enabled" }
  ],
  real_estate_construction: [
    { id: "R-REAL-TX-01", name: "工程款异常流转", category: "交易异常", dimension: "transaction", severity: "critical", status: "enabled" },
    { id: "R-REAL-TX-02", name: "虚列成本 / 空壳分包", category: "交易异常", dimension: "transaction", severity: "critical", status: "enabled" },
    { id: "R-REAL-EXT-01", name: "伪造签字 / 诉讼投诉", category: "外围佐证", dimension: "external", severity: "high", status: "enabled" },
    { id: "R-REAL-ID-01", name: "工程人员亲属分包", category: "身份关联", dimension: "identity", severity: "high", status: "enabled" }
  ],
  manufacturing_supply_chain: [
    { id: "R-MFG-ID-01", name: "员工亲属供应商", category: "身份关联", dimension: "identity", severity: "high", status: "enabled" },
    { id: "R-MFG-TX-01", name: "采购价格异常", category: "交易异常", dimension: "transaction", severity: "critical", status: "enabled" },
    { id: "R-MFG-TX-02", name: "重复付款 / 空壳供应商", category: "交易异常", dimension: "transaction", severity: "high", status: "enabled" },
    { id: "R-MFG-EXT-01", name: "工商异常 / 社保人数异常", category: "外围佐证", dimension: "external", severity: "medium", status: "enabled" }
  ],
  energy_subsidy: [
    { id: "R-ENE-EXT-01", name: "环保处罚 / 行政监管", category: "外围佐证", dimension: "external", severity: "critical", status: "enabled" },
    { id: "R-ENE-TX-01", name: "补贴资金异常流转", category: "交易异常", dimension: "transaction", severity: "high", status: "enabled" },
    { id: "R-ENE-EXT-02", name: "补贴依赖度异常", category: "外围佐证", dimension: "external", severity: "high", status: "enabled" },
    { id: "R-ENE-ID-01", name: "政府项目关联承包", category: "身份关联", dimension: "identity", severity: "medium", status: "enabled" }
  ]
};

export function getFallbackRulesByCategory(categoryId: string) {
  if (categoryId === "all") {
    return Object.values(CATEGORY_FALLBACK_RULES).flat();
  }
  return CATEGORY_FALLBACK_RULES[categoryId] || CATEGORY_FALLBACK_RULES.general;
}
