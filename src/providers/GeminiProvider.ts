import { AIProvider } from "./AIProvider";

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private primaryModel = "gemini-3.8-flash";
  private fallbackModel = "gemini-3.5-flash";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async ask(
    question: string,
    code: string,
    onChunk?: (chunk: string) => void,
  ): Promise<string> {
    // 1. Separate system instruction for clean context caching
    const systemInstruction = "You are an expert software developer assisting inside VS Code. Analyze the highlighted code and answer the user's question concisely.";

    // 2. Format user contents cleanly
    const prompt = code 
      ? `Highlighted Code:\n\`\`\`\n\({code}\n\`\`\`\n\nUser Question:\){question}`
      : `User Question: ${question}`;

    try {
      return await this._generateWithRetry(this.primaryModel, prompt, systemInstruction, onChunk);
    } catch (error: any) {
      console.warn(
        `Primary model (\({this.primaryModel}) failed. Trying fallback model (\){this.fallbackModel})...`,
      );

      try {
        return await this._generateWithRetry(
          this.fallbackModel,
          prompt,
          systemInstruction,
          onChunk,
        );
      } catch (fallbackError: any) {
        const errorMsg = `⚠️ **Gemini Service Unavailable**: Google's servers are experiencing high demand right now. Please try again in a few moments.`;
        if (onChunk) {
          onChunk(errorMsg);
        }
        return errorMsg;
      }
    }
  }

  private async _generateWithRetry(
    modelName: string,
    prompt: string,
    systemInstruction: string,
    onChunk?: (chunk: string) => void,
    maxRetries = 3,
  ): Promise<string> {
    let delayMs = 1500;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: this.apiKey });

        // 3. CONFIG OBJECT GOES HERE (Output limits, temperature, system instruction)
        const responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            maxOutputTokens: 2048,
            temperature: 0.2,
          }
        });

        let fullText = "";
        
        // 4. 40MS CHUNK BUFFERING GOES HERE (Prevents IPC bridge throttling)
        let buffer = "";
        let lastFlush = Date.now();

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            fullText += text;
            buffer += text;
          }

          const now = Date.now();
          if (now - lastFlush >= 40 && buffer.length > 0) {
            if (onChunk) {
              onChunk(buffer);
            }
            buffer = "";
            lastFlush = now;
          }
        }

        // Flush remaining buffer data
        if (buffer.length > 0 && onChunk) {
          onChunk(buffer);
        }

        return fullText || "No response returned from Gemini.";
      } catch (error: any) {
        const errString = error?.message || String(error);
        const isCapacityError =
          errString.includes("503") ||
          errString.includes("429") ||
          errString.includes("UNAVAILABLE") ||
          errString.includes("high demand");

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