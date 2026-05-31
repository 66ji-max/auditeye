
export const callGemini = async (prompt: string, apiKey: string) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
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

export const getApiKey = () => {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
};
