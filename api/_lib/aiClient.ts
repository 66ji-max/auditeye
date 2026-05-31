
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
                { role: "system", content: "你是审计证据抽取助手，只返回 JSON。" },
                { role: "user", content: prompt }
            ],
            temperature: 0.1
        })
    });
    
    if (!res.ok) throw new Error(`OpenAI-compatible API Error: ${res.status} ${res.statusText}`);
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
    if (!res.ok) throw new Error(`Gemini API Error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

export const callLLM = async (prompt: string) => {
    const config = getProviderConfig();
    
    let resultText = '';
    
    if (config.mode === 'openai-compatible') {
        try {
            resultText = await callOpenAICompatible(prompt, config, false);
        } catch (e) {
            console.error("OpenAI-compatible call failed, trying fallback model", e);
            if (config.fallbackModel) {
                try {
                    resultText = await callOpenAICompatible(prompt, config, true);
                } catch (e2) {
                    console.error("Fallback model failed", e2);
                    throw e2;
                }
            } else {
                throw e;
            }
        }
    } else if (config.mode === 'official-gemini') {
         resultText = await callOfficialGemini(prompt, config);
    } else {
        throw new Error("mock-fallback");
    }
    
    return { text: resultText, config };
};
