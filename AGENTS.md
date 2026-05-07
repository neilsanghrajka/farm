# Agents

- For any frontend change, use `$frontend-skill` and `$vercel-plugin/shadcn`, and only use existing shadcn components.
- Theme conventions: use Tailwind v4/shadcn tokens from `app/globals.css` for foundational UI (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `ring-ring`, etc.); avoid ad-hoc hex or Tailwind palette colors for core surfaces. Keep font tokens in `@theme inline` as literal Geist font stacks, not `var(--font-*)` self-references.
- Always use `pnpm` as the package manager.
- Use subagents aggressively to parallelize work for planning, testing, and building.
- For local app verification, do not use `pnpm dev` by default. This repo can hit `EMFILE: too many open files, watch` when many agents run in parallel because dev hot reload opens lots of file watchers. Use `pnpm build && pnpm start` instead unless hot reload is explicitly needed.
- Never edit `CLAUDE.md`; it is intentionally only a pointer to `AGENTS.md`.
- Production URL: spcfarm.vercel.app
- App is deployed automatically to production on push to GitHub, no need to manually deploy. Trust the automatic production deployment after pushing; only use the Vercel CLI to check deployment status when explicitly asked.
- Product requirements live in `docs/PRD.md`; keep it lightweight, and when product features change, update the relevant section plus append a dated amendment instead of creating a heavy spec there.
- Cleanup after yourself: remove any open ports, background shells, background agents, temp artifacts, screenshots, logs, and other run-specific leftovers, but do not remove build caches or other artifacts that help future builds run faster.
- For Convex workflows, read `docs/CONVEX.md` before changing backend functions, deployments, or Convex env vars.
- You have Vercel, Convex, shadcn, GitHub, and X (Twitter) skills available. Before making any changes involving these, look up the relevant skill instead of relying on memory.
- When dealing with admin dashboards, prefer the Convex, Vercel, and GitHub CLIs instead of opening dashboards. Run them with `--help` when stuck instead of relying on memory. If a required admin-dashboard action cannot be done with a CLI, use the Computer Use skill to control Dia, where these dashboards are logged in.
- Browser/tooling choice:
  - Use the in-app browser (`@browser` skill) for single-session testing while developing. This is the default for localhost, production smoke checks, screenshots, and verifying your own UI changes.
  - Use Dia only when the task needs accounts already logged in there, such as Convex, Vercel, GitHub, X developer/admin surfaces, or other dashboards where CLI access is not enough. Dia is a real user browser with existing tabs, cookies, extensions, and localhost history, so do not use it as the default app verifier.
  - Use Safari or Chrome for multi-user testing, separate auth/session checks, or when you need a cleaner browser profile than Dia without disturbing logged-in admin tabs.
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
