export interface AIProvider {
    ask(
        question: string,
        code: string,
        onChunk?: (chunk: string) => void
    ): Promise<string>;
}