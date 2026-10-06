import * as vscode from 'vscode';
import { GeminiProvider } from './providers/GeminiProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Coding Assistant is active!');

    const disposable = vscode.commands.registerCommand('ai-coding-assistant.askAI', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showWarningMessage('No active code editor found.');
            return;
        }

        const selectedText = editor.document.getText(editor.selection);

        if (!selectedText || selectedText.trim() === '') {
            vscode.window.showInformationMessage('Please highlight some code first!');
            return;
        }

        // 1. Check for stored API key in secret storage
        let apiKey = await context.secrets.get('GEMINI_API_KEY');

        if (!apiKey) {
            apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your Gemini API Key',
                placeHolder: 'AIzaSy...',
                password: true,
                ignoreFocusOut: true
            });

            if (!apiKey) {
                vscode.window.showWarningMessage('API key is required to use Gemini.');
                return;
            }

            await context.secrets.store('GEMINI_API_KEY', apiKey);
        }

        // 2. Get user question
        const userQuestion = await vscode.window.showInputBox({
            prompt: 'Ask AI a question about your selected code',
            placeHolder: 'e.g., Why could this return undefined?'
        });

        if (!userQuestion || userQuestion.trim() === '') {
            return;
        }

        // 3. Call live Gemini API
        const provider = new GeminiProvider(apiKey);
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Asking Gemini...",
            cancellable: false
        }, async () => {
            const response = await provider.ask(userQuestion, selectedText);
            vscode.window.showInformationMessage(response, { modal: true });
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}