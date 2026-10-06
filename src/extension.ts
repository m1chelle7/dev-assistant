import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Coding Assistant is active!');

    const disposable = vscode.commands.registerCommand('ai-coding-assistant.askAI', async () => {
        // 1. Get active text editor
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showWarningMessage('No active code editor found.');
            return;
        }

        // 2. Extract selected code
        const selectedText = editor.document.getText(editor.selection);

        if (!selectedText || selectedText.trim() === '') {
            vscode.window.showInformationMessage('Please highlight some code first!');
            return;
        }

        // 3. Prompt user for their question using VS Code InputBox
        const userQuestion = await vscode.window.showInputBox({
            prompt: 'Ask AI a question about your selected code',
            placeHolder: 'e.g., Why could this return undefined?'
        });

        // Handle case where user presses Esc or leaves input blank
        if (!userQuestion || userQuestion.trim() === '') {
            return;
        }

        // 4. Temporary verification: output both question and selected code
        vscode.window.showInformationMessage(`Question: "\({userQuestion}" | Code length:\){selectedText.length} chars`);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}