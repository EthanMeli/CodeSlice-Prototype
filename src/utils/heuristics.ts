import * as path from 'path';

/* Heuristics for test and documentation files */

export function isTestFile(fsPathLower: string): boolean {
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

export function isDocFile(fsPathLower: string): boolean {
  const base = path.basename(fsPathLower);

  // README, CHANGELOG, CONTRIBUTING, LICENSE
  if (/^(readme|changelog|contributing|license)(\.[a-z0-9]+)?$/.test(base)) { return true; }

  // Markdown and common docs
  if (/\.(md|mdx|rst|adoc|asciidoc|org|txt)$/.test(base)) { return true; }

  // Docs directories
  if (/[\/\\](docs|documentation)[\/\\]/.test(fsPathLower)) { return true; }

  return false;
}