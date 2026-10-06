import { AIProvider } from './AIProvider';

export class GeminiProvider implements AIProvider {
    private apiKey: string;

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
            // Dynamically load ESM SDK inside CommonJS runtime
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: this.apiKey });

            const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt,
            });

            return response.text || 'No response returned from Gemini.';
        } catch (error: any) {
            return `Error connecting to Gemini API: ${error.message || error}`;
        }
    }
}