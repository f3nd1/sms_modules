---
name: fast-path
description: Use for a small, low-risk task with known files or a proven local pattern. Resolves known paths once, uses the project cache first, skips Graphify and broad discovery, applies the smallest change, runs targeted validation, and stops when acceptance criteria are met.
---
# fast-path
Resolve known paths once → use project cache (`refresh-project-cache` if stale) → skip Graphify
→ smallest change → targeted validation only → stop at acceptance criteria.
**Escalate to STANDARD** if scope grows, schema/security/integration is touched, or uncertainty appears.
**Evidence:** files touched, targeted checks + exact pass/fail/skip.
