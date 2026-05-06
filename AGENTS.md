# Agents

- For any frontend change, use `$frontend-skill` and `$vercel-plugin/shadcn`, and only use existing shadcn components.
- Always use `pnpm` as the package manager.
- Never edit `CLAUDE.md`; it is intentionally only a pointer to `AGENTS.md`.
- Production URL: spcfarm.vercel.app
- App is deployed automatically to production on push to GitHub, no need to manually deploy. Use vercel cli to check deployment status.
- Product requirements live in `docs/PRD.md`; keep it lightweight, and when product features change, update the relevant section plus append a dated amendment instead of creating a heavy spec there.
- Cleanup after yourself: remove any open ports, background shells, background agents, temp artifacts, screenshots, logs, and other run-specific leftovers, but do not remove build caches or other artifacts that help future builds run faster.
- For Convex workflows, read `docs/CONVEX.md` before changing backend functions, deployments, or Convex env vars.
- You have Vercel, Convex, shadcn, GitHub, and X (Twitter) skills available. Before making any changes involving these, look up the relevant skill instead of relying on memory.
- When dealing with admin dashboards, prefer the Convex, Vercel, and GitHub CLIs instead of opening dashboards. Run them with `--help` when stuck instead of relying on memory. If a required admin-dashboard action cannot be done with a CLI, use the Computer Use skill to control Dia, where these dashboards are logged in.
- You also have access to control and view browsers. Use either the in-app browser (`@browser` skill) or the Computer Use skill to control Dia. To verify work, prefer the in-app browser for opening localhost or production URLs. Use Computer Use to control Dia only for other use cases, such as controlling admin dashboards.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
