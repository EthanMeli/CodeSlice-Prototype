/* Interface for Jira issue representation */

export interface JiraIssue {
  key: string;
  summary: string;
  description: string;
  issueType: string;
  status: string;
  priority: string;
  url: string;
}