# Global workflow policy

## Task classification
**FAST** — small scope, low risk, known file/proven local pattern, no schema/security/
integration change, no architectural uncertainty. Brief → Ponytail gate → bounded memory
→ fresh cache → smallest scope → targeted validation → focused review. No Graphify.

**STANDARD** — multiple related files, moderate uncertainty, new-but-conventional behavior,
regression risk, possible structural discovery. Bounded plan → relevant docs only →
targeted Graphify when justified → related-regression validation → final-diff review.

**HIGH-RISK** — auth/authz/permissions, crypto, security controls, PII, financial logic,
DB migrations, destructive ops, workflow engines, CI/deploy/infra, external integrations,
production config, compliance, large data transforms, high-impact business logic.
Explicit scope+assumptions → stronger security review → broader validation → raw failure
evidence → human confirmation before irreversible actions → complete delivery evidence.

## Ponytail pre-write gate (mandatory before production code)
1. Satisfiable with existing behavior? 2. Existing pattern to reuse? 3. Can code be removed
instead? 4. Is a new abstraction necessary? 5. Is a new dependency necessary? 6. Is the
change larger than the acceptance criteria? 7. Can fewer files change? 8. Is any cleanup unrelated?

## Retrieval limits (per task)
≤3 proven memories, ≤3 gotchas, ≤1 closely-related pattern, ≤2 global prefs. Never load full
project memory for routine tasks.
