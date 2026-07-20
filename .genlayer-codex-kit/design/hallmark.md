# Hallmark integration

Official repository: https://github.com/Nutlope/hallmark

Install or update using the current Hallmark command:

```bash
npx skills add nutlope/hallmark
```

Choose project scope when prompted so the skill is available to `genlayer-builder-agent`. The exact installed path may be managed by the skills installer, so Codex should discover the installed skill rather than assume a hard-coded folder.

After installation, start a new Codex thread or reload the project so skill discovery is refreshed.

Hallmark controls design quality and UI craft. The GenLayer UI bridge at `.codex/skills/genlayer-ui/SKILL.md` controls product truth and domain constraints. Hallmark must not alter backend APIs, Intelligent Contract semantics, evidence classification, gate decisions, scoring, or security policy.

Recommended Codex command:

```text
Read AGENTS.md and .genlayer-codex-kit/prompts/design-ui.md. Build the UI for genlayer-builder-agent with Hallmark. Inspect and plan first.
```
