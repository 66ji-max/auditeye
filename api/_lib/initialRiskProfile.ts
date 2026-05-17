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
  'IPO关联交易核查': {
    rules: [
      {
        ruleId: 'IPO-ID-01',
        ruleName: '实控人/最终受益人同源',
        dimension: 'identity',
        impactRange: [25, 25],
        description: '发现交易对手最终控制人与发行人实控人指向同一人。'
      },
      {
        ruleId: 'IPO-ID-02',
        ruleName: '多层股权嵌套控制',
        dimension: 'identity',
        impactRange: [15, 15],
        description: '系统发现4级控股结构，涉及广东到山东的跨地域控股。'
      },
      {
        ruleId: 'IPO-ID-03',
        ruleName: '曾用名字号关联',
        dimension: 'identity',
        impactRange: [8, 8],
        description: '交易对手曾用名包含发行人核心字号，紧邻申报期突击重名。'
      },
      {
        ruleId: 'IPO-BEH-01',
        ruleName: '突击异常交易',
        dimension: 'behavior',
        impactRange: [29, 29],
        description: '申报期内交易金额激增，关联业务比例畸高。'
      },
      {
        ruleId: 'IPO-CIRC-01',
        ruleName: '外围联系方式及单据匹配',
        dimension: 'circumstantial',
        impactRange: [10, 10],
        description: '检测到与境外主体存在传真、电话、地址乃至装箱单模板制作者重叠现象。'
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
        dimension: 'identity',
        impactRange: [20, 50],
        description: '提取到高管疑似在核心供应商体系内有未披露的兼职或干股。'
      },
      {
        ruleId: 'AUD-F-01',
        ruleName: '负面舆情或诉讼佐证',
        dimension: 'circumstantial',
        impactRange: [10, 30],
        description: '外围数据发现历史上有共同成为被执行人或互相担保关联。'
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
        ruleName: '信息高密重叠',
        dimension: 'identity',
        impactRange: [60, 90],
        description: '检测到注册邮箱或联系人电话雷同，隐蔽控制明显。'
      },
      {
        ruleId: 'AF-F-01',
        ruleName: '外围资质造假相关',
        dimension: 'circumstantial',
        impactRange: [40, 60],
        description: '公开招投标信息外围数据显示存在围标嫌疑。'
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
        dimension: 'identity',
        impactRange: [80, 100],
        description: '实际控制人通过多层有限合伙或空壳公司交叉控制核心业务节点。'
      },
      {
        ruleId: 'DF-F-01',
        ruleName: '资产负面划转',
        dimension: 'circumstantial',
        impactRange: [60, 80],
        description: '存在无合理商业实质的公开资产划转与代偿外围记录。'
      }
    ]
  }
};

export function generateInitialRiskProfile(scenario: string) {
  // Fallback to IPO if scenario is unknown
  const template = TEMPLATES[scenario] || TEMPLATES['IPO关联交易核查'];
  
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
