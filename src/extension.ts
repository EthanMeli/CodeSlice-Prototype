// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { FilesProvider, TestsProvider, DocsProvider } from './providers';
import { CodeSliceSidebarProvider } from './views/sliceViewProvider';
import { sliceAndNotify } from './features/slice';

// This method is called when the extension is activated
// The extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Tree providers for primary views
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

	/* Command Registration */

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

// This method is called when the extension is deactivated
export function deactivate() {}
