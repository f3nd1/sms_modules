---
name: project-onboarding
description: Use when Claude starts work in a project not yet profiled, when the project revision invalidates cached info, or when the user asks to initialize/inspect the project workflow. Detects root, identity, provider, instructions, stack, package managers, and test/lint/build/CI/deploy/high-risk paths via manifests, then writes an external profile. Never writes into the repo.
---
# project-onboarding
Detect (evidence-based, manifests over broad reads): root, identity, provider, existing
instructions, languages, frameworks, package managers, test/lint/format/build commands, browser-test
setup, CI, deploy-sensitive files, high-risk areas, source roots, generated/dependency dirs.
Write/refresh `~/.global-claude-workflow/projects/<id>/profile/PROJECT.md` (templates/PROJECT_PROFILE.md),
recording an evidence path per conclusion; mark unknowns `UNKNOWN`; never guess.
**Must NOT:** write project CLAUDE.md/.claude, edit .gitignore, add deps, init tests, create
branches, stage, import source into GBrain, build a full graph, or change source. If project-level
Claude config would clearly help, propose it and ask before writing.
