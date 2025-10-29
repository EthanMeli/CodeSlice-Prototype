# CodeSlice

A VS Code extension with a sidebar that lets you quickly "slice" your codebase into:
- Files: 5 random code files (excludes tests/docs)
- Tests: 5 random test files
- Documentation: 5 random documentation files
Plus a secondary “Slice” webview with a button to run the selection.

## Prerequisites

- Visual Studio Code ≥ 1.105.0
- Node.js ≥ 18 (recommended 18 or 20)
- On Windows, run commands in PowerShell

## Quick start

1) Install dependencies
```powershell
cd "CodeSlice-Prototype"
npm install
```

2) Launch the Extension Development Host
- Press F5 in VS Code (Debug: Start Debugging).
- This opens a new VS Code window labeled “Extension Development Host”.

3) Open the CodeSlice view
- In the Extension Development Host, open the Activity Bar icon “CodeSlice”.
- You’ll see four views within the CodeSlice container:
  - Files
  - Tests
  - Documentation
  - Slice (webview with a button)

4) Slice your workspace
- In the “Slice” view, click the “Slice” button.
- You’ll get an information message showing counts.
- The “Files”, “Tests”, and “Documentation” trees will populate with up to 5 items each.
- Click any item to open it in the editor.

Tip: You can also run the command “CodeSlice: Slice Code” from the Command Palette.

## Common tasks

- Auto-compile TypeScript while developing:
```powershell
npm run watch
```

- Run tests (optional; uses VS Code’s test runner):
  - Install the “Extension Test Runner” recommended extension.
  - Open the Testing panel and run tests, or:
```powershell
npm test
```

## How it works (quick overview)

- Views
  - Activity Bar container: “CodeSlice”
  - Tree views: Files, Tests, Documentation
  - Webview view: “Slice” (contains the button)
- On “Slice”:
  - Scans the workspace (ignoring common folders).
  - Categorizes files by heuristics:
    - Docs: README/CHANGELOG/CONTRIBUTING/LICENSE, .md/.mdx/.rst/.adoc/.txt, “docs” folders
    - Tests: `.test.*`, `.spec.*`, `_test.*`, “__tests__”, “test” or “tests” folders
    - Files: everything else (code)
  - Randomly selects up to 5 from each category and updates the three trees.
  - Clicking any item opens it with the built-in `vscode.open` command.

## Project layout

```
codeslice/
  ├─ src/
  │  ├─ extension.ts          # Extension activation + views + webview + slice logic
  │  └─ test/extension.test.ts
  ├─ package.json             # Contribution points, activation events, scripts
  ├─ tsconfig.json
  ├─ eslint.config.mjs
  ├─ media/                   # Icons (place your svg(s) here)
  └─ .vscode/                 # Launch & tasks configs
```