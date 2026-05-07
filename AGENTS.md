# Agents

- For any frontend change, use `$frontend-skill` and `$vercel:shadcn` for shadcn/ui guidance.
- Treat custom UI primitive creation as a serious error. Before creating any frontend component, look up the matching shadcn component/pattern with `$vercel:shadcn`; assume shadcn already has what is needed. If the needed shadcn component is not already in `components/ui`, add it with the shadcn CLI using `pnpm`/`pnpm dlx` and the skill's non-interactive flags, then compose it. Do not hand-roll custom UI primitives or local one-off replacements for buttons, inputs, labels, forms, cards, badges, alerts, dialogs, dropdowns, sheets, tabs, tables, skeletons, separators, avatars, scroll areas, tooltips, or similar UI.
- Theme conventions: use Tailwind v4/shadcn tokens from `app/globals.css` for foundational UI (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `ring-ring`, etc.); avoid ad-hoc hex or Tailwind palette colors for core surfaces. Keep font tokens in `@theme inline` as literal Geist font stacks, not `var(--font-*)` self-references.
- Always use `pnpm` as the package manager.
- Use subagents aggressively to parallelize work for planning, testing, and building.
- For local app verification, do not use `pnpm dev` by default. This repo can hit `EMFILE: too many open files, watch` when many agents run in parallel because dev hot reload opens lots of file watchers. Use `pnpm build && pnpm start` instead unless hot reload is explicitly needed.
- Never edit `CLAUDE.md`; it is intentionally only a pointer to `AGENTS.md`.
- Production URL: keep the live value in `NEXT_PUBLIC_APP_URL`; do not commit account-specific deployment URLs.
- App is deployed automatically to production on push to GitHub, no need to manually deploy. Trust the automatic production deployment after pushing; only use the Vercel CLI to check deployment status when explicitly asked.
- Product requirements live in `docs/PRD.md`; keep it lightweight, and when product features change, update the relevant section plus append a dated amendment instead of creating a heavy spec there.
- Reusable QA Farm users and manual X test-account guidance live in `docs/TEST_USERS.md`. AgentMail is for Farm email inboxes only; do not automate fresh X account creation. Do not put passwords, AgentMail API keys, OAuth tokens, recovery codes, or magic links in tracked docs; keep credentials local in ignored `.env.local`.
- Public/source hygiene:
  - Do not commit live account-specific identifiers, deployment names, dashboard URLs, production URLs, callback URLs, invite codes, QA account emails, real user handles, personal emails, project/team IDs, API responses, or local absolute paths. Use env var names, placeholders, or an untracked private runbook instead.
  - Treat X app metadata (`X_CLIENT_ID`, `X_APP_ID`, `X_ENROLLED_ACCOUNT_ID`, callback URLs, test handles/user IDs), Convex/Vercel project/deployment IDs, AgentMail inbox identities, and QA Farm IDs as private even when they are not classic secrets.
  - Before adding docs, screenshots, generated images, or mock assets, scan them for real names, handles, emails, invite links/codes, production URLs, dashboard URLs, C2PA/tool metadata, and local paths. Regenerate or anonymize assets when needed.
  - Runtime code must read deployment/app-specific values from env and fail clearly if required env is missing. Do not add hardcoded production fallbacks for private or account-specific values.
  - Before making the repo public or pushing open-source cleanup, run targeted scans for known live identifiers and remember that removing values from the current tree does not remove them from git history.
- Cleanup after yourself: remove any open ports, background shells, background agents, temp artifacts, screenshots, logs, and other run-specific leftovers, but do not remove build caches or other artifacts that help future builds run faster.
- For Convex workflows, read `docs/CONVEX.md` before changing backend functions, deployments, or Convex env vars.
- You have Vercel, Convex, shadcn, GitHub, and X (Twitter) skills available. Before making any changes involving these, look up the relevant skill instead of relying on memory.
- When dealing with admin dashboards, prefer the Convex, Vercel, and GitHub CLIs instead of opening dashboards. Run them with `--help` when stuck instead of relying on memory. If a required admin-dashboard action cannot be done with a CLI, use the user's chosen authenticated browser manually and avoid committing browser/session details.
- Browser/tooling choice:
  - Use the in-app browser (`@browser` skill) for single-session testing while developing. This is the default for localhost, production smoke checks, screenshots, and verifying your own UI changes.
  - Use an authenticated browser only when the task needs accounts already logged in there, such as Convex, Vercel, GitHub, X developer/admin surfaces, or other dashboards where CLI access is not enough.
  - Use Safari or Chrome for multi-user testing, separate auth/session checks, or when you need a cleaner browser profile.
  - Use Computer Use to control desktop apps or browser windows when a browser/plugin API is not enough, such as dashboard actions, OS dialogs, permission prompts, or other non-web-app interactions.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
