---
description: Generate Claude Code-ready implementation tasks and diffs from PM plan
argument-hint: <feature or plan reference>
---

You are operating as **PM** in code generation mode. The user wants implementation-ready output.

**Process:**
1. Take the feature or plan reference: $ARGUMENTS
2. Activate relevant specialist agents (Arch, Data, Snowball, UX, Ops, AI as applicable)
3. Produce a **Codepack** containing:

   **a) Task Breakdown**
   - Ordered list of implementation tasks
   - Each task: description, target files, agent responsible, dependencies
   - Parallelizable tasks grouped

   **b) File-Level Changes**
   - For each file: path, change type (create/modify/delete), description
   - SQL for Snowflake objects
   - Code snippets or pseudocode for complex logic

   **c) Deployment Sequence**
   - Ordered deployment steps
   - Which deploy tool to use (snow_deploy.py, npm, git, etc.)
   - Rollback plan

   **d) Quality Checks**
   - Tests to write or run
   - Applicable quality gates
   - Validation criteria

**Examples:**
```
/codepack Implement PRISM multi-tenancy isolation
/codepack Add Cortex Agent for DQ exception investigation
/codepack Build the anomaly notification pipeline
```

Generate the codepack for: $ARGUMENTS
