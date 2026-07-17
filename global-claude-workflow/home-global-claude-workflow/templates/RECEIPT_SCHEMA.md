# TRUSTED RECEIPT (bind to state; reject on any mismatch)
Git:    project_identity, repo_root, redacted_remote, source_branch, target_branch, git_tree,
        head_revision, staged_diff_checksum, file_list, test_evidence, validator_evidence,
        browser_qa_evidence?, secret_scan, final_review, learning_class, knowledge_ids,
        workflow_version, generated_at
Non-Git: project_identity, canonical_root, changed_file_hashes, file_list, validation_evidence,
        final_review, workflow_version, generated_at
Reject: caller-asserted completion, missing/stale/tampered evidence, project/branch/tree/diff/
        file-list/test/final-review mismatch, changes after generation, cross-project reuse.
Tooling: ~/.global-claude-workflow/bin/validate-project-receipt {generate|validate}
