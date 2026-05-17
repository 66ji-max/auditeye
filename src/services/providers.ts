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
    if (query.includes('登XX') || query.includes('山东旺XX')) {
      return {
        entities: [
          { type: 'COMPANY', name: '登XX发行主体', normalizedName: 'CORP_DENG', attributes: { address: '广东省肇庆市', status: 'active' } },
          { type: 'COMPANY', name: '山东旺XX汽车零部件有限公司', normalizedName: 'CORP_WANG', attributes: { address: '山东省', status: 'active' } },
          { type: 'COMPANY', name: '山东登XX汽配销售有限公司', normalizedName: 'CORP_DENG_SD', attributes: { address: '山东省', note: '曾用名' } },
          { type: 'COMPANY', name: '山东富XX', normalizedName: 'CORP_FU', attributes: { status: 'active' } },
          { type: 'COMPANY', name: '肇庆达XX', normalizedName: 'CORP_DA', attributes: { status: 'active' } },
          { type: 'COMPANY', name: '广州富XX', normalizedName: 'CORP_GZ_FU', attributes: { status: 'active' } },
          { type: 'PERSON', name: '欧XX', normalizedName: 'PERSON_OU', attributes: { role: 'ultimate_controller' } },
          { type: 'COMPANY', name: '美国登X', normalizedName: 'CORP_US_DENG', attributes: { location: 'USA' } }
        ] as ExtractedEntity[],
        relationships: [
          { source: '山东旺XX汽车零部件有限公司', target: '山东登XX汽配销售有限公司', type: 'FORMER_NAME', evidence: '曾用名重名风险' },
          { source: '广州富XX', target: '肇庆达XX', type: 'HOLDING', evidence: '持股' },
          { source: '肇庆达XX', target: '山东富XX', type: 'HOLDING', evidence: '持股' },
          { source: '山东富XX', target: '山东旺XX汽车零部件有限公司', type: 'HOLDING', evidence: '持股' },
          { source: '欧XX', target: '广州富XX', type: 'ULTIMATE_CONTROLLER', evidence: '最终实际控制人' }
        ],
        rawContent: "欧XX通过广州富XX、肇庆达XX、山东富XX等多层有限合伙嵌套交叉控股山东旺XX汽车零部件有限公司。调查显示，山东旺XX曾用名为“山东登XX汽配销售有限公司”，并与拟发行主体存在复杂的潜藏业务交集与单据同源重合现象。"
      };
    }
    
    return { entities: [], relationships: [], rawContent: "No data found." };
  }
}
