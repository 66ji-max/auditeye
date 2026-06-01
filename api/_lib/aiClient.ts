
export const getProviderConfig = () => {
    const llmApiKey = process.env.LLM_API_KEY;
    const llmBaseUrl = process.env.LLM_BASE_URL;
    const llmModel = process.env.LLM_MODEL || 'gemini-3.1-pro-preview';
    const llmFallbackModel = process.env.LLM_FALLBACK_MODEL || 'gemini-3-flash-preview';
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    if (llmApiKey && llmBaseUrl) {
        return {
            mode: 'openai-compatible',
            apiKey: llmApiKey,
            baseUrl: llmBaseUrl,
            model: llmModel,
            fallbackModel: llmFallbackModel,
            apiKeyConfigured: true,
            baseUrlConfigured: true
        };
    } else if (geminiApiKey) {
        return {
            mode: 'official-gemini',
            apiKey: geminiApiKey,
            baseUrl: 'https://generativelanguage.googleapis.com',
            model: 'gemini-pro',
            fallbackModel: null,
            apiKeyConfigured: true,
            baseUrlConfigured: false
        };
    }
    
    return {
        mode: 'mock-fallback',
        apiKey: null,
        baseUrl: null,
        model: 'mock',
        fallbackModel: null,
        apiKeyConfigured: false,
        baseUrlConfigured: false
    };
};

const callOpenAICompatible = async (prompt: string, config: any, useFallback: boolean = false) => {
    const modelToUse = useFallback ? config.fallbackModel : config.model;
    if (!modelToUse) throw new Error("No model specified");

    const endpoint = config.baseUrl.endsWith('/') ? `${config.baseUrl}chat/completions` : `${config.baseUrl}/chat/completions`;
    
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
            model: modelToUse,
            messages: [
                { role: "system", content: "你是审计文档信息抽取助手。你只能返回严格 JSON，不能返回 Markdown，不能返回解释。" },
                { role: "user", content: prompt }
            ],
            temperature: 0.1
        })
    });
    
    if (!res.ok) {
        let errStr = res.statusText;
        try {
            const errData = await res.json();
            errStr = JSON.stringify(errData.error?.message || errData.error || errData);
        } catch (e) {
            try {
                const text = await res.text();
                if (text) {
                    errStr = text.length > 300 ? text.substring(0, 300) + '...' : text;
                }
            } catch (e2) {}
        }
        const error: any = new Error(`OpenAI-compatible API Error: ${errStr}`);
        error.status = res.status;
        throw error;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
};

const callOfficialGemini = async (prompt: string, config: any) => {
    const url = `${config.baseUrl}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 }
        })
    });
    if (!res.ok) {
         let errStr = res.statusText;
         try {
             const errData = await res.json();
             errStr = JSON.stringify(errData.error?.message || errData.error || errData);
         } catch (e) {
             try {
                const text = await res.text();
                if (text) {
                    errStr = text.length > 300 ? text.substring(0, 300) + '...' : text;
                }
             } catch (e2) {}
         }
         const error: any = new Error(`Gemini API Error: ${errStr}`);
         error.status = res.status;
         throw error;
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

export const callLLM = async (prompt: string) => {
    const config = getProviderConfig();
    
    let resultText = '';
    
    let baseUrlHost = null;
    try {
        if (config.baseUrl) {
            baseUrlHost = new URL(config.baseUrl).host;
        }
    } catch(e) {}

    const providerInfo: any = {
        mode: config.mode,
        model: config.model,
        fallbackModel: config.fallbackModel,
        baseUrlConfigured: config.baseUrlConfigured,
        apiKeyConfigured: config.apiKeyConfigured,
        baseUrlHost: baseUrlHost,
        failureStage: "none",
        primaryErrorStatus: null,
        primaryErrorMessage: null,
        fallbackErrorStatus: null,
        fallbackErrorMessage: null
    };

    if (config.mode === 'mock-fallback') {
        providerInfo.failureStage = 'missing-env';
        providerInfo.primaryErrorMessage = 'No API key configured';
        return { text: '', providerInfo };
    }
    
    if (config.mode === 'openai-compatible') {
        try {
            resultText = await callOpenAICompatible(prompt, config, false);
        } catch (e: any) {
            providerInfo.failureStage = 'primary-model-failed';
            providerInfo.primaryErrorStatus = e.status || null;
            providerInfo.primaryErrorMessage = e.message || String(e);

            if (config.fallbackModel) {
                try {
                    resultText = await callOpenAICompatible(prompt, config, true);
                    providerInfo.failureStage = "none";
                    providerInfo.model = config.fallbackModel; // show successful use
                } catch (e2: any) {
                    providerInfo.failureStage = "fallback-model-failed";
                    providerInfo.fallbackErrorStatus = e2.status || null;
                    providerInfo.fallbackErrorMessage = e2.message || String(e2);
                }
            }
        }
    } else if (config.mode === 'official-gemini') {
         try {
             resultText = await callOfficialGemini(prompt, config);
         } catch (e: any) {
             providerInfo.failureStage = 'primary-model-failed';
             providerInfo.primaryErrorStatus = e.status || null;
             providerInfo.primaryErrorMessage = e.message || String(e);
         }
    }
    
    return { text: resultText, providerInfo };
};
