# Convex Workflow

This project uses Convex as the backend for the Next.js app.

## Project Facts

Keep live deployment identifiers, team names, project IDs, production URLs, and
Convex cloud URLs in private environment configuration or an untracked operator
runbook. Do not commit those account-specific values.

Expected private values:

- Convex team/project/deployment names
- Convex dev and production URLs
- Vercel project and production URL
- Production deployment selector used with `--deployment`

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
- Check local, Vercel, and Convex env names without printing secret values:

```bash
pnpm env:check
```

Expected local env names:

```bash
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
CONVEX_SITE_URL= # also used by the Next.js /callback route on Vercel
NEXT_PUBLIC_APP_URL=
X_CLIENT_ID=
X_REDIRECT_URI=
X_OAUTH_SCOPES=
X_TOKEN_ENCRYPTION_KEY=
```

Expected Vercel Production env names:

```bash
CONVEX_SITE_URL= # server-only redirect target for app/callback/route.ts
CONVEX_DEPLOY_KEY=
NEXT_PUBLIC_APP_URL=
```

Do not keep X OAuth credentials, X app/account metadata, Convex deployment URLs,
or `NEXT_PUBLIC_CONVEX_SITE_URL` in Vercel env. Vercel receives
`NEXT_PUBLIC_CONVEX_URL` from the Convex deploy build wrapper.

Expected Convex Production env names:

```bash
NEXT_PUBLIC_APP_URL=
X_CLIENT_ID=
X_REDIRECT_URI=
X_OAUTH_SCOPES=
X_APP_ID=
X_ENROLLED_ACCOUNT_ID=
X_TOKEN_ENCRYPTION_KEY=
```

Optional Convex env names:

```bash
X_CLIENT_SECRET= # only for confidential OAuth clients
X_BEARER_TOKEN= # optional public post metadata lookup
X_API_BEARER_TOKEN= # optional public post metadata lookup fallback
```

## Production Deploys

Production deploys are triggered by GitHub pushes to `main`. Vercel should run
the official Convex production build flow before building Next.js:

```bash
pnpm exec convex deploy --cmd 'pnpm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

This command deploys Convex functions and sets `NEXT_PUBLIC_CONVEX_URL` for the
Next.js build command it wraps. Vercel needs `CONVEX_DEPLOY_KEY` configured in
the Production environment as a sensitive value.

Useful Vercel checks:

```bash
vercel inspect "$NEXT_PUBLIC_APP_URL" --wait
vercel logs "$NEXT_PUBLIC_APP_URL" --no-follow
```

## Convex CLI

Use the Convex CLI first for setup, deploys, and verification:

```bash
pnpm exec convex run health:ping
pnpm exec convex run --deployment "$CONVEX_DEPLOYMENT" health:ping
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
