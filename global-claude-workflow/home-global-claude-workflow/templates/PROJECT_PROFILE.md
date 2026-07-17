# PROJECT PROFILE (external — never committed to the repo)
project_identity: <id>
canonical_root: <path>
redacted_remotes: <normalized, no credentials>
provider: <github|gitlab|bitbucket|other-git|none>
default_branch: <UNKNOWN|...>
current_worktree: <main|name>
languages: <UNKNOWN|...>            # evidence: <manifest path>
frameworks: <UNKNOWN|...>           # evidence:
package_managers: <UNKNOWN|...>     # evidence: lockfiles
source_roots: <...>
test_roots: <...>
build_commands: <UNKNOWN|...>
targeted_test_commands: <...>
lint_commands: <...>
format_commands: <...>
browser_test_setup: <UNKNOWN|none|...>
ci_files: <...>
high_risk_paths: <...>
generated_paths: <...>
dependency_paths: <...>
existing_claude_instructions: <path|none>
existing_agent_instructions: <path|none>
architecture_docs: <path|none>
decision_records: <path|none>
memory_sources: <namespace|none>
last_verified_revision: <sha|NOGIT>
last_verified_time: <iso>
refresh_command: ~/.global-claude-workflow/bin/refresh-project-cache <root>
# graph freshness (when a graph exists): graph_checksum, included_roots, exclusions,
# source_revision, generation_time, graphify_version, refresh_command
evidence_paths: <list>
