import * as vscode from 'vscode';
import { getNonce } from '../utils/webview';
import { JiraService } from '../services/jiraService';
import { JiraIssue } from '../types/jira';

export class CodeSliceSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _emitter = new vscode.EventEmitter<any>();
  public readonly onDidReceiveMessage = this._emitter.event;
  private _jiraTickets: JiraIssue[] = [];

  constructor(private readonly _context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri]
    };

    webviewView.webview.onDidReceiveMessage((message) => this._emitter.fire(message));
    webviewView.webview.html = this.getHtml(webviewView.webview);

    // Load Jira tickets on view creation
    this.loadJiraTickets();
  }

  // Load Jira tickets from the service
  private async loadJiraTickets() {
  try {
    const config = vscode.workspace.getConfiguration('codeslice.jira');
    const baseUrl = config.get<string>('baseUrl');
    const email = config.get<string>('email');
    const apiToken = config.get<string>('apiToken');

    console.log('Jira config:', { baseUrl: !!baseUrl, email: !!email, apiToken: !!apiToken });

    if (!baseUrl || !email || !apiToken) {
      console.log('Missing Jira configuration');
      return; // This will show "No Jira tickets found" message
    }

    console.log('Attempting to fetch Jira tickets...');
    const jiraService = new JiraService(baseUrl, email, apiToken);
    this._jiraTickets = await jiraService.getCurrentUserIssues();
    console.log(`Fetched ${this._jiraTickets.length} Jira tickets`);
    this.updateWebview();
  } catch (error) {
    console.error('Failed to load Jira tickets:', error);
    vscode.window.showErrorMessage(`Failed to load Jira tickets: ${error}`);
    // Keep _jiraTickets empty to show "No tickets found" message
  }
}

  // Update webview content with latest tickets
  private updateWebview() {
    if (this._view) {
      this._view.webview.html = this.getHtml(this._view.webview);
    }
  }

  // Add this method to CodeSliceSidebarProvider class
  public async refreshJiraTickets() {
    await this.loadJiraTickets();
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const csp = `
      default-src 'none';
      img-src ${webview.cspSource} https:;
      style-src 'nonce-${nonce}';
      script-src 'nonce-${nonce}';
    `.replace(/\s{2,}/g, ' ').trim();

    const ticketsHtml = this._jiraTickets.length > 0
      ? this._jiraTickets.map(ticket => `
        <div class="ticket-item" data-url="${ticket.url}">
          <div class="ticket-header">
            <span class="ticket-key">${ticket.key}</span>
            <span class="ticket-type ${ticket.issueType.toLowerCase()}">${ticket.issueType}</span>
          </div>
          <div class="ticket-title">${ticket.summary}</div>
            <div class="ticket-description">${ticket.description}</div>
            <div class="ticket-status">Status: ${ticket.status}</div>
          </div>
        `).join('')
      : '<div class="no-tickets">No Jira tickets found. Configure Jira integration in settings.</div>';

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="${csp}">
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>CodeSlice</title>
        <style nonce="${nonce}">
          body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px; }
          .welcome { margin-bottom: 12px; }
          button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none; padding: 6px 12px; cursor: pointer;
          }
          button:hover { background: var(--vscode-button-hoverBackground); }

          .tickets-section {
            border-top: 1px solid var(--vscode-panel-border);
            padding-top: 16px;
          }
          .tickets-title {
            font-weight: bold;
            margin-bottom: 12px;
            color: var(--vscode-foreground);
          }
          .ticket-item {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: background-color 0.1s;
          }
          .ticket-item:hover {
            background: var(--vscode-list-hoverBackground);
          }
          .ticket-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
          }
          .ticket-key {
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            color: var(--vscode-textLink-foreground);
            font-weight: bold;
          }
          .ticket-type {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 10px;
            text-transform: uppercase;
            font-weight: bold;
          }
          .ticket-type.bug { background: #f14c4c; color: white; }
          .ticket-type.story { background: #63ba3c; color: white; }
          .ticket-type.task { background: #4a90e2; color: white; }
          .ticket-type.epic { background: #904ee2; color: white; }
          .ticket-type.feature { background: #f7931e; color: white; }
          .ticket-title {
            font-weight: 500;
            margin-bottom: 4px;
            line-height: 1.3;
          }
          .ticket-description {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
            line-height: 1.2;
          }
          .ticket-status {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
          }
          .no-tickets {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            text-align: center;
            padding: 20px;
          }
        </style>
      </head>
      <body>
        <!-- Welcome Message and Slice Button -->
        <div class="welcome">Welcome to CodeSlice! Click Slice to pick 5 random files from your workspace.</div>
        <button id="sliceBtn" type="button">Slice</button>
        <button id="refreshBtn" type="button">Refresh Tickets</button>

        <!-- Jira Tickets Section -->
        <div class="tickets-section">
          <div class="tickets-title">My Jira Tickets</div>
          <div id="tickets-container">
            ${ticketsHtml}
          </div>
        </div>

        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          document.getElementById('sliceBtn')?.addEventListener('click', () => {
            vscode.postMessage({ type: 'slice' });
          });
          document.getElementById('refreshBtn')?.addEventListener('click', () => {
  vscode.postMessage({ type: 'refreshTickets' });
});

          // Handle ticket clicks
          document.querySelectorAll('.ticket-item').forEach(item => {
            item.addEventListener('click', () => {
              const url = item.getAttribute('data-url');
              if (url) {
                vscode.postMessage({ type: 'openTicket', url: url });
              }
            });
          });
        </script>
      </body>
      </html>`;
  }
}