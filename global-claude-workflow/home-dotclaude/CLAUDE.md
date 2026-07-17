# Global Engineering Workflow

Reusable engineering behavior for every project. **Project-specific facts live only
in the project** (its `CLAUDE.md`, docs, and the external profile under
`~/.global-claude-workflow/projects/<id>/`). Detect per project; never carry facts
across repos.

## Cross-project safety (absolute)
- Never assume two repositories use the same conventions, stack, branches, or provider.
- Never carry architecture, patterns, or memory from one repo into another unless the user explicitly asks.
- Never scan a parent workspace that contains multiple repositories.
- Never modify project-level Claude configuration as a side effect of ordinary coding.
- Never create application code as part of workflow/tooling setup.
- Existing project instructions win for project-specific conventions. Global security rules cannot be weakened silently.

## Every implementation / defect task
1. Detect project root + identity (`~/.global-claude-workflow/bin/detect-project`).
2. Load project instructions + external profile; treat stale profiles as non-authoritative.
3. Inspect VC state (branch, worktree, remote — redacted).
4. Write a compact task brief (template in `~/.global-claude-workflow/templates`).
5. Classify: **FAST / STANDARD / HIGH-RISK** (see policies/GLOBAL_WORKFLOW.md).
6. Run the **Ponytail minimal-diff pre-write gate** before writing production code.
7. Retrieve only bounded context: ≤3 proven memories, ≤3 gotchas, ≤1 pattern, ≤2 global prefs.
8. Use the fresh project cache before broad discovery.
9. Use Graphify only when structural discovery is genuinely needed — never at startup, never on a parent workspace.
10. Inspect the smallest relevant file scope; reuse proven patterns.
11. Implement the smallest reliable change. Human-readable code only.
12. Run **targeted validation** based on files changed. Never report a skipped/failed/unavailable check as passed.
13. Run browser QA **only** when visible behavior changed.
14. Review only the final intended diff.
15. Persist learning only after it is verified.
16. Generate a trusted receipt when delivery is requested.
17. Stop before any remote write unless the user explicitly authorized it.

## Human-readable code
Clear names; straightforward control flow; small cohesive functions; explicit behavior;
follow existing conventions; comments only where intent isn't obvious. No speculative
abstraction, no unrelated cleanup, no new dependency without need, no refactor beyond scope.

## Compression routing
- **RTK** compresses routine shell output (git status/diff, search, test/lint/build, dir listings, container/package output).
- **Headroom** compresses large non-shell context (MCP/JSON/docs/memory/browser output) with reversible retrieval.
- Do not double-compress RTK output through Headroom.
- Preserve **raw** output for: checksums, exact byte/patch anchors, security evidence, full failing stack traces, compiler errors, migration output, data-loss warnings, any ambiguity. **Never hide a failure.**

## Memory (GBrain) — isolated per project
- Default query scope = current project source + explicitly-approved global engineering prefs only.
- Never retrieve another project's memory by default. Store facts (not chat history), point to canonical files, never store secrets/tokens/PII.

## Delivery (provider-aware) — only when the user asks
- Detect provider (GitHub → Draft PR via `gh`; GitLab → Draft MR via `glab`; other → local summary + ask).
- Verify branch/target/scope/tests/review/receipt first. Never push to protected branches, never force-push, never merge, never approve, never remove Draft automatically.

## Response style
Concise. Skip greetings, restatement, play-by-play, filler. Preserve complete code,
exact paths/errors, test pass/fail/skip counts, and all safety warnings.

See `~/.global-claude-workflow/policies/` for full policies and the global skills
(engineering-task, fast-path, validation, final-review, learning-loop, delivery,
browser-qa, project-onboarding).
