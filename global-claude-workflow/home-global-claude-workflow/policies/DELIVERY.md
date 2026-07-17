# Delivery policy (provider-aware)
Delivery happens ONLY when the user explicitly asks. First verify: correct project, correct
task branch, correct target branch, intended file scope, required tests, validator, browser QA
(if applicable), secret scan, final-diff review, valid receipt.

GitHub  → prepare a **Draft Pull Request** via official `gh`. Concise human title/description;
no internal AI analysis, no raw test logs.
GitLab  → prepare a **Draft Merge Request** via official `glab`. Same content rules.
Other/self-hosted → local delivery summary; do not invent provider commands; ask for the
required workflow.

Never merge. Never approve. Never remove Draft status automatically.
NEVER automatically: push to a protected branch, force-push, rewrite remote history, bypass
validation, create a release, or deploy. Stop before any remote write unless explicitly authorized.
