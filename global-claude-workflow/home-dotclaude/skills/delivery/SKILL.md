---
name: delivery
description: Use only when the user explicitly asks to commit, push, open a PR/MR, or prepare delivery. Detects the provider and protected branches, verifies source/target branch, staged scope, tests, final review, and receipt, prepares concise human-readable delivery content, and stops before any unauthorized remote action. Never merges, approves, or removes Draft status.
---
# delivery
Detect provider (github/gitlab/other) + protected branches. Verify source+target branch, staged
scope, tests, final review, valid receipt. GitHub→Draft PR (`gh`); GitLab→Draft MR (`glab`);
other→local summary + ask. Concise human title/description; no AI analysis, no raw logs.
**Never** push to protected branch, force-push, rewrite history, merge, approve, or remove Draft.
Stop before any remote write unless explicitly authorized. (policies/DELIVERY.md)
