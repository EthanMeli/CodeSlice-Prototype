import * as vscode from 'vscode';
import * as path from 'path';

/* Represents a file item in the tree view */

export class FileItem extends vscode.TreeItem {
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