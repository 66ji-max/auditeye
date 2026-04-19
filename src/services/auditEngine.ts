import path from 'path';
import db from '../db.ts';
import { parseDocument } from './documentParser.ts';
import { CorporateRegistryProvider, ExtractedEntity, Relationship } from './providers.ts';
import { llm } from './llmProvider.ts';

export interface AuditRecommendation {
  ruleId: string;
  ruleName: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  scoreImpact: number;
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
              const prompt = `Analyze the following document text and extract any companies, people, and their relationships. Also identify any audit risk anomalies (like related party transactions, suspicious overlap, etc.).
Return ONLY a JSON object with this exact structure:
{
  "entities": [{"type": "COMPANY"|"PERSON", "name": "...", "normalizedName": "...", "attributes": {}}],
  "relationships": [{"source": "...", "target": "...", "type": "...", "evidence": "..."}],
  "risks": [{"ruleName": "...", "description": "...", "severity": "high"|"medium"|"low", "scoreImpact": 15}]
}
Text to analyze:
${blockText.substring(0, 10000)} /* Truncated for safety */`;
              
              const jsonStr = await llm.generate(prompt, { jsonMode: true, systemPrompt: "You are a senior audit intelligence engine. Extract exact entities and identify fraud risks." });
              const result = JSON.parse(jsonStr);
              
              if (result.entities && Array.isArray(result.entities)) {
                allEntities = allEntities.concat(result.entities);
                logs.push(`Extracted ${result.entities.length} entities from ${doc.originalName}`);
              }
              if (result.relationships && Array.isArray(result.relationships)) {
                allRels = allRels.concat(result.relationships);
                logs.push(`Extracted ${result.relationships.length} relationships from ${doc.originalName}`);
              }
              if (result.risks && Array.isArray(result.risks)) {
                result.risks.forEach((r: any) => {
                  score += r.scoreImpact || 10;
                  recommendations.push({
                    ruleId: 'R-AI-DOC',
                    ruleName: r.ruleName || 'AI预警规则',
                    description: r.description,
                    severity: r.severity || 'medium',
                    scoreImpact: r.scoreImpact || 10
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
          description: `公司注册地址高度重合: ${companies.join(', ')}`,
          severity: 'high',
          scoreImpact: 35
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
          description: `${ex.source} 曾是 ${ex.target} 员工, 现为 ${currentLegal.target} 法人`,
          severity: 'high',
          scoreImpact: 45
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
