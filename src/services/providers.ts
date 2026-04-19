export interface ExtractedEntity {
  id?: string;
  type: 'COMPANY' | 'PERSON' | 'LOCATION' | 'PHONE' | 'EMAIL';
  name: string;
  normalizedName: string;
  attributes: Record<string, any>;
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
  evidence: string;
}

export interface ProviderResult {
  entities: ExtractedEntity[];
  relationships: Relationship[];
  rawContent: string;
}

export interface DataProvider {
  name: string;
  fetchData(query: string, context?: any): Promise<ProviderResult>;
}

// Mock Provider for Corporate Registry 
export class CorporateRegistryProvider implements DataProvider {
  name = 'Public Corporate Registry';

  async fetchData(query: string) {
    console.log(`[CorporateRegistry] Fetching public records for: ${query}`);
    
    // Mock seed data representing a highly suspicious pattern match for AuditEye
    if (query.includes('A公司') || query.includes('B公司')) {
      return {
        entities: [
          { type: 'COMPANY', name: 'A公司', normalizedName: 'A_CORP', attributes: { address: '高新区科技路88号1栋', status: 'active' } },
          { type: 'COMPANY', name: 'B公司', normalizedName: 'B_CORP', attributes: { address: '高新区科技路88号3栋', status: 'active' } },
          { type: 'COMPANY', name: '供应商Y', normalizedName: 'Y_CORP', attributes: { address: '高新区科技路88号3栋201室', founded: '2022-11-15' } },
          { type: 'PERSON', name: '高管张某', normalizedName: 'ZHANG_MOU', attributes: { role: 'former_cto' } }
        ] as ExtractedEntity[],
        relationships: [
          { source: '高管张某', target: 'A公司', type: 'FORMER_EXEC', evidence: '曾担任技术总监' },
          { source: 'B公司', target: '供应商Y', type: 'SHAREHOLDER', evidence: 'B公司持有供应商Y 60%股份' },
          { source: '高管张某', target: 'B公司', type: 'LEGAL_REP', evidence: '现任法定代表人' }
        ],
        rawContent: "A公司前高管张某离职后成立B公司。B公司随后控股了新成立的供应商Y。供应商Y注册在A公司隔壁办公楼。"
      };
    }
    
    return { entities: [], relationships: [], rawContent: "No data found." };
  }
}
