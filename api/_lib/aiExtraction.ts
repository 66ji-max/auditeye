
import { callLLM } from './aiClient.js';

const parseJSON = (text: string) => {
    let raw = text.trim();
    if (raw.startsWith('```json')) {
        raw = raw.slice(7);
    } else if (raw.startsWith('```')) {
        raw = raw.slice(3);
    }
    
    if (raw.endsWith('```')) {
        raw = raw.slice(0, -3);
    }
    
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : raw;
    return JSON.parse(jsonStr);
};

export const extractEvidence = async (projectType: string, documentText: string) => {
    const defaultMockResult = {
      source: "mock-fallback",
      providerInfo: {
          mode: 'mock-fallback',
          model: 'mock',
          baseUrlConfigured: false,
          apiKeyConfigured: false,
          failureStage: "none",
          errorStatus: null,
          errorMessage: null
      },
      entities: [
        { name: "登XX发行主体", type: "COMPANY" },
        { name: "山东旺XX汽车零部件有限公司", type: "COMPANY" }
      ],
      keywords: ["关联交易", "交易额突增", "最终控制人", "工商更名"],
      relationships: [
        {
          source: "登XX发行主体",
          target: "山东旺XX汽车零部件有限公司",
          type: "ABNORMAL_TRANSACTION",
          evidence: "2012 年交易额突增至 770.13 万元"
        }
      ],
      evidenceSnippets: [
        {
          evidenceType: "交易异常",
          text: "2012 年交易额突增至 770.13 万元",
          relatedFeature: "x2b"
        }
      ],
      suggestedRawFeatures: {
        x1a: 0.85, x1b: 0.90, x1c: 0.00,
        x2a: 0.95, x2b: 0.85, x2c: 0.15,
        x3a: 0.20, x3b: 0.20
      }
    };

    try {
        const prompt = `Extract entities, keywords, relationships, evidenceSnippets, and suggested raw risk features (x1a-x3b) from the following document.
        Project Type: ${projectType}
        Document: ${documentText.slice(0, 1000)}...
        
        Output format MUST be valid JSON mapping EXACTLY to this schema:
        {
          "entities": [{"name": "...", "type": "..."}],
          "keywords": ["..."],
          "relationships": [{"source": "...", "target": "...", "type": "...", "evidence": "..."}],
          "evidenceSnippets": [{"evidenceType": "...", "text": "...", "relatedFeature": "x1a"}],
          "suggestedRawFeatures": { "x1a": 0.8, "x1b": 0.9, "x1c": 0, "x2a": 0, "x2b": 0, "x2c": 0, "x3a": 0, "x3b": 0 }
        }
        Return ONLY the JSON string.`;

        const { text, providerInfo } = await callLLM(prompt);
        
        let parsed = null;
        if (text) {
            try {
                parsed = parseJSON(text);
            } catch (jsonErr: any) {
                providerInfo.failureStage = "json-parse-failed";
                providerInfo.errorMessage = jsonErr.message;
            }
        } else if (providerInfo.failureStage === "none" && providerInfo.mode !== "mock-fallback") {
            providerInfo.failureStage = "empty-response";
            providerInfo.errorMessage = "LLM returned empty output";
        }

        if (!parsed) {
             const result = { ...defaultMockResult };
             result.providerInfo = { ...result.providerInfo, ...providerInfo };
             return result;
        }

        return {
            source: providerInfo.mode === 'official-gemini' ? 'gemini-api' : 'llm-api',
            providerInfo,
            ...parsed
        };
    } catch(e: any) {
        console.error("LLM Extraction failed, fallback to mock");
        const fallback = { ...defaultMockResult };
        fallback.providerInfo.failureStage = "unknown";
        fallback.providerInfo.errorMessage = e.message || String(e);
        return fallback;
    }
};
