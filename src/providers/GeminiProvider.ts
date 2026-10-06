import { AIProvider } from './AIProvider';

export class GeminiProvider implements AIProvider {
    private apiKey: string;
    private primaryModel = 'gemini-3.8-flash';
    private fallbackModel = 'gemini-3.5-flash';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async ask(question: string, code: string): Promise<string> {
        const prompt = `You are an expert software developer assisting inside VS Code.
Analyze the following highlighted code and answer the user's question concisely.

Highlighted Code:
\`\`\`
${code}
\`\`\`

User Question: ${question}`;

        try {
            return await this._generateWithRetry(this.primaryModel, prompt);
        } catch (error: any) {
            console.warn(`Primary model (\({this.primaryModel}) high demand/capacity failure. Trying fallback model (\){this.fallbackModel})...`);

            try {
                return await this._generateWithRetry(this.fallbackModel, prompt);
            } catch (fallbackError: any) {
                return `⚠️ **Gemini Service Unavailable**: Google's servers are experiencing high demand right now. Please try again in a few moments.`;
            }
        }
    }

    private async _generateWithRetry(modelName: string, prompt: string, maxRetries = 3): Promise<string> {
        let delayMs = 1500;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Dynamically load ESM SDK inside CommonJS runtime
                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: this.apiKey });

                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                });

                return response.text || 'No response returned from Gemini.';
            } catch (error: any) {
                const errString = error?.message || String(error);
                const isCapacityError = 
                    errString.includes('503') || 
                    errString.includes('429') || 
                    errString.includes('UNAVAILABLE') || 
                    errString.includes('high demand');

                if (isCapacityError && attempt < maxRetries) {
                    const jitter = Math.random() * 500;
                    await new Promise((res) => setTimeout(res, delayMs + jitter));
                    delayMs *= 2;
                    continue;
                }

                throw error;
            }
        }

        throw new Error(`Failed after \({maxRetries} retries on\){modelName}.`);
    }
}