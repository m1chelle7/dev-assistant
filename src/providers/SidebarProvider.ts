import * as vscode from 'vscode';
import { GeminiProvider } from './GeminiProvider';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'gemini-sidebar-view';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages sent from the sidebar HTML UI
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'askGemini': {
                    const apiKey = await this._context.secrets.get('GEMINI_API_KEY');

                    if (!apiKey) {
                        this._view?.webview.postMessage({
                            type: 'addResponse',
                            text: '⚠️ No API Key found. Run command **Gemini: Reset API Key** to set one.'
                        });
                        return;
                    }

                    const provider = new GeminiProvider(apiKey);

                    // Fetch highlighted text from current active editor if available
                    const editor = vscode.window.activeTextEditor;
                    const selectedText = editor
                        ? editor.document.getText(editor.selection)
                        : '';

                    this._view?.webview.postMessage({
                        type: 'setLoading',
                        loading: true
                    });

                    const response = await provider.ask(data.prompt, selectedText);

                    this._view?.webview.postMessage({
                        type: 'setLoading',
                        loading: false
                    });

                    this._view?.webview.postMessage({
                        type: 'addResponse',
                        text: response
                    });

                    break;
                }
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return /* html */ `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <meta
                    http-equiv="Content-Security-Policy"
                    content="default-src 'none'; style-src 'unsafe-inline' https://cdn.jsdelivr.net; script-src 'unsafe-inline' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net;"
                >

                <!-- highlight.js theme -->
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/github-dark.min.css"
                >

                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 10px;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-sideBar-background);
                        display: flex;
                        flex-direction: column;
                        height: 95vh;
                    }

                    #chat-history {
                        flex: 1;
                        overflow-y: auto;
                        margin-bottom: 10px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }

                    .msg {
                        padding: 8px 12px;
                        border-radius: 6px;
                        font-size: 13px;
                        line-height: 1.4;
                        white-space: pre-wrap;
                        word-break: break-word;
                    }

                    .user-msg {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        align-self: flex-end;
                        max-width: 85%;
                    }

                    .ai-msg {
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        color: var(--vscode-editor-foreground);
                        align-self: flex-start;
                        max-width: 95%;
                        border: 1px solid var(--vscode-widget-border);
                    }

                    /* Markdown paragraphs */
                    .ai-msg p {
                        margin: 0 0 8px 0;
                    }

                    .ai-msg p:last-child {
                        margin-bottom: 0;
                    }

                    /* Markdown lists */
                    .ai-msg ul,
                    .ai-msg ol {
                        margin: 6px 0;
                        padding-left: 20px;
                    }

                    .ai-msg li {
                        margin: 3px 0;
                    }

                    /* Markdown headings */
                    .ai-msg h1,
                    .ai-msg h2,
                    .ai-msg h3,
                    .ai-msg h4 {
                        margin: 10px 0 6px 0;
                        color: var(--vscode-editor-foreground);
                    }

                    .ai-msg h1 {
                        font-size: 1.3em;
                    }

                    .ai-msg h2 {
                        font-size: 1.2em;
                    }

                    .ai-msg h3 {
                        font-size: 1.1em;
                    }

                    /* Inline code */
                    .ai-msg code {
                        font-family: var(--vscode-editor-font-family);
                        font-size: 0.9em;
                        background: var(--vscode-textCodeBlock-background);
                        color: var(--vscode-textPreformat-foreground);
                        padding: 2px 4px;
                        border-radius: 3px;
                    }

                    /* Code blocks */
                    .ai-msg pre {
                        margin: 8px 0;
                        padding: 10px;
                        overflow-x: auto;
                        border-radius: 5px;
                        background: var(--vscode-textCodeBlock-background);
                        border: 1px solid var(--vscode-widget-border);
                    }

                    .ai-msg pre code {
                        display: block;
                        padding: 0;
                        background: transparent;
                        color: inherit;
                        font-size: 0.9em;
                        white-space: pre;
                    }

                    /* Blockquotes */
                    .ai-msg blockquote {
                        margin: 8px 0;
                        padding-left: 10px;
                        border-left: 3px solid var(--vscode-textLink-foreground);
                        color: var(--vscode-descriptionForeground);
                    }

                    /* Links */
                    .ai-msg a {
                        color: var(--vscode-textLink-foreground);
                    }

                    /* Bold text */
                    .ai-msg strong {
                        font-weight: 600;
                    }

                    /* Markdown tables */
                    .ai-msg table {
                        border-collapse: collapse;
                        width: 100%;
                        margin: 8px 0;
                    }

                    .ai-msg th,
                    .ai-msg td {
                        border: 1px solid var(--vscode-widget-border);
                        padding: 5px 7px;
                        text-align: left;
                    }

                    .ai-msg th {
                        background: var(--vscode-editor-inactiveSelectionBackground);
                    }

                    #input-container {
                        display: flex;
                        gap: 6px;
                    }

                    textarea {
                        flex: 1;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        padding: 6px;
                        resize: none;
                        border-radius: 4px;
                        font-family: inherit;
                    }

                    textarea:disabled {
                        opacity: 0.6;
                    }

                    button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                    }

                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }

                    button:disabled {
                        opacity: 0.6;
                        cursor: default;
                    }
                </style>
            </head>

            <body>
                <div id="chat-history"></div>

                <div id="input-container">
                    <textarea
                        id="prompt"
                        rows="2"
                        placeholder="Ask Gemini (or highlight code & ask)..."
                    ></textarea>

                    <button id="send-btn">Send</button>
                </div>

                <!-- Markdown parser -->
                <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

                <!-- Syntax highlighting -->
                <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/lib/highlight.min.js"></script>

                <!-- HTML sanitization -->
                <script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js"></script>

                <script>
                    const vscode = acquireVsCodeApi();

                    marked.setOptions({
                        gfm: true,
                        breaks: true
                    });

                    const chatHistory = document.getElementById('chat-history');
                    const promptInput = document.getElementById('prompt');
                    const sendBtn = document.getElementById('send-btn');

                    sendBtn.addEventListener('click', () => {
                        const text = promptInput.value.trim();

                        if (!text) return;

                        appendMessage('user-msg', text);
                        promptInput.value = '';

                        vscode.postMessage({
                            type: 'askGemini',
                            prompt: text
                        });
                    });

                    // Enter submits the prompt.
                    // Shift + Enter creates a new line.
                    promptInput.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            sendBtn.click();
                        }
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;

                        switch (message.type) {
                            case 'setLoading':
                                sendBtn.disabled = message.loading;
                                promptInput.disabled = message.loading;
                                sendBtn.innerText = message.loading ? '...' : 'Send';
                                break;

                            case 'addResponse':
                                appendMessage('ai-msg', message.text);
                                break;
                        }
                    });

                    function appendMessage(className, text) {
                        const div = document.createElement('div');
                        div.className = 'msg ' + className;

                        if (className === 'ai-msg') {
                            const markdownHtml = marked.parse(text);

                            div.innerHTML = DOMPurify.sanitize(markdownHtml);

                            div.querySelectorAll('pre code').forEach((block) => {
                                hljs.highlightElement(block);
                            });
                        } else {
                            div.innerText = text;
                        }

                        chatHistory.appendChild(div);
                        chatHistory.scrollTop = chatHistory.scrollHeight;
                    }
                </script>
            </body>
            </html>
        `;
    }
}
