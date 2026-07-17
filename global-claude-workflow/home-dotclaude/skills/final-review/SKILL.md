---
name: final-review
description: Use before any commit, push, PR/MR, patch delivery, or completion claim. Reviews only the intended final diff for unrelated files, generated artifacts, and possible secrets, verifies acceptance criteria, human readability, and project conventions, assesses regression risk, and rejects unsupported completion claims.
---
# final-review
Review only the intended diff (templates/REVIEW_CHECKLIST.md). Flag unrelated/generated files
and possible secrets. Verify acceptance criteria, readability, conventions, regression risk.
Reject completion claims lacking evidence. Consider the **final-diff-reviewer** subagent for isolation.
