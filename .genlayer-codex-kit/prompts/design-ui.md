# Build the genlayer-builder-agent UI with Hallmark

Read `AGENTS.md` and load `.codex/skills/genlayer-ui/SKILL.md`.

This task is `DESIGN`.

Load the Hallmark skill if installed. Inspect the complete repository before changing files, including routes, components, layouts, styles, state management, API calls, schemas, wallet integration, Intelligent Contract calls, Studio/Explorer integration, and existing design tokens.

Build a production-ready interface for `genlayer-builder-agent` covering the implemented areas among:

- project workspace;
- Intelligent Contract builder;
- validator builder;
- test and consensus runner;
- project reviewer;
- security findings;
- deployments;
- Studio and Explorer verification;
- reports and evidence;
- settings.

Requirements:

- preserve all backend behavior and API contracts;
- use only real available data;
- never fabricate success, transactions, addresses, state, value, logs, or metrics;
- support idle, loading, empty, blocked, partial, success, request-more-info, rejection, integration-unavailable, and error states;
- responsive at 320, 375, 414, 768, and desktop widths;
- keyboard accessible, visible focus, semantic structure, acceptable contrast, and reduced motion;
- reuse sound existing components;
- avoid generic chatbot-first layouts, card carpets, fake terminals, decorative blockchain art, and excessive glass effects.

First return:

1. repository UI map;
2. Hallmark availability;
3. information architecture;
4. visual direction;
5. one vertical slice;
6. exact files;
7. checks and exit criteria.

Wait for approval before editing unless the user explicitly asks for direct implementation.
