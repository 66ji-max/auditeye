import path from 'path';
import db from '../db.ts';
import { parseDocument } from './documentParser.ts';
import { CorporateRegistryProvider, ExtractedEntity, Relationship } from './providers.ts';
import { llm } from './llmProvider.ts';

export interface AuditRecommendation {
  ruleId: string;
  ruleName: string;
  dimension: string;
  description: string;
  severity: 'high' | 'medium' | 'low' | 'critical';
  scoreImpact: number;
  evidenceSource: string;
  manualReviewRequired: boolean;
}

export interface AuditResult {
  score: number;
  recommendations: AuditRecommendation[];
  combinedEntities: ExtractedEntity[];
  combinedRelationships: Relationship[];
  logs: string[];
}

export class AuditEngine {
  providers = [new CorporateRegistryProvider()];
  
  async runAnalysis(targetCompany: string, projectId?: string): Promise<AuditResult> {
    const logs: string[] = [];
    logs.push(`Starting analysis for target: ${targetCompany}`);
    
    let allEntities: ExtractedEntity[] = [];
    let allRels: Relationship[] = [];
    let score = 0;
    const recommendations: AuditRecommendation[] = [];

    // 1. Process Uploaded Documents
    if (projectId) {
      logs.push(`Inspecting uploaded documents for Project ${projectId}...`);
      const docs = db.prepare('SELECT * FROM documents WHERE projectId = ?').all(projectId) as any[];
      if (docs.length > 0) {
        for (const doc of docs) {
          logs.push(`Extracting text from: ${doc.originalName}`);
          const filePath = path.join(process.cwd(), 'uploads', doc.fileName);
          const blockText = await parseDocument(filePath, doc.originalName);
          
          if (blockText.includes('System]')) {
            logs.push(`Warning: ${doc.originalName} - ${blockText.substring(0, 100)}`);
          } else {
            logs.push(`Successfully extracted ${blockText.length} characters from ${doc.originalName}`);
            
            // AI Analysis
            try {
              logs.push(`Running LLM extraction on ${doc.originalName}...`);
              const prompt = `Analyze the following document text and extract any companies, people, and their relationships. Address specific related-party transaction indicators.
RETURN ONLY JSON WITH THIS EXACT STRUCTURE:
{
  "companies": ["..."],
  "persons": ["..."],
  "formerNames": [{"company": "...", "formerName": "..."}],
  "equityChain": [{"source": "...", "target": "...", "percentage": "..."}],
  "ultimateBeneficialOwner": [{"company": "...", "owner": "..."}],
  "addressOverlap": [{"entities": ["..."], "address": "..."}],
  "contactOverlap": [{"entities": ["..."], "contact": "..."}],
  "transactionAmountTrend": [{"source": "...", "target": "...", "description": "..."}],
  "evidenceAnchors": ["..."],
  "riskHits": [{
    "ruleId": "...",
    "ruleName": "...",
    "layer": "identity|behavior|circumstantial",
    "scoreImpact": 15,
    "severity": "critical|high|medium|low",
    "description": "...",
    "evidenceSource": "...",
    "manualReviewRequired": true
  }]
}
Text to analyze:
${blockText.substring(0, 10000)} /* Truncated for safety */`;
              
              const systemPrompt = `You are a strict, senior audit intelligence engine specializing in '发行人关联交易智能核查'.
CRITICAL RULES:
- Only output anonymized/desensitized names (e.g. 登XX, 山东富XX).
- NEVER fabricate evidence. If evidence is insufficient, output "需人工补充核查" and do not forcefully label it a concrete risk.
- Every risk conclusion MUST bind to an 'evidenceSource'.
- Provide the specified JSON structure flawlessly.`;

              const jsonStr = await llm.generate(prompt, { jsonMode: true, systemPrompt });
              const result = JSON.parse(jsonStr);
              
              const addEntity = (type: 'COMPANY'|'PERSON', name: string) => {
                 if (name && !allEntities.find(e => e.name === name)) {
                    allEntities.push({ type, name, normalizedName: name, attributes: {} });
                 }
              };
              
              if (result.companies) result.companies.forEach((c:string) => addEntity('COMPANY', c));
              if (result.persons) result.persons.forEach((c:string) => addEntity('PERSON', c));
              
              if (result.equityChain) {
                 result.equityChain.forEach((rel: any) => {
                    allRels.push({ source: rel.source, target: rel.target, type: 'HOLDING', evidence: rel.percentage });
                 });
                 logs.push(`Extracted ${result.equityChain.length} equity chain relationships.`);
              }
              
              if (result.riskHits && Array.isArray(result.riskHits)) {
                result.riskHits.forEach((r: any) => {
                  score += r.scoreImpact || 10;
                  recommendations.push({
                    ruleId: r.ruleId || 'R-AI-DOC',
                    ruleName: r.ruleName || 'AI智能核查预警',
                    dimension: r.layer || 'circumstantial',
                    description: r.description,
                    severity: r.severity || 'medium',
                    scoreImpact: r.scoreImpact || 10,
                    evidenceSource: r.evidenceSource || '系统提取',
                    manualReviewRequired: typeof r.manualReviewRequired === 'boolean' ? r.manualReviewRequired : true
                  });
                });
              }
            } catch (err: any) {
              logs.push(`LLM parsing failed for ${doc.originalName}: ${err.message}`);
            }
          }
        }
      } else {
        logs.push(`No user documents attached. Falling back to public providers.`);
      }
    }
    
    // 2. Query Public Providers
    for (const provider of this.providers) {
      logs.push(`Querying provider: ${provider.name}`);
      const data = await provider.fetchData(targetCompany);
      allEntities = allEntities.concat(data.entities);
      allRels = allRels.concat(data.relationships);
      logs.push(`Retrieved ${data.entities.length} entities and ${data.relationships.length} relationships.`);
    }

    // Run Rule Engine
    logs.push(`Running Risk Rule Engine...`);

    // Red Flag 1: Address Overlap
    const addressMap = new Map<string, string[]>();
    allEntities.filter(e => e.type === 'COMPANY' && e.attributes.address).forEach(e => {
      // Very naive overlap check for demo
      const key = (e.attributes.address as string).slice(0, 10);
      if (!addressMap.has(key)) addressMap.set(key, []);
      addressMap.get(key)!.push(e.name);
    });
    
    for (const [addr, companies] of addressMap.entries()) {
      if (companies.length > 1) {
        recommendations.push({
          ruleId: 'R-ADDR-01',
          ruleName: '地址异常重合',
          dimension: 'circumstantial',
          description: `公司注册地址高度重合: ${companies.join(', ')}`,
          severity: 'high',
          scoreImpact: 35,
          evidenceSource: '地址信息提取分析',
          manualReviewRequired: true
        });
        score += 35;
        logs.push(`Triggered Rule R-ADDR-01 on ${companies.join(', ')}`);
      }
    }

    // Red Flag 2: Executive Overlap
    const exExecRels = allRels.filter(r => r.type === 'FORMER_EXEC');
    const legalRels = allRels.filter(r => r.type === 'LEGAL_REP');
    
    exExecRels.forEach(ex => {
      const currentLegal = legalRels.find(l => l.source === ex.source);
      if (currentLegal) {
        recommendations.push({
          ruleId: 'R-EXEC-02',
          ruleName: '高管履历交集',
          dimension: 'identity',
          description: `${ex.source} 曾是 ${ex.target} 员工, 现为 ${currentLegal.target} 法人`,
          severity: 'high',
          scoreImpact: 45,
          evidenceSource: '历史履历比对',
          manualReviewRequired: true
        });
        score += 45;
        logs.push(`Triggered Rule R-EXEC-02 on ${ex.source}`);
      }
    });

    logs.push(`Analysis complete. Risk Score: ${score}`);

    return {
      score: Math.min(score, 100),
      recommendations,
      combinedEntities: allEntities,
      combinedRelationships: allRels,
      logs
    };
  }
}
