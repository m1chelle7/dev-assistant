import * as vscode from 'vscode';
import { SidebarProvider } from './providers/SidebarProvider';

export function activate(context: vscode.ExtensionContext) {
    const sidebarProvider = new SidebarProvider(context.extensionUri, context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarProvider.viewType,
            sidebarProvider
        )
    );

    // Command to reset or change API key
    context.subscriptions.push(
        vscode.commands.registerCommand('ai-coding-assistant.resetApiKey', async () => {
            await context.secrets.delete('GEMINI_API_KEY');
            const newKey = await vscode.window.showInputBox({
                prompt: 'Enter your new Gemini API Key',
                password: true,
                ignoreFocusOut: true
            });
            if (newKey) {
                await context.secrets.store('GEMINI_API_KEY', newKey);
                vscode.window.showInformationMessage('Gemini API Key updated successfully!');
            }
        })
    );
}

export function deactivate() {}