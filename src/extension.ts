// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path'; // Import path module for selecting files

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

	// Bridge messages from webview to handler
	sliceProvider.onDidReceiveMessage(async (message) => {
		if (message?.type === 'slice') {
			await sliceAndNotify(filesProvider, testsProvider, docsProvider);
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

	constructor(private readonly _context: vscode.ExtensionContext) {}

	resolveWebviewView(webviewView: vscode.WebviewView) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._context.extensionUri]
		};

		webviewView.webview.onDidReceiveMessage((message) => this._emitter.fire(message));
		webviewView.webview.html = this.getHtml(webviewView.webview);
	}

	private getHtml(webview: vscode.Webview): string {
		const nonce = getNonce();
		const csp = `
			default-src 'none';
			img-src ${webview.cspSource} https:;
			style-src 'nonce-${nonce}';
			script-src 'nonce-${nonce}';
		`.replace(/\s{2,}/g, ' ').trim();

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
				</style>
			</head>
			<body>
				<div class="welcome">Welcome to CodeSlice! Click Slice to pick 5 random files from your workspace.</div>
				<button id="sliceBtn" type="button">Slice</button>

				<script nonce="${nonce}">
					const vscode = acquireVsCodeApi();
					document.getElementById('sliceBtn')?.addEventListener('click', () => {
						vscode.postMessage({ type: 'slice' });
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
