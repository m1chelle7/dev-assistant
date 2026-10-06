import * as vscode from "vscode";
import { SidebarProvider } from "./providers/SidebarProvider";

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new SidebarProvider(context.extensionUri, context);

  // Register Webview Sidebar Provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider
    )
  );

  // Command to reset or change API key
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "ai-coding-assistant.resetApiKey",
      async () => {
        await context.secrets.delete("GEMINI_API_KEY");
        const newKey = await vscode.window.showInputBox({
          prompt: "Enter your new Gemini API Key",
          password: true,
          ignoreFocusOut: true,
        });
        if (newKey) {
          await context.secrets.store("GEMINI_API_KEY", newKey);
          vscode.window.showInformationMessage(
            "Gemini API Key updated successfully!"
          );
        }
      }
    )
  );

  // Right-Click Editor Context Menu Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("gemini.explainCode", () => {
      sidebarProvider.executePromptFromCommand(
        "Explain what this highlighted code does step-by-step and highlight key edge cases."
      );
    }),
    vscode.commands.registerCommand("gemini.refactorCode", () => {
      sidebarProvider.executePromptFromCommand(
        "Refactor and optimize this highlighted code for readability, performance, and best practices."
      );
    }),
    vscode.commands.registerCommand("gemini.generateTests", () => {
      sidebarProvider.executePromptFromCommand(
        "Write comprehensive unit tests covering main functions, edge cases, and failure modes for this highlighted code."
      );
    })
  );
}

export function deactivate() {}