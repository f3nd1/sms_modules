---
name: browser-qa
description: Use when visible browser behavior changed (UI, user journey, relevant client-side JS, navigation, forms, responsive layout) or the user requests browser testing. Prefers existing project browser tests, uses the global isolated Playwright/Chromium runtime only when appropriate, and uses Chrome DevTools MCP only for deep client-side investigation. Isolates browser state and redacts sensitive data.
---
# browser-qa
Trigger ONLY on visible-behavior change or explicit request. Prefer the project's own browser
tests/framework and pinned version. Else use global runtime `~/.global-claude-workflow/browser-runtime`
(Chromium at $PLAYWRIGHT_BROWSERS_PATH) — never the personal profile, never production data.
Validate URL + environment, respect auth boundaries, check console/network, focused assertions,
screenshot+trace on failure only, redact secrets, clean up. Chrome DevTools MCP only for deep
console/network/runtime/DOM/perf debugging. Store artifacts under the project runtime `browser/`.
