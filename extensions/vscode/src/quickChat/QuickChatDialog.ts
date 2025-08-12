import { ConfigHandler } from "core/config/ConfigHandler";
import { Core } from "core/core";
import * as vscode from "vscode";
import { getRangeInFileWithContents } from "../util/addCode";
import { VsCodeWebviewProtocol } from "../webviewProtocol";

export class QuickChatDialog {
  private panel?: vscode.WebviewPanel;
  private selectedText: string = "";
  private selectedContext: string = "";
  private documentContext: string = "";

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly configHandler: ConfigHandler,
    private readonly core: Core,
    private readonly webviewProtocol: VsCodeWebviewProtocol,
  ) {}

  public async show() {
    // Get selected text
    const rangeInFileWithContents = getRangeInFileWithContents();
    if (!rangeInFileWithContents) {
      vscode.window.showWarningMessage("Please select some text first");
      return;
    }

    this.selectedText = rangeInFileWithContents.contents;
    this.selectedContext = `File: ${rangeInFileWithContents.filepath}\nSelected content:\n${this.selectedText}`;

    // Get entire document context
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const document = activeEditor.document;
      this.documentContext = document.getText();
    }

    // If window is already open, focus to existing window
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    // Create new webview panel
    this.panel = vscode.window.createWebviewPanel(
      "quickChatDialog",
      "🤖 AI Quick Chat Assistant",
      {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: false,
      },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri],
      },
    );

    this.panel.webview.html = this.getWebviewContent();

    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message),
      undefined,
      this.context.subscriptions,
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  private getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Quick Chat</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            margin-bottom: 15px;
            padding: 10px;
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            border-radius: 4px;
        }
        
        .selected-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            max-height: 100px;
            overflow-y: auto;
            white-space: pre-wrap;
            font-family: var(--vscode-editor-font-family);
        }
        
        .context-info {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
            font-style: italic;
        }
        
        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }
        
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            margin-bottom: 15px;
        }
        
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 6px;
            white-space: pre-wrap;
        }
        
        .message.user {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: 50px;
        }
        
        .message.assistant {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textBlockQuote-border);
        }
        
        .message.loading {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-progressBar-background);
            font-style: italic;
            color: var(--vscode-descriptionForeground);
        }
        
        .input-container {
            display: flex;
            gap: 10px;
        }
        
        .input-box {
            flex: 1;
            padding: 10px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-family: inherit;
            resize: vertical;
            min-height: 60px;
        }
        
        .input-box:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        
        .send-button {
            padding: 10px 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            height: fit-content;
        }
        
        .send-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .send-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .clear-button {
            padding: 5px 10px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            align-self: flex-start;
        }
        
        .clear-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div class="header">
        <div>📝 <strong>Selected Content:</strong></div>
        <div class="selected-text">${this.selectedText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        <div class="context-info">✨ Full document context will be included in AI analysis</div>
    </div>
    
    <div class="chat-container">
        <div class="messages" id="messages"></div>
        
        <div class="input-container">
            <textarea 
                class="input-box" 
                id="userInput" 
                placeholder="Ask a question about the selected code or document..."
                rows="3"
            ></textarea>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <button class="send-button" id="sendButton">Send</button>
                <button class="clear-button" id="clearButton">Clear Chat</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesContainer = document.getElementById('messages');
        const userInput = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');
        const clearButton = document.getElementById('clearButton');
        
        let isLoading = false;
        
        function addMessage(content, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + type;
            messageDiv.textContent = content;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        function setLoading(loading) {
            isLoading = loading;
            sendButton.disabled = loading;
            sendButton.textContent = loading ? 'Sending...' : 'Send';
            
            if (loading) {
                addMessage('AI is thinking...', 'loading');
            }
        }
        
        function sendMessage() {
            const message = userInput.value.trim();
            if (!message || isLoading) return;
            
            addMessage(message, 'user');
            userInput.value = '';
            setLoading(true);
            
            vscode.postMessage({
                command: 'sendMessage',
                text: message
            });
        }
        
        function clearChat() {
            messagesContainer.innerHTML = '';
        }
        
        // Event listeners
        sendButton.addEventListener('click', sendMessage);
        clearButton.addEventListener('click', clearChat);
        
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Listen to messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'aiResponse':
                    // Remove loading messages
                    const loadingMessages = messagesContainer.querySelectorAll('.message.loading');
                    loadingMessages.forEach(msg => msg.remove());
                    
                    addMessage(message.text, 'assistant');
                    setLoading(false);
                    break;
                    
                case 'aiError':
                    // Remove loading messages
                    const loadingMsgs = messagesContainer.querySelectorAll('.message.loading');
                    loadingMsgs.forEach(msg => msg.remove());
                    
                    addMessage('❌ Error: ' + message.error, 'assistant');
                    setLoading(false);
                    break;
            }
        });
        
        // Focus on input box
        userInput.focus();
    </script>
</body>
</html>`;
  }

  private async handleMessage(message: any) {
    switch (message.command) {
      case "sendMessage":
        await this.handleUserMessage(message.text);
        break;
    }
  }

  private async handleUserMessage(userMessage: string) {
    try {
      const { config } = await this.configHandler.loadConfig();
      if (!config) {
        throw new Error("Configuration not loaded");
      }

      const llm = config.selectedModelByRole.chat;
      if (!llm) {
        throw new Error(
          "No chat model found. Please configure a chat model in your settings",
        );
      }

      // Build complete prompt with both selected content and document context
      const fullPrompt = `You are an AI assistant helping with code analysis. Please answer the user's question based on the following context:

**Selected Content:**
File: ${this.selectedContext}

**Full Document Context:**
\`\`\`
${this.documentContext}
\`\`\`

**User Question:** ${userMessage}

Please provide a clear, accurate, and helpful response. Consider both the selected content and the broader document context in your analysis.`;

      // Call AI model
      const response = await llm.chat(
        [{ role: "user", content: fullPrompt }],
        new AbortController().signal,
      );

      // Send AI response to webview
      this.panel?.webview.postMessage({
        command: "aiResponse",
        text: response.content,
      });
    } catch (error) {
      // Send error message to webview
      this.panel?.webview.postMessage({
        command: "aiError",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  public dispose() {
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }
  }
}
