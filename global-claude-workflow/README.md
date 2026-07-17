# Global Claude Code Engineering Workflow (portable bundle)

Version-controlled copy of a reusable, project-agnostic Claude Code workflow so it can be
carried to any machine. It contains **only** portable, authored configuration — no secrets,
no runtime state, no backups.

## Layout → where each part installs
```
home-global-claude-workflow/   →  copy to  ~/.global-claude-workflow/
  README.md, VERSION
  manifest/    capability manifest (status + verify/update/rollback commands)
  policies/    GLOBAL_WORKFLOW, SECURITY, COMPRESSION, MEMORY, VALIDATION, DELIVERY
  templates/   PROJECT_PROFILE, TASK_BRIEF, CONTINUATION, LEARNING_ENTRY, REVIEW_CHECKLIST, RECEIPT_SCHEMA
  bin/         detect-project, project-runtime-path, refresh-project-cache,
               validate-project-receipt, validate-global-workflow

home-dotclaude/                →  MERGE into  ~/.claude/  (do not clobber existing files)
  CLAUDE.md                    global engineering standard (loads in every project)
  skills/                      8 global skills
  agents/                      2 read-only subagents
  settings.permissions-fragment.json   merge .permissions.deny into ~/.claude/settings.json
```

## Install
```sh
cp -r home-global-claude-workflow/. ~/.global-claude-workflow/
chmod +x ~/.global-claude-workflow/bin/*
cp home-dotclaude/CLAUDE.md ~/.claude/CLAUDE.md          # or merge if you already have one
cp -r home-dotclaude/skills/. ~/.claude/skills/
cp -r home-dotclaude/agents/. ~/.claude/agents/
# Merge the deny-rules into your existing ~/.claude/settings.json (jq example):
#   jq '.permissions.deny = ((.permissions.deny // []) +
#       (input.permissions.deny) | unique)' \
#       ~/.claude/settings.json home-dotclaude/settings.permissions-fragment.json > /tmp/s && mv /tmp/s ~/.claude/settings.json
~/.global-claude-workflow/bin/validate-global-workflow   # expect exit 0
```

## Notes
- Ponytail is the only third-party capability verified/installed in the origin environment.
  RTK / Headroom / Caveman / Graphify / GBrain are BLOCKED (source unverified — see
  `manifest/CAPABILITIES.md`); the workflow degrades gracefully without them.
- `bin/` scripts are POSIX/bash and reference `$HOME/.global-claude-workflow` only.
- Runtime state (per-project cache/receipts/graphs/browser artifacts) is generated under
  `~/.global-claude-workflow/projects/<id>/` and is intentionally **not** included here.
