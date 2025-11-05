import * as vscode from 'vscode';
import { FileItem } from './fileItem';

/* Provides data for the tests tree view */

export class DocsProvider implements vscode.TreeDataProvider<FileItem> {
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