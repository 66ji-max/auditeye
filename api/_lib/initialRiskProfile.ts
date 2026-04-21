import { calculateProjectRisk, RiskDimension } from '../../src/config/riskScoring.js';

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface InitialRuleHit {
  ruleId: string;
  ruleName: string;
  dimension: RiskDimension;
  scoreImpact: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const TEMPLATES: Record<string, {
  rules: {
    ruleId: string;
    ruleName: string;
    dimension: RiskDimension;
    impactRange: [number, number];
    description: string;
  }[]
}> = {
  'IPO审查': {
    rules: [
      {
        ruleId: 'IPO-R-01',
        ruleName: '前五大客户集中度预警',
        dimension: 'relation',
        impactRange: [40, 70],
        description: '发现核心客户集中度偏高，需排查是否存在潜在的利益输送或隐性关联。'
      },
      {
        ruleId: 'IPO-F-01',
        ruleName: '收入确认时点敏感',
        dimension: 'financial',
        impactRange: [60, 90],
        description: '部分大额非标收入在期末集中确认，存在跨期调节利润的嫌疑。'
      },
      {
        ruleId: 'IPO-B-01',
        ruleName: '关键岗位人员异动',
        dimension: 'behavior',
        impactRange: [20, 50],
        description: '申报期内财务与风控负责人存在离职与换岗记录。'
      }
    ]
  },
  '年度审计异常追踪': {
    rules: [
      {
        ruleId: 'AUD-B-01',
        ruleName: '往来款项异常波动',
        dimension: 'behavior',
        impactRange: [30, 60],
        description: '年末其他应收款项存在频繁大额借贷记录，需排查资金占用。'
      },
      {
        ruleId: 'AUD-R-01',
        ruleName: '隐性关联任职关联',
        dimension: 'relation',
        impactRange: [20, 50],
        description: '提取到高管疑似在核心供应商体系内有未披露的兼职或干股。'
      },
      {
        ruleId: 'AUD-F-01',
        ruleName: '个别费用率偏离',
        dimension: 'financial',
        impactRange: [10, 30],
        description: '某些渠道推广费用异常显著增长，与营收匹配度不高。'
      }
    ]
  },
  '内部反欺诈审查': {
    rules: [
      {
        ruleId: 'AF-B-01',
        ruleName: '审批链条跳级或缺失',
        dimension: 'behavior',
        impactRange: [60, 90],
        description: '关键大额采购单的审批记录中跳过了合规总监的签字节点。'
      },
      {
        ruleId: 'AF-R-01',
        ruleName: '供应商信息高密重叠',
        dimension: 'relation',
        impactRange: [60, 90],
        description: '检测到多家中型供应商的实际注册邮箱或联系人电话雷同，涉嫌围标串标。'
      },
      {
        ruleId: 'AF-F-01',
        ruleName: '资金实际用途背离',
        dimension: 'financial',
        impactRange: [40, 60],
        description: '部分报销及请款单据的摘要与最终资金流出的收款方性质存在明显差异。'
      }
    ]
  },
  '深度欺诈审查': {
    rules: [
      {
        ruleId: 'DF-B-01',
        ruleName: '短期异常资金回路',
        dimension: 'behavior',
        impactRange: [80, 100],
        description: '检测到 72 小时内发生的资金闭环划转，具有典型的洗售和虚增流水特征。'
      },
      {
        ruleId: 'DF-R-01',
        ruleName: '实控关联链异常隐蔽',
        dimension: 'relation',
        impactRange: [80, 100],
        description: '实际控制人通过多层有限合伙或空壳公司交叉控制核心业务节点。'
      },
      {
        ruleId: 'DF-F-01',
        ruleName: '异常巨额现金交易',
        dimension: 'financial',
        impactRange: [60, 80],
        description: '存在大量无合理商业逻辑的现金结算与公转私提取记录。'
      }
    ]
  }
};

export function generateInitialRiskProfile(scenario: string) {
  // Fallback to IPO if scenario is unknown
  const template = TEMPLATES[scenario] || TEMPLATES['IPO审查'];
  
  const ruleHits: InitialRuleHit[] = [];
  
  for (const r of template.rules) {
    const impact = getRandomInt(r.impactRange[0], r.impactRange[1]);
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (impact >= 80) severity = 'critical';
    else if (impact >= 60) severity = 'high';
    else if (impact >= 30) severity = 'medium';
    else severity = 'low';

    ruleHits.push({
      ruleId: r.ruleId,
      ruleName: r.ruleName,
      dimension: r.dimension,
      scoreImpact: impact,
      description: r.description,
      severity
    });
  }

  // Calculate score via the shared logic
  const { totalScore, dimensionScores, level } = calculateProjectRisk(ruleHits);

  return {
    ruleHits,
    totalScore,
    dimensionScores,
    level,
    // Provide a few descriptive logs tailored to this template calculation
    logs: [
      { action: 'INFO', details: JSON.stringify({ message: `项目初始化完成，已载入 [${scenario}] 预警模板。` }) },
      { action: 'INFO', details: JSON.stringify({ message: `系统基于场景生成初始风险画像，初步算分 [${totalScore}分]，等待源文档解析深入分析校验。` }) },
      { action: 'INFO', details: JSON.stringify({ message: `自动抽取并配置相关维度初始审查规则 [${ruleHits.length} 条] 完毕。` }) },
    ]
  };
}
