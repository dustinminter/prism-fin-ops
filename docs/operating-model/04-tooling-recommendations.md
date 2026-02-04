# Tooling Recommendations

This document describes the recommended tooling stack for the MAIOS delivery organization. The principle is **Claude Code native first** — use built-in features and patterns before adding external dependencies.

## 1. Claude Code Official Plugins & Patterns

### Code Review Plugin Pattern

The official Claude Code ecosystem includes a **code-review plugin pattern** that supports parallel review gates — directly applicable to our quality gate model.

**How it supports our model:**
- The `code-reviewer` agent pattern runs as a subagent, reviewing code for bugs, security, and adherence to conventions
- Multiple review agents can run in parallel via the `Task` tool with `subagent_type` — this is how PM can activate 2–4 specialists simultaneously
- The `pr-review-toolkit` plugin demonstrates staged review workflows: code review → silent failure hunting → comment analysis → test coverage → type design analysis

**What we adopt:**
- Use the `Task` tool's parallel dispatch to run specialist agents concurrently
- Model our quality gates after the staged review pattern (Security → Cost → Architecture → Proposal)
- Each gate agent produces a structured checklist, similar to the code-reviewer's confidence-based filtering

**Reference:** The Claude Code plugin system (`anthropics/claude-code` on GitHub) defines the standard for agents, commands, hooks, and skills. Our `.claude/agents/` and `.claude/commands/` files follow this format exactly.

### Hooks System

Claude Code hooks (`.claude/hooks/`) enable event-driven automation:
- `PreToolUse` — validate tool calls before execution (e.g., block dangerous SQL)
- `PostToolUse` — run checks after tool completion (e.g., trigger quality gate)
- `Stop` — run checks when an agent completes (e.g., verify artifact checklist)
- `UserPromptSubmit` — intercept user prompts (e.g., enforce PM routing)

**Potential hooks for our model:**
- A `UserPromptSubmit` hook could remind users to route through PM
- A `Stop` hook could verify that quality gates were run before marking work complete
- A `PreToolUse` hook on `Bash` could enforce deployment safety checks

### Skills System

Our slash commands (`/pm`, `/route`, `/codepack`, `/review`, `/execpack`) use the Claude Code commands system. For more complex workflows, the skills system offers progressive disclosure and can be invoked programmatically.

## 2. wshobson/agents — Subagent Pattern Library

**Repository:** `https://github.com/wshobson/agents`

A curated collection of Claude Code subagent patterns. Useful as a **pattern library** for designing our specialist agents — not as a direct dependency.

**Relevant patterns:**
- Agent system prompt structure and frontmatter conventions
- Multi-agent coordination patterns
- Scope enforcement and routing examples
- Quality-gate agent design

**How we use it:**
- Reference for agent system prompt best practices
- Inspiration for new specialist agent designs
- Pattern validation — confirm our agents follow community conventions

**We do NOT:**
- Install it as a dependency
- Copy agents wholesale — our agents are domain-specific to PRISM/Archetype
- Depend on its update cycle

## 3. ruvnet/claude-flow — Optional Orchestration Layer

**Repository:** `https://github.com/ruvnet/claude-flow`

An orchestration framework for Claude Code that adds dependency graphs, task scheduling, and multi-agent coordination beyond what the built-in `Task` tool provides.

**When we would need it:**
- Complex dependency graphs where Agent C depends on both Agent A and Agent B completing
- Long-running workflows that span multiple sessions
- Persistent state management across agent invocations
- Visual workflow debugging

**Current assessment:** Our PM agent handles routing and orchestration natively using Claude Code's `Task` tool. claude-flow becomes relevant if:
1. We need persistent cross-session workflow state
2. Dependency graphs become too complex for PM to manage in-context
3. We need visual workflow monitoring

**Integration path (if needed):**
```bash
# claude-flow provides a CLI-based orchestration layer
# It would sit alongside our existing .claude/ structure
# PM would dispatch to claude-flow for complex multi-step workflows
```

**Status:** Documented for future evaluation. Not currently installed or required.

## 4. ClaudeKit-Style Review Gate Pattern

The concept of staged, gate-based quality reviews — where each gate runs a specialized reviewer agent and produces a structured pass/fail checklist — is well-established in the Claude Code ecosystem.

**Our implementation:**
- 4 quality gates (Security, Cost, Architecture, Proposal) defined in `03-quality-gates.md`
- Each gate activates 1–3 specialist agents
- Agents produce structured review checklists (Item / Status / Severity / Finding / Remediation)
- PM synthesizes into a Gate Report with overall PASS/FAIL
- Fail-closed for Critical/High findings

**Pattern alignment:**
- Similar to `code-reviewer` → `silent-failure-hunter` → `comment-analyzer` pipeline
- Each stage has clear inputs, outputs, and pass criteria
- Gates can run in parallel when independent (Security and Cost gates are independent)
- Gates run sequentially when dependent (Architecture gate may inform Security gate)

**This is native to our model — no external dependency needed.**

## 5. Awesome Lists — Discovery Only

These community-maintained lists are useful for discovering new tools, patterns, and plugins. They are **not dependencies**.

### jmanhype/awesome-claude-code
**URL:** `https://github.com/jmanhype/awesome-claude-code`

Curated list of Claude Code resources including:
- Plugin examples and templates
- Agent patterns and workflows
- Hook implementations
- Community tools and extensions

**Use for:** Discovering new patterns, validating our approach against community practices, finding solutions to specific orchestration challenges.

### ccplugins/awesome-claude-code-plugins
**URL:** `https://github.com/anthropics/awesome-claude-code-plugins`

Official and community plugin directory:
- Verified plugin patterns
- Integration examples
- Best practices documentation

**Use for:** Plugin structure validation, finding plugins that complement our model (e.g., specialized review plugins, deployment automation).

## Tooling Decision Matrix

| Need | Solution | Status |
|------|----------|--------|
| Agent definitions | `.claude/agents/*.md` (native) | Implemented |
| Slash commands | `.claude/commands/*.md` (native) | Implemented |
| Parallel agent dispatch | `Task` tool with `subagent_type` (native) | Available |
| Quality gate reviews | PM + specialist agents (native) | Implemented |
| Event-driven hooks | `.claude/hooks/` (native) | Scaffolded |
| Agent registry | `maios/registry/agents.json` + `.yaml` | Implemented |
| Dependency graph orchestration | ruvnet/claude-flow | Evaluate if needed |
| Agent pattern reference | wshobson/agents | Reference only |
| Plugin discovery | Awesome lists | Reference only |

## Principle: Stay Native Until You Can't

Add external tools only when:
1. A specific capability is blocked by native tooling limitations
2. The workaround cost exceeds the integration cost
3. The tool is stable, maintained, and aligned with Claude Code's direction

For now, everything runs on Claude Code native features: agents, commands, hooks, skills, and the `Task` tool for parallel dispatch.
