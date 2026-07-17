# Compression policy (RTK + Headroom boundary)
- RTK: routine SHELL output first (git status/diff, search, test/lint/build, dir listings,
  container + package-manager output). Documented raw-output bypass must remain.
- Headroom: large NON-shell context (MCP results, JSON, docs, memory output, browser output)
  with reversible retrieval, conservative threshold, small-output bypass, short retention.
- Boundary: shell → RTK; large structured/tool output → Headroom. Do NOT double-compress
  RTK output through Headroom.
- Preserve RAW (never compress) for: checksums, exact byte/patch anchors, security evidence,
  full failing stack traces, compiler errors, migration output, data-loss warnings, or any
  case where compression creates ambiguity. Disable compression when accuracy is uncertain.
- Never hide a failure.
