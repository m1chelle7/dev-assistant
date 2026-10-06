export interface AIProvider {
    /**
     * Sends a question along with highlighted code context to the AI model
     * and returns the text response.
     */
    ask(question: string, code: string): Promise<string>;
}