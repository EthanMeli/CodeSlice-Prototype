// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path'; // Import path module for selecting files
import { Buffer } from 'buffer';

// Interface for Jira issue representation
interface JiraIssue {
	key: string;
	summary: string;
	description: string;
	issueType: string;
	status: string;
	priority: string;
	url: string;
}

// Service to interact with Jira REST API
class JiraService {
  constructor(private baseUrl: string, private email: string, private apiToken: string) {}

  private get headers() {
    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    };
  }

  /**
   * Fetch issues assigned to the current user (paginated).
   * Uses GET /rest/api/3/search/jql with URL-encoded query params.
   */
  async getCurrentUserIssues(maxToReturn: number = 10): Promise<JiraIssue[]> {
    const accumulated: JiraIssue[] = [];
    let startAt = 0;
    const pageSize = Math.min(50, maxToReturn); // Jira allows up to 100; 50 is a safe default

    // Build the static part of our query string
    const fields = ['summary','description','issuetype','status','priority'];
    const baseQs = new URLSearchParams({
      jql: 'assignee = currentUser() ORDER BY updated DESC',
      fields: fields.join(','),       // comma-separated per docs
      // you can also add: expand=names if you need field name maps
    });

    while (accumulated.length < maxToReturn) {
      const pageQs = new URLSearchParams(baseQs);
      pageQs.set('startAt', String(startAt));
      pageQs.set('maxResults', String(Math.min(pageSize, maxToReturn - accumulated.length)));

      const url = `${this.baseUrl.replace(/\/+$/,'')}/rest/api/3/search/jql?${pageQs.toString()}`;
      const res = await fetch(url, { method: 'GET', headers: this.headers });

      if (!res.ok) {
        const text = await res.text();
        // common helpful hint for 401/403/400
        let hint = '';
        if (res.status === 401 || res.status === 403) {
          hint = ' Check your site URL (e.g. https://yourcompany.atlassian.net), email, and API token permissions.';
        } else if (res.status === 400) {
          hint = ' The JQL or fields may be invalid for this site.';
        }
        throw new Error(`Jira API error: ${res.status} ${res.statusText} - ${text}${hint}`);
      }

      const data = await res.json() as {
        issues: any[];
        startAt: number;
        maxResults: number;
        total: number;
      };

      for (const issue of data.issues) {
        accumulated.push(this.transformIssue(issue));
        if (accumulated.length >= maxToReturn) break;
      }

      // Stop if we've read all issues
      startAt = (data.startAt ?? startAt) + (data.maxResults ?? pageSize);
      const total = data.total ?? accumulated.length;
      if (startAt >= total) break;
    }

    return accumulated;
  }

  private transformIssue(issue: any): JiraIssue {
    const description = this.extractDescription(issue?.fields?.description);
    const maxLength = 100;
    const truncated = description.length > maxLength ? description.slice(0, maxLength) + '…' : description;

    return {
      key: issue.key,
      summary: issue?.fields?.summary ?? 'No Summary',
      description: truncated,
      issueType: issue?.fields?.issuetype?.name ?? 'Unknown',
      status: issue?.fields?.status?.name ?? 'Unknown',
      priority: issue?.fields?.priority?.name ?? 'Unknown',
      url: `${this.baseUrl.replace(/\/+$/,'')}/browse/${issue.key}`
    };
  }

  // Works for ADF or plain text
  private extractDescription(desc: any): string {
    if (!desc) return 'No description';
    if (typeof desc === 'string') return desc.trim() || 'No description';

    // ADF object: walk blocks and pull out text nodes
    try {
      if (Array.isArray(desc.content)) {
        const parts: string[] = [];
        const walk = (node: any) => {
          if (!node) return;
          if (node.type === 'text' && node.text) parts.push(node.text);
          if (Array.isArray(node.content)) node.content.forEach(walk);
        };
        desc.content.forEach(walk);
        const text = parts.join(' ').replace(/\s+/g, ' ').trim();
        return text || 'No description';
      }
    } catch { /* ignore and fall through */ }
    return 'No description';
  }
}

// Provider for "Files" view
class FileItem extends vscode.TreeItem {
	constructor(public readonly uri?: vscode.Uri) {
		super(
			uri ? path.basename(uri.fsPath) : 'No files selected. Click Slice to pick files.',
			vscode.TreeItemCollapsibleState.None
		);
		if (uri) {
			this.resourceUri = uri; // enables file icon theming
			const rel = vscode.workspace.asRelativePath(uri);
			this.tooltip = rel;
			const dir = path.dirname(rel);
			this.description = dir === '.' ? '' : dir.replace(/\\/g, '/');
			this.iconPath = vscode.ThemeIcon.File;
			this.command = {
				command: 'vscode.open',
				title: 'Open File',
				arguments: [uri]
			};
		} else {
			this.iconPath = new vscode.ThemeIcon('circle-large-outline');
		}
	}
}

class FilesProvider implements vscode.TreeDataProvider<FileItem> {
	private _files: vscode.Uri[] = [];
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	getTreeItem(element: FileItem): vscode.TreeItem {
		return element;
	}

	getChildren(): Thenable<FileItem[]> {
		if (this._files.length === 0) {
			return Promise.resolve([new FileItem(undefined)]);
		}
		return Promise.resolve(this._files.map((u) => new FileItem(u)));
	}

	setFiles(uris: vscode.Uri[]) {
		this._files = uris;
		this._onDidChangeTreeData.fire();
	}
}

class TestsProvider implements vscode.TreeDataProvider<FileItem> {
	private _files: vscode.Uri[] = [];
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	getTreeItem(element: FileItem): vscode.TreeItem {
		return element;
	}

	getChildren(): Thenable<FileItem[]> {
		if (this._files.length === 0) {
			return Promise.resolve([new FileItem(undefined)]);
		}
		return Promise.resolve(this._files.map((u) => new FileItem(u)));
	}

	setFiles(uris: vscode.Uri[]) {
		this._files = uris;
		this._onDidChangeTreeData.fire();
	}
}

class DocsProvider implements vscode.TreeDataProvider<FileItem> {
	private _files: vscode.Uri[] = [];
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	getTreeItem(element: FileItem): vscode.TreeItem {
		return element;
	}

	getChildren(): Thenable<FileItem[]> {
		if (this._files.length === 0) {
			return Promise.resolve([new FileItem(undefined)]);
		}
		return Promise.resolve(this._files.map((u) => new FileItem(u)));
	}

	setFiles(uris: vscode.Uri[]) {
		this._files = uris;
		this._onDidChangeTreeData.fire();
	}
}

// Simple tree item and provider to show placeholder message in each section
class SectionItem extends vscode.TreeItem {
	constructor(label: string) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.contextValue = 'codeslice.sectionItem';
	}
}

class SectionProvider implements vscode.TreeDataProvider<SectionItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(private readonly placeholder: string) {}

	getTreeItem(element: SectionItem): vscode.TreeItem {
		return element;
	}

	getChildren(): Thenable<SectionItem[]> {
		return Promise.resolve([new SectionItem(this.placeholder)]);
	}

	refresh() {
		this._onDidChangeTreeData.fire();
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Register three section providers under CodeSlice container
	const filesProvider = new FilesProvider();
	const testsProvider = new TestsProvider();
	const docsProvider = new DocsProvider();

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('codeSlice.files', filesProvider),
		vscode.window.registerTreeDataProvider('codeSlice.tests', testsProvider),
		vscode.window.registerTreeDataProvider('codeSlice.docs', docsProvider)
	);

	// Webview-based secondary view: "Slice"
	const sliceProvider = new CodeSliceSidebarProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('codeSlice.sidebar', sliceProvider)
	);

	// Trigger action from Command Palette
	context.subscriptions.push(
		vscode.commands.registerCommand('codeSlice.slice', async () => {
			await sliceAndNotify(filesProvider, testsProvider, docsProvider);
		})
	);

	// Add refresh Jira tickets command
	context.subscriptions.push(
		vscode.commands.registerCommand('codeSlice.refreshJiraTickets', async () => {
			await sliceProvider.refreshJiraTickets();
			vscode.window.showInformationMessage('Jira tickets refreshed!');
		})
	);

	// Bridge messages from webview to handler
	sliceProvider.onDidReceiveMessage(async (message) => {
		if (message?.type === 'slice') {
			await sliceAndNotify(filesProvider, testsProvider, docsProvider);
		} else if (message?.type === 'openTicket') {
			vscode.env.openExternal(vscode.Uri.parse(message.url));
		} else if (message?.type === 'refreshTickets') {
			await sliceProvider.refreshJiraTickets();
		}
	});
}

async function sliceAndNotify(filesProvider: FilesProvider, testsProvider: TestsProvider, docsProvider: DocsProvider) {
	// Find files across workspace, exclusing common folders
	const exclude = '{**/node_modules/**,**/.git/**,**/dist/**,**/out/**,**/build/**,**/.venv/**,**/venv/**,**/.cache/**,**/target/**,**/bin/**}';
	const all = await vscode.workspace.findFiles('**/*', exclude, 20000);

	if (!all || all.length === 0) {
		vscode.window.showInformationMessage('No files found in the current workspace.');
		return;
	}

	const code: vscode.Uri[] = [];
	const tests: vscode.Uri[] = [];
	const docs: vscode.Uri[] = [];

	for (const uri of all) {
		const p = uri.fsPath;
		const lower = p.toLowerCase();
		if (isDocFile(lower)) {
			docs.push(uri);
		} else if (isTestFile(lower)) {
			tests.push(uri);
		} else {
			code.push(uri);
		}
	}

	const selectedCode = pickRandom(code, 5);
	const selectedTests = pickRandom(tests, 5);
	const selectedDocs = pickRandom(docs, 5);

	filesProvider.setFiles(selectedCode);
	testsProvider.setFiles(selectedTests);
	docsProvider.setFiles(selectedDocs);

	vscode.window.showInformationMessage(
		`Selected files - Code: ${selectedCode.length}, Tests: ${selectedTests.length}, Docs: ${selectedDocs.length}`
	);
}

function pickRandom<T>(arr: T[], count: number): T[] {
	if (arr.length <= count) { return [...arr]; }
	const picked: T[] = [];
	const used = new Set<number>();
	while (picked.length < count) {
		const i = Math.floor(Math.random() * arr.length);
		if (!used.has(i)) {
			used.add(i);
			picked.push(arr[i]);
		}
	}
	return picked;
}

// Heuristics for test and documentation files
function isTestFile(fsPathLower: string): boolean {
	const base = path.basename(fsPathLower);

	// Common markers: .test., .spec., _test, -test
	if (/\.(test|spec)\.[a-z0-9]+$/.test(base)) { return true; }
  if (/(_|-)?test\.[a-z0-9]+$/.test(base)) { return true; }

  // Language-specific common endings
  if (/\.(test|spec)\.(js|cjs|mjs|ts|tsx|jsx|vue|svelte)$/.test(base)) { return true; }
  if (/(_|-)?test\.(js|cjs|mjs|ts|tsx|jsx|py|rb|go|java|kt|cs)$/.test(base)) { return true; }

  // Test directories: __tests__, test, tests
  if (/[\/\\]__tests__[\/\\]/.test(fsPathLower)) { return true; }
  if (/[\/\\](test|tests)[\/\\]/.test(fsPathLower)) { return true; }

  return false;
}

function isDocFile(fsPathLower: string): boolean {
  const base = path.basename(fsPathLower);

  // README, CHANGELOG, CONTRIBUTING, LICENSE
  if (/^(readme|changelog|contributing|license)(\.[a-z0-9]+)?$/.test(base)) { return true; }

  // Markdown and common docs
  if (/\.(md|mdx|rst|adoc|asciidoc|org|txt)$/.test(base)) { return true; }

  // Docs directories
  if (/[\/\\](docs|documentation)[\/\\]/.test(fsPathLower)) { return true; }

  return false;
}

class CodeSliceSidebarProvider implements vscode.WebviewViewProvider {
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
				<div class="welcome">Welcome to CodeSlice! Click Slice to pick 5 random files from your workspace.</div>
				<button id="sliceBtn" type="button">Slice</button>
				<button id="refreshBtn" type="button">Refresh Tickets</button>

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

function getNonce() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

// This method is called when your extension is deactivated
export function deactivate() {}
