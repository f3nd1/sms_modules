# Security policy
- Never expose credentials, tokens, cookies, private keys, connection strings, or
  authenticated browser state. Redact credential-like values in every report.
- Never weaken validation or security to save tokens.
- Deny-read globs for secrets are set in ~/.claude/settings.json (narrow patterns only).
- No sudo without explicit approval. Never pipe unreviewed remote scripts to a shell;
  download+inspect first when no package manager is available.
- Never mix memory/cache/graph/receipts/browser state between unrelated projects.
- HIGH-RISK tasks require human confirmation before destructive/irreversible actions.
