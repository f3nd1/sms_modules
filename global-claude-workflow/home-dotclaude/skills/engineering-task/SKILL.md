---
name: engineering-task
description: Use for every implementation, defect, maintenance, or refactoring request. Detects project identity, loads the external profile, writes a compact task brief, selects FAST/STANDARD/HIGH-RISK mode, runs the Ponytail pre-write gate, retrieves bounded context, confirms file scope, and routes to fast-path/validation/final-review/learning-loop/delivery. Prevents cross-project assumptions.
---
# engineering-task (entry point)
1. Run `~/.global-claude-workflow/bin/detect-project` → identity, root, provider, branch, worktree.
2. Load project `CLAUDE.md`/docs + external profile `~/.global-claude-workflow/projects/<id>/profile/PROJECT.md`. If missing/stale → run **project-onboarding**. Treat stale profiles as non-authoritative.
3. Write a task brief (templates/TASK_BRIEF.md) in the project runtime `tasks/`.
4. Classify FAST / STANDARD / HIGH-RISK (policies/GLOBAL_WORKFLOW.md).
5. Run the **Ponytail** gate before any production code (8 questions).
6. Retrieve bounded context: ≤3 memories, ≤3 gotchas, ≤1 pattern, ≤2 global prefs. Use fresh cache before broad discovery. Graphify only if structurally necessary.
7. Confirm the intended file scope, then route: FAST→fast-path; else implement smallest change; always → validation → final-review → learning-loop; delivery only if the user asks.
**Boundaries:** current project root only; never scan parent workspaces; never carry another project's facts. **Stop** at any stop-condition (policies/SECURITY.md). **Evidence:** identity, brief path, chosen mode.
