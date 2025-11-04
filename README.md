# CodeSlice

A VS Code extension with a sidebar that lets you quickly "slice" your codebase into:
- Files: 5 random code files (excludes tests/docs)
- Tests: 5 random test files
- Documentation: 5 random documentation files

Plus a secondary “Slice” webview with:
- A Slice button to populate the three trees
- Your Jira tickets (type, title, short description) listed below the button

## Prerequisites

- Visual Studio Code ≥ 1.105.0
- Node.js ≥ 18 (recommended 18 or 20)
- A Jira account and API token (for ticket integration)

## Quick start

1) Open this folder in VS Code (the one that contains `package.json`):
```powershell
cd "CodeSlice-Prototype"
```

2) Install dependencies:
```powershell
npm install
```

3) Launch the Extension Development Host
- Press F5 in VS Code (Debug: Start Debugging).
- This opens a new VS Code window labeled “Extension Development Host”.

4) Open the CodeSlice view
- In the Extension Development Host, open the Activity Bar icon “CodeSlice”.
- You’ll see four views within the CodeSlice container:
  - Files
  - Tests
  - Documentation
  - Slice (webview with a button and the Jira section)

5) Slice your workspace
- In the “Slice” view, click the “Slice” button.
- You’ll get an information message showing counts.
- The “Files”, “Tests”, and “Documentation” trees will populate with up to 5 items each.
- Click any item to open it in the editor.

Tip: You can also run the command “CodeSlice: Slice Code” from the Command Palette.

## Jira Integration Setup

Use this to show your assigned Jira tickets under the Slice button (title, type, and a truncated description).

1) Create a Jira API token (Jira Cloud):
- Go to https://id.atlassian.com/manage-profile/security/api-tokens
- Click “Create API token” and copy it somewhere safe

2) Configure VS Code settings:
- Open Settings (Ctrl+,), search “codeslice”
- Set:
  - Codeslice › Jira: Base Url → e.g., https://yourcompany.atlassian.net
  - Codeslice › Jira: Email → your Jira login email
  - Codeslice › Jira: Api Token → the token you created

Alternatively, add to your user or workspace settings JSON:
```json
{
  "codeslice.jira.baseUrl": "https://yourcompany.atlassian.net",
  "codeslice.jira.email": "you@yourcompany.com",
  "codeslice.jira.apiToken": "YOUR_API_TOKEN_HERE"
}
```

3) Show tickets:
- In the Slice view, tickets appear automatically after the view loads (if settings are valid).
- If you don’t see them, use the refresh command below.

## Refreshing Jira Tickets

- Command Palette:
  - Run “CodeSlice: Refresh Jira Tickets”
- Webview (if available in your build):
  - Click “Refresh Tickets” in the Slice view

Note: If you don’t see the refresh command, make sure the extension version you’re running includes it and that `package.json` contributes the command `codeSlice.refreshJiraTickets`.

## Common issues and fixes

- “No Jira tickets found”
  - Ensure all three settings are set (baseUrl, email, apiToken)
  - Base URL must be your root Jira URL, without a trailing slash:
    - Correct: https://yourcompany.atlassian.net
    - Incorrect: https://yourcompany.atlassian.net/
  - You might not currently have assigned issues; try a broader JQL in future builds
  - Click “CodeSlice: Refresh Jira Tickets”

- “Failed to load Jira tickets: 401 Unauthorized”
  - Token or email is wrong; recreate the token and re-enter your email
  - Make sure the email matches the Atlassian account that generated the token

- “Failed to load Jira tickets: 410 Gone”
  - Your Jira instance may not support the endpoint version used by this build
  - Ensure your base URL is correct (Cloud is typically atlassian.net)
  - Update to the latest build of this extension if available

- Behind a corporate proxy
  - Configure VS Code proxy/network settings (File > Preferences > Settings > “proxy”)
  - Ensure the Extension Host can reach your Jira domain

- Nothing appears in Files/Tests/Documentation after slicing
  - Only common code/docs/tests are selected; large excluded folders (node_modules, .git, dist, out, build, venv, etc.) are ignored
  - Ensure you clicked the “Slice” button (or ran “CodeSlice: Slice Code”)

## Commands

- CodeSlice: Slice Code → Picks files and populates the three trees
- CodeSlice: Refresh Jira Tickets → Re-fetches your Jira tickets and updates the Slice view

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

- Views container: “CodeSlice” in the Activity Bar
- Trees:
  - Files (excludes tests/docs by heuristics)
  - Tests (typical patterns: .test., .spec., __tests__, test/tests folders)
  - Documentation (README/CHANGELOG/etc., markdown-like files, docs folders)
- Webview view: “Slice”
  - Slice button → triggers a workspace scan and random selection
  - Jira Tickets → uses your settings to call Jira’s REST API, renders ticket cards with:
    - Key and type badge
    - Title
    - Truncated description
    - Status
    - Click to open in your browser

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

## Security note

- Your Jira API token is stored in VS Code settings. Treat it like a password.
- Consider removing the token from workspace settings if committing to source control; prefer user settings.