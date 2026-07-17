---
name: validation
description: Use after any source, config, test, schema, docs, or infrastructure change. Detects the project's own validation commands, selects checks by changed files, uses RTK for routine output while preserving raw failures, records exact pass/fail/skip counts, and never reports a skipped or unavailable check as passed.
---
# validation
Detect project test/lint/format/build commands from manifests. Choose checks by CHANGED FILES.
RTK for routine output; RAW for failures/compiler/migration/data-loss output. Record EXACT
pass/fail/skip. Distinguish EXECUTED vs UNAVAILABLE. **Never** report failure/skip/unavailable as pass.
