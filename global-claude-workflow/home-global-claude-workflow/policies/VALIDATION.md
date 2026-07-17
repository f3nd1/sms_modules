# Validation policy
- Detect the project's own test/lint/format/build commands (from manifests/config).
- Choose checks by CHANGED FILES, not the whole suite, unless risk requires more.
- Use RTK for routine output; preserve RAW failing output.
- Record EXACT pass / fail / skip counts. Distinguish EXECUTED from UNAVAILABLE checks.
- Never reinterpret a failure, skip, or unavailable check as success.
