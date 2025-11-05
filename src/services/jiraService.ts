import { Buffer } from 'buffer';
import { JiraIssue } from '../types/jira';

// Service to interact with Jira REST API

export class JiraService {
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
        if (accumulated.length >= maxToReturn) {
					break;
				}
      }

      // Stop if we've read all issues
      startAt = (data.startAt ?? startAt) + (data.maxResults ?? pageSize);
      const total = data.total ?? accumulated.length;
      if (startAt >= total) {
				break;
			}
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
    if (!desc) {
			return 'No description';
		}
    if (typeof desc === 'string') {
			return desc.trim() || 'No description';
		}

    // ADF object: walk blocks and pull out text nodes
    try {
      if (Array.isArray(desc.content)) {
        const parts: string[] = [];
        const walk = (node: any) => {
          if (!node) {
						return;
					}
          if (node.type === 'text' && node.text) {
						parts.push(node.text);
					}
          if (Array.isArray(node.content)) {
						node.content.forEach(walk);
					}
        };
        desc.content.forEach(walk);
        const text = parts.join(' ').replace(/\s+/g, ' ').trim();
        return text || 'No description';
      }
    } catch { /* ignore and fall through */ }
    return 'No description';
  }
}