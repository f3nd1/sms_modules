# Global Capabilities Manifest (v1.0.0)
_Verified 2026-07-17 · Ubuntu 24.04 x86_64 · **ephemeral container: config here does not persist to the developer's workstation**_

| Capability | Status | Source identity | Version | Scope |
|---|---|---|---|---|
| Ponytail | INSTALLED | github:DietrichGebert/ponytail (VERIFIED, matches spec) | 4.8.4 | user |
| RTK | BLOCKED_SOURCE_UNVERIFIED | spec=github:rtk-ai/rtk (repo EXISTS, git-only, not on npm/PyPI) | — | user |
| Headroom | BLOCKED_SOURCE_UNVERIFIED | spec=github:headroomlabs-ai/headroom (repo EXISTS, git-only) | — | user |
| Caveman | BLOCKED_SOURCE_UNVERIFIED | spec=github:Shawnchee/caveman-skill (repo EXISTS, git-only, unvetted) | — | user |
| Graphify | BLOCKED_SOURCE_UNVERIFIED | spec package 'graphifyy' redirects to @sentropic/graphify (github:rhanka/graphify) — NOT confirmed to be the spec's intended tool | — | user |
| GBrain | BLOCKED_SOURCE_UNVERIFIED | spec=github:garrytan/gbrain (repo EXISTS, git-only) | — | user |
| Playwright/Chromium | PARTIAL_CHROMIUM_PRESENT | Microsoft (official) | Chromium pre-provisioned at $PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers) | user/global-runtime |
| Chrome DevTools MCP | NOT_INSTALLED | official chrome-devtools-mcp (ChromeDevTools) | — | user |
| GitHub CLI (gh) | NOT_INSTALLED | GitHub (official) | — | system/user |
| GitLab CLI (glab) | NOT_INSTALLED | GitLab (official) | — | system/user |

## Status legend
- **INSTALLED** — verified present at user scope.
- **PARTIAL_CHROMIUM_PRESENT** — browser binary pre-provisioned; runtime dir created.
- **NOT_INSTALLED** — official/verifiable; install command recorded; not installed (ephemeral env / auth needed).
- **BLOCKED_SOURCE_UNVERIFIED** — spec's GitHub repo exists but is not registry-published/publisher-vetted; the same-named registry package is a *different, unrelated* project and was rejected per source-verification policy. Not installed. Workflow degrades gracefully.

See CAPABILITIES.json for per-capability verify/update/rollback/uninstall commands and limitations.
