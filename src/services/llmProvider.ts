import e from "express";

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  primaryModel: string;
  fallbackModels: string[];
}

export class LLMProvider {
  private config: LLMConfig;

  constructor() {
    this.config = {
      apiKey: process.env.AUDITEYE_LLM_API_KEY || "",
      baseUrl: process.env.AUDITEYE_LLM_BASE_URL || "https://max.openai365.top/v1",
      primaryModel: process.env.AUDITEYE_PRIMARY_MODEL || "gemini-2.5-pro",
      fallbackModels: process.env.AUDITEYE_FALLBACK_MODELS 
        ? process.env.AUDITEYE_FALLBACK_MODELS.split(",")
        : [
            "gemini-3.1-pro-preview",
            "gemini-3.1-pro-preview-maxthinking",
            "gemini-3-pro-preview-thinking",
            "claude-opus-4-6",
            "claude-opus-4-6-thinking"
          ],
    };
  }

  async checkStatus() {
    if (!this.config.apiKey) return { status: "error", message: "API key not configured." };
    // try fetching models
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${this.config.baseUrl}/models`, {
        headers: { "Authorization": `Bearer ${this.config.apiKey}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return { status: "ok", message: "LLM Provider is reachable." };
      }
      return { status: "error", message: `HTTP ${res.status}: ${res.statusText}` };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  }

  async generate(prompt: string, options?: { systemPrompt?: string, jsonMode?: boolean }): Promise<string> {
    const modelsToTry = [this.config.primaryModel, ...this.config.fallbackModels];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[LLM] Attempting generation with model: ${model}`);
        
        const messages = [];
        if (options?.systemPrompt) {
          messages.push({ role: "system", content: options.systemPrompt });
        }
        messages.push({ role: "user", content: prompt });

        const reqBody: any = {
          model: model,
          messages: messages,
          temperature: 0.1, // low temperature for precise extraction
        };

        if (options?.jsonMode) {
          reqBody.response_format = { type: "json_object" };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout
        
        const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(reqBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`HTTP ${res.status}: ${body}`);
        }

        const data = await res.json();
        const content = data.choices[0].message.content;
        console.log(`[LLM] Success with model: ${model}`);
        return content;
      } catch (e: any) {
        console.warn(`[LLM] Failed with model ${model}: ${e.message}`);
        lastError = e;
        continue;
      }
    }

    throw new Error(`All LLM models failed. Last error: ${lastError?.message}`);
  }
}

export const llm = new LLMProvider();
