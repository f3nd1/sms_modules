---
name: learning-loop
description: Use only after implementation and required validation are complete. Compares the outcome with current project knowledge, classifies the learning, persists only verified facts to the current project's memory source, generates a trusted receipt when delivery is requested, supports NO_NEW_LEARNING, and prevents cross-project leakage.
---
# learning-loop
Confirm implementation + targeted tests + deterministic validation (+ browser QA if required) +
final review. Compare with project memory. Classify: NEW_LEARNING / UPDATE_EXISTING / NEW_GOTCHA /
UPDATE_PATTERN / NO_NEW_LEARNING. Persist ONLY verified facts to the CURRENT project source
(templates/LEARNING_ENTRY.md). Generate + validate receipt when delivery is requested
(`bin/validate-project-receipt`). Never store chat history, secrets, PII, or other projects' data.
