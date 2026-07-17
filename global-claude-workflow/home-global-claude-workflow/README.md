# Global Claude Code Engineering Workflow (v1.0.0)

Reusable, token-efficient, safety-first engineering behavior for **every** project — no
launcher, no wrapper. Start Claude Code the normal way: `claude`.

## What this is
Global, project-agnostic configuration only. Every project-specific fact is detected per
project and stored **outside** the repo under `projects/<identity>/`.

```
~/.claude/CLAUDE.md          global engineering standard (loads in every project)
~/.claude/settings.json      preserved plugins/marketplaces + narrow secret deny-rules
~/.claude/skills/*           engineering-task, fast-path, validation, final-review,
                             learning-loop, delivery, browser-qa, project-onboarding
~/.claude/agents/*           bounded-project-explorer, final-diff-reviewer (read-only)
~/.global-claude-workflow/   policies, templates, bin, manifest, per-project runtime
```

## Key commands
```
bin/detect-project [path]              # deterministic project identity (JSON)
bin/project-runtime-path [path]        # isolated runtime dir for a project
bin/refresh-project-cache [path]       # cache index + freshness checksum
bin/validate-project-receipt generate|validate   # trusted, state-bound receipts
bin/validate-global-workflow           # self-check (non-zero on config/safety failure)
```

## Project isolation
Identity = repo top-dir + checksum of the normalized/redacted primary remote (or canonical
root for non-Git). Two repos with the same folder name get **different** identities. Worktrees
of one repo share knowledge but keep worktree-aware task/receipt metadata. Runtime state never
lives inside a repo; nothing is committed.

## Capability status
See `manifest/CAPABILITIES.md`. Ponytail is installed and active. RTK/Headroom/Caveman/
Graphify/GBrain are **BLOCKED**: their real upstreams are git-only and unvetted, and the
same-named registry packages are unrelated projects (rejected per source-verification policy).
The workflow is designed to degrade gracefully without them — policies still govern behavior.

## ⚠ Persistence
This was configured inside an **ephemeral cloud container** (`HOME=/root`). It does **not**
propagate to your workstation. To use it there, copy `~/.global-claude-workflow/` and the
`~/.claude/{CLAUDE.md,skills,agents}` additions (and the `settings.json` `permissions.deny`
block) onto your machine, or keep this tree in version control and sync it.

## After config changes
Exit the current session → open any project → run `claude` → check CLAUDE.md, plugins, hooks,
MCP servers → run `bin/validate-global-workflow`.
