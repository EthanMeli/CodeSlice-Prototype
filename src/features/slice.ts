import * as vscode from 'vscode';
import { FilesProvider, TestsProvider, DocsProvider } from '../providers';
import { isDocFile, isTestFile } from '../utils/heuristics';
import { pickRandom } from '../utils/selection';
import { EXCLUDE_GLOBS } from '../utils/globs';

/* Main slicing function - categorizes files and notifies user */

export async function sliceAndNotify(
  filesProvider: FilesProvider,
  testsProvider: TestsProvider,
  docsProvider: DocsProvider
) {
  const all = await vscode.workspace.findFiles('**/*', EXCLUDE_GLOBS, 20000);
  if (!all || all.length === 0) {
    vscode.window.showInformationMessage('No files found in the current workspace.');
    return;
  }

  const code: vscode.Uri[] = [];
  const tests: vscode.Uri[] = [];
  const docs: vscode.Uri[] = [];

  for (const uri of all) {
    const lower = uri.fsPath.toLowerCase();
    if (isDocFile(lower)) {
      docs.push(uri);
    }
    else if (isTestFile(lower)) {
      tests.push(uri);
    }
    else {
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