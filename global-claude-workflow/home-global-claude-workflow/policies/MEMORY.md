# Memory policy (GBrain, project-isolated)
- One source/namespace per project (Git repo or non-Git root) + a global engineering-prefs
  source. Default query scope = current project + approved global prefs. Never search other
  projects by default. If isolation cannot be guaranteed, use separate per-project brains.
- Store facts, not conversation. Point to canonical source files; don't copy large code.
- Categories: Proven memory / Gotcha / Proven pattern (statuses PROVEN, NEEDS_REVERIFICATION,
  SUPERSEDED, DEPRECATED). Do not persist assumptions/failed experiments as proven.
- Never import: chat/session history, email/calendar/contacts/notes, home dir, or project
  source (until explicitly approved or produced by the trusted learning loop).
- Tracked project docs remain the human-reviewable source of truth. Memory never silently
  overrides project CLAUDE.md, rules, ADRs, docs, source, or test evidence.
