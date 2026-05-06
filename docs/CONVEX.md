# Convex Workflow

This project uses Convex as the backend for the Next.js app deployed at
`spcfarm.vercel.app`.

## Project Facts

- Convex team: `neil-sanghrajka`
- Convex project: `farm`
- Dev deployment: `superb-oyster-941`
- Region: EU West / Ireland
- Dev URL: `https://superb-oyster-941.eu-west-1.convex.cloud`
- Vercel production Convex deployment: `production-eu`
- Vercel production Convex URL:
  `https://merry-walrus-605.eu-west-1.convex.cloud`
- Vercel project: `farm`
- Production URL: `https://spcfarm.vercel.app`

Note: the project also has the initial default Convex production deployment
`dusty-dodo-296`. Vercel production is intentionally wired to the EU deployment
through `CONVEX_DEPLOY_KEY`, so prefer `--deployment production-eu` for
production checks unless the dashboard default is changed later.

## Local Development

- Use `pnpm` for all package and script commands.
- Read `convex/_generated/ai/guidelines.md` before editing Convex code.
- Run Convex locally with:

```bash
pnpm exec convex dev
```

- Run the Next.js app with:

```bash
pnpm dev
```

- Local env values live in ignored `.env.local`; keep `.env.example` as
  placeholders only.

Expected env names:

```bash
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CONVEX_SITE_URL=
CONVEX_DEPLOY_KEY=
```

## Production Deploys

Production deploys are triggered by GitHub pushes to `main`. Vercel should run
the official Convex production build flow before building Next.js:

```bash
pnpm exec convex deploy --cmd 'pnpm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

This command deploys Convex functions and sets `NEXT_PUBLIC_CONVEX_URL` for the
Next.js build command it wraps. Vercel needs `CONVEX_DEPLOY_KEY` configured in
the Production environment. It is currently set as a sensitive Vercel
Production env var and targets `production-eu`.

Useful Vercel checks:

```bash
vercel inspect spcfarm.vercel.app --wait
vercel logs spcfarm.vercel.app --no-follow
```

## Convex CLI

Use the Convex CLI first for setup, deploys, and verification:

```bash
pnpm exec convex run health:ping
pnpm exec convex run --deployment production-eu health:ping
pnpm exec convex data <table>
pnpm exec convex run --inline-query 'await ctx.db.query("table").take(5)'
```

Run `pnpm exec convex --help` or the repo Convex skills when stuck. Use the
dashboard only when the CLI cannot complete the required admin action.

## AI Files

Convex AI helper files are installed for Claude Code and Codex only. The current
repo config is in `convex.json`:

```json
{
  "aiFiles": {
    "skills": {
      "agents": ["claude-code", "codex"]
    }
  }
}
```

Refresh managed Convex AI guidance only when needed:

```bash
pnpm exec convex ai-files install
```

Before committing after a refresh, restore `CLAUDE.md` to `Refer to @AGENTS.md`
only. `CLAUDE.md` is intentionally just a pointer, but Convex currently rewrites
it during `ai-files install`.

As of 2026-05-06, the managed skill install step still fails on this machine
because the npm cache contains root-owned files. The AI files install correctly,
and the repo already has Convex skills in `.agents/skills`. To retry the managed
skill install later, fix the npm cache ownership or run the command from an
environment with a writable npm cache.

## CLI vs MCP

Convex MCP is optional for this project. The CLI is enough for normal setup,
deploy, health checks, simple table inspection, and ad hoc inline queries. Add
MCP later only if agents need richer interactive database exploration or
Convex-aware workflows that are awkward through one-off CLI commands.
