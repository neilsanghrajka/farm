# X Login

Status: Draft

## Purpose

Define the first authenticated experience after Farm login: the user lands on
Home, sees the existing app surface, and is guided to connect their X account
before they can request engagement.

This feature is called X Login in product shorthand, but it is not the primary
Farm sign-in flow. Farm app login remains password-based in
`docs/features/00_LOGIN.md`. This spec covers linking and unlinking a user's X
account through official X OAuth, storing the linked account server-side, and
using that linked state to gate engagement actions in the app.

## Current Scope

- Keep the existing Home and Settings mocks as the design reference.
- After password login, land the user on Home.
- If the user has not linked X, show a blocking setup prompt on Home.
- The Home prompt sends the user to Settings.
- Settings shows the X account area and starts official X OAuth.
- Store one or more linked external account records for the authenticated Farm
  user, starting with X.
- Store X OAuth token material securely enough for server-side official API
  calls.
- Show linked, unlinked, expired, and revoked account states.
- Allow the user to disconnect their X account.
- Disable request-engagement actions until an eligible X account is linked.

## Future Scope

- A richer onboarding wizard.
- Invite acceptance and Farm joining from invite links.
- Farm creation, joining, leaving, or membership-management UX.
- Request engagement implementation details beyond blocking when X is missing.
- Background token refresh strategy beyond what OAuth setup requires.
- Multiple social platforms.
- Additional X engagement actions beyond likes.
- Admin dashboards or support tooling.

## Non-Goals

- Replacing Farm password login with X login.
- Requiring X linking during account creation.
- Designing new Settings screens from scratch.
- Designing a full invite-acceptance flow.
- Building Farm join/leave flows in this feature.
- Requesting broad X permissions such as posting arbitrary content, DMs,
  passwords, or unrelated account access.
- Browser automation, scraping, or non-official X automation.
- Manual production deploys.

## Design

- Approved reference mocks:
  - `docs/mocks/ask-engagement.png`
  - `docs/mocks/settings-account.png`
  - `docs/mocks/farm-management.png`
  - `docs/mocks/request-status.png`
- Current X linking mocks for approval:
  - `docs/mocks/01_X_LOGIN/home-missing-x.png`
  - `docs/mocks/01_X_LOGIN/settings-x-unlinked.png`
  - `docs/mocks/01_X_LOGIN/settings-x-linked.png`

![Home missing X mock](../mocks/01_X_LOGIN/home-missing-x.png)

![Settings X unlinked mock](../mocks/01_X_LOGIN/settings-x-unlinked.png)

![Settings X linked mock](../mocks/01_X_LOGIN/settings-x-linked.png)

Key layout decisions:

- Home remains the existing `Ask for engagement` surface.
- Home keeps the Settings gear entry point from the existing mock.
- If X is missing, the post URL field, Farm selector, and request button should
  communicate that setup is required before engagement can be requested.
- The missing-X setup prompt should appear near the top of Home, before the
  disabled request controls, and should route to Settings.
- Home should not show badges such as `Official X API only`; keep the missing-X
  state clean and action-oriented.
- Settings keeps the existing connected-account treatment and should support
  both unlinked and linked states in the same section.
- The linked Settings state should show only the connected X account, handle,
  connected status, and `Disconnect`; do not add secondary implementation cards,
  account-detail rows, endpoint verification, `Home is unblocked`, or a bottom
  `Back to Home` button.
- Use the official black X mark treatment in the X account row.
- Use shadcn/Tailwind tokens from `app/globals.css`; avoid one-off page colors
  for foundational surfaces.
- Compose existing shadcn components only. Today that means `Button` plus
  semantic native controls unless another component already exists in
  `components/ui`.

Mobile behavior:

- Mobile is the primary target.
- The setup prompt must remain visible without hiding the main Home context.
- Tap targets must stay comfortable.

Desktop behavior:

- Keep the same narrow app surface centered on the page.
- Do not expand this into a dashboard.

Design approval status:

- Existing Home and Settings mocks are the approved direction.
- X linking state mocks reflect the latest requested changes and need user
  approval before implementation starts.

## Product Requirements

### User Problem

A user who has signed into Farm may not yet have connected X. They need to
understand why engagement actions are blocked and have a direct path to connect
X without being forced through a broad onboarding flow.

### Product Goal

Make X account connection the first useful setup step after login, while keeping
Home recognizable as the app's main working surface.

### Primary User Journey: Link X From Home

- Entry point: authenticated user lands on Home after password login.
- User intent: start using Farm.
- Steps:
  1. User sees the Home screen.
  2. System checks whether the authenticated Farm user has an active linked X
     account.
  3. If X is missing, Home shows a setup prompt and disables engagement
     request submission.
  4. User taps the setup action.
  5. System routes the user to Settings.
  6. User starts official X OAuth.
  7. User authorizes Farm on X.
  8. System stores the linked X account and token material.
  9. User returns to Farm with X marked as connected.
- System behavior: all account ownership is derived from the authenticated
  Convex identity, not from client-provided user IDs.
- Success outcome: Home allows engagement request actions that require X.
- Failure outcome: user remains in Settings with a concise error and can retry.
- Next destination: Home or Settings, depending on where OAuth returns.

### Secondary User Journey: Already Linked

- Entry point: authenticated user lands on Home.
- User intent: request engagement or inspect current app state.
- Steps:
  1. System loads the user's linked account state.
  2. Home does not show the blocking missing-X prompt.
  3. Engagement actions are available subject to the user's Farms and request
     validation.
- Success outcome: the user can continue to the normal Home workflow.
- Failure outcome: if the token is expired or revoked, the account state changes
  to needs reconnect and the blocking prompt returns.
- Next destination: Home.

### Secondary User Journey: Disconnect X

- Entry point: authenticated user opens Settings.
- User intent: remove Farm's access to their X account.
- Steps:
  1. User sees the linked X account.
  2. User taps disconnect.
  3. System confirms or performs the disconnect action.
  4. System marks the account disconnected and removes or invalidates stored
     token material.
  5. Home returns to the missing-X blocked state.
- Success outcome: Farm no longer attempts X actions for that account.
- Failure outcome: user sees a recoverable error.
- Next destination: Settings.

### Edge Cases

- User cancels the X OAuth flow.
- OAuth callback is missing state or code.
- OAuth state does not match the pending session.
- X returns denied access.
- X token exchange fails.
- X account is already linked to the same Farm user.
- X account is already linked to a different Farm user.
- Stored token is expired, revoked, or missing required scope.
- User disconnects while an engagement request is pending.
- User has no Farms yet.
- User has an invite pending, but Farm joining is deferred to onboarding/farm
  specs.

## UX Requirements

- Screen/page inventory:
  - Home with linked-X-ready state.
  - Home with missing-X blocked state.
  - Settings with unlinked X account state.
  - Settings with linked X account state.
  - Settings disconnecting state.
  - OAuth redirect/loading state.
  - OAuth error state.
- Required UI states:
  - Loading linked account state.
  - No X linked.
  - X linking in progress.
  - X linked.
  - X token needs reconnect.
  - X disconnecting.
  - X disconnect failed.
- Copy requirements:
  - Home setup prompt should be direct and operational, not onboarding-themed.
  - Use `Connect X account` for the primary setup action.
  - Use `Reconnect X account` when a previously linked account needs repair.
  - Use `Disconnect` in Settings for unlinking.
  - Do not show implementation proof copy on the user-facing Settings screen,
    including endpoint names, app IDs, or "official API" badges.
- Blocking behavior:
  - Request engagement submission is disabled until X is linked.
  - Home can still show Farm context, recent requests, or empty states.
  - Do not block basic navigation to Settings or Farm surfaces.
- Accessibility basics:
  - Disabled controls need nearby explanatory text.
  - Loading and error states must be announced or visible near the relevant
    action.
  - OAuth actions must be keyboard reachable.

## Technical Specification

### Required Skills And Plugins

Implementation agents must use these repo skills/plugins before writing or
changing code for this feature:

- `$X` at `/Users/neilsanghrajka/Code/farm/.agents/skills/x/SKILL.md` for X
  OAuth, user-context authentication, scopes, rate limits, endpoint behavior,
  and official API verification.
- `$convex` at `/Users/neilsanghrajka/Code/farm/.agents/skills/convex/SKILL.md`
  for routing to the right Convex workflow. For this feature, expect to use the
  more specific auth/schema guidance when adding account tables, auth-owned
  queries, mutations, actions, or HTTP callbacks.
- `@vercel` / Vercel plugin when implementation needs current Next.js/Vercel
  guidance for route handlers, environment variables, production deployment
  behavior, or deployment verification. If the plugin docs tool is unavailable,
  use the repo-local Vercel guidance in `docs/CONVEX.md`, `AGENTS.md`, and CLI
  help instead of guessing.
- `$frontend-skill` and `$vercel-plugin/shadcn` for any Home or Settings UI
  changes. Use only existing shadcn components unless a later approved task adds
  more.

Do not rely on memory for X, Convex, or Vercel behavior when implementing this
feature. Re-open the relevant skill and use current official docs/CLI output
where the behavior affects auth, tokens, billing, deployment, or production
configuration.

### Frontend

- Routes/pages affected:
  - Home route or authenticated root surface.
  - Settings route or Settings screen.
  - OAuth callback route if the callback is handled by Next.js.
- Component ownership:
  - Create a small Home setup prompt component only if it keeps the Home file
    readable.
  - Keep Settings X account UI local to Settings unless reused elsewhere.
- Existing shadcn components to compose:
  - Use `Button` from `components/ui/button.tsx`.
  - Use native semantic elements for sections, labels, status text, and links.
  - Do not add new shadcn components for this pass unless implementation proves
    an existing component already exists in the repo.
- State management:
  - Linked-account status should come from Convex queries.
  - OAuth start/disconnect actions should call backend functions or API routes,
    not trust client-only state.
- Navigation:
  - Home setup action routes to Settings.
  - Settings starts OAuth and returns to a stable app destination after success
    or failure.
- Loading/error/success handling:
  - Keep button dimensions stable while loading.
  - Show concise inline errors.
  - Avoid modal-heavy flows for v1.
  - After a successful OAuth callback, return to Settings or Home without a
    celebratory interstitial.
  - Use the existing Settings back arrow for navigation; do not add a bottom
    `Back to Home` button to the linked-account state.

### Route And Runtime Boundary

Implementation must decide where the OAuth callback is handled before writing
the token exchange code:

- Option A: Next.js route handler owns `/callback`, exchanges the OAuth code,
  then calls Convex to upsert the linked account. In this option, Vercel must
  have `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI`, `X_OAUTH_SCOPES`,
  `X_APP_ID`, and `X_ENROLLED_ACCOUNT_ID`.
- Option B: Convex HTTP action owns the OAuth callback, exchanges the OAuth
  code, and writes the linked account directly. In this option, Convex must have
  the same X env vars and the X Developer Console callback should point to the
  Convex site URL route.
- The current production env setup supports either direction except for the two
  missing secret credential values. Do not duplicate token-exchange logic across
  both runtimes.

### Convex / Backend

Read `docs/CONVEX.md` and `convex/_generated/ai/guidelines.md` before editing
backend code.

Required entities:

- Add an `accounts` table for linked external accounts.
- Link each account to the authenticated Farm profile or Convex Auth user.
- Support provider `x` as the initial provider.

Recommended account fields:

- `userId`: Convex Auth user id.
- `profileId`: Farm profile id if needed by product queries.
- `provider`: `"x"`.
- `providerAccountId`: stable X user id.
- `username`: X handle when available.
- `displayName`: X display name when available.
- `status`: `"linked" | "needs_reconnect" | "disconnected"`.
- `scopes`: granted OAuth scopes.
- `accessToken`: encrypted or otherwise protected token material.
- `refreshToken`: encrypted or otherwise protected token material when issued.
- `expiresAt`: token expiry timestamp when applicable.
- `createdAt`, `updatedAt`, `disconnectedAt`.

Recommended indexes:

- `by_userId_and_provider`
- `by_provider_and_providerAccountId`
- `by_status`

Required backend functions or endpoints:

- Query current user's linked account state.
- Start X OAuth and create a signed state value.
- Handle X OAuth callback and exchange code for token material.
- Upsert the X account for the authenticated user.
- Disconnect the current user's X account.
- Mark account as needs reconnect when token validation or an X API call proves
  the token is invalid.

Backend requirements:

- Never accept client-provided user IDs for ownership.
- Use authenticated identity from Convex Auth.
- Validate OAuth state before exchanging tokens.
- Store only the minimum X account metadata needed by the product.
- Keep token material server-side only.
- Return redacted account state to the client.
- Do not expose `X_CLIENT_SECRET`, access tokens, refresh tokens, or raw OAuth
  responses to the browser.

### Auth

- Farm app login stays in `docs/features/00_LOGIN.md`.
- X OAuth is account linking for authenticated Farm users.
- Use official X OAuth with the minimum scopes needed for reading relevant post
  data and liking posts.
- The OAuth flow must not grant arbitrary posting, DM, password, or unrelated
  account access.
- A user can unlink X without deleting their Farm account.

### X API

Use the X skill and current official X docs before implementation.

Known working developer setup from prior local verification:

- X account used for testing: `@NeilSanghrajka`.
- Authenticated X user ID returned by API: `1021261303`.
- X Developer Console account URL:
  `https://console.x.com/accounts/2051926369484025856`.
- Developer account/enrolled account ID: `2051926369484025856`.
- App ID: `32883674`.
- App name shown in console: `2051926369484025856NeilSanghra`.
- App status: `ACTIVE`.
- Billing model shown: Pay Per Use.
- App permissions: `Read and write`.
- Type of App: `Native App`.
- Local callback / redirect URL used in testing:
  `http://127.0.0.1:3000/callback`.
- Local website URL used in testing: `http://127.0.0.1:3000`.
- Scopes verified for the like flow:
  `tweet.read users.read like.write offline.access`.

Sensitive credential handling:

- OAuth 2.0 Client ID exists in the console and can be used in code through an
  environment variable.
- Client Secret was displayed once by X and must not be committed or pasted into
  docs.
- If the secret is unavailable, retrieve or regenerate it from:
  `Developer Console -> Apps -> app 32883674 -> Keys & Tokens`.
- Use these environment variables for X credentials and production callback
  configuration:
  - `X_CLIENT_ID`
  - `X_CLIENT_SECRET`
  - `X_REDIRECT_URI`
  - `X_OAUTH_SCOPES`
  - `X_APP_ID`
  - `X_ENROLLED_ACCOUNT_ID`
- Store server-only X values on the runtime that handles OAuth/token exchange.
  If Convex handles the callback, set them on Convex. If Next.js route handlers
  handle the callback, set them on Vercel. It is acceptable to set them on both
  while the implementation boundary is still being finalized.

Current production env status as of 2026-05-06:

- Vercel Production has:
  - `CONVEX_DEPLOY_KEY`
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_CONVEX_SITE_URL`
  - `X_REDIRECT_URI`
  - `X_OAUTH_SCOPES`
  - `X_APP_ID`
  - `X_ENROLLED_ACCOUNT_ID`
- Convex `production-eu` has:
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_CONVEX_SITE_URL`
  - `X_REDIRECT_URI`
  - `X_OAUTH_SCOPES`
  - `X_APP_ID`
  - `X_ENROLLED_ACCOUNT_ID`
- Still missing before production OAuth can work:
  - `X_CLIENT_ID`
  - `X_CLIENT_SECRET`
- The known local X Developer Console callback is
  `http://127.0.0.1:3000/callback`. Before production verification, add the
  production callback that matches the chosen runtime, such as
  `https://spcfarm.vercel.app/callback` for a Next.js callback.

Known working OAuth flow:

1. Generate `code_verifier`, `code_challenge`, and `state`.
2. Start a callback endpoint at `http://127.0.0.1:3000/callback` for local
   testing.
3. Send the user to `https://x.com/i/oauth2/authorize`.
4. User authorizes the app as `@NeilSanghrajka`.
5. X redirects to the callback with `code`.
6. Exchange the code at `POST https://api.x.com/2/oauth2/token`.
7. Call `GET https://api.x.com/2/users/me`.
8. Store the returned X user ID and account metadata.

Known working API calls:

- Token exchange: `POST https://api.x.com/2/oauth2/token`.
- Authenticated user lookup: `GET https://api.x.com/2/users/me`.
- Like post:
  `POST https://api.x.com/2/users/1021261303/likes`.
- Like body:

```json
{ "tweet_id": "<post_id>" }
```

Known verified results:

- `POST /2/users/1021261303/likes` returned
  `{"data":{"liked":true}}` for post ID `1956354563738566775` after credits
  were purchased.
- `POST /2/users/1021261303/likes` returned
  `{"data":{"liked":true}}` for post ID `2051754112010666449`.

Operational guardrails:

- Do not use app-only bearer tokens for likes. Likes require user-context OAuth.
- The like endpoint accepts numeric post IDs, not full X URLs. Extract the
  numeric ID after `/status/` and pass it as `tweet_id`.
- If the like call fails with `402 CreditsDepleted`, check Developer Console
  billing/credits.
- If the like call fails with `403`, check scopes, app permissions, user auth
  settings, and current X write-access rules.
- Use the X Developer Console only when CLIs or local scripts cannot complete
  the needed action. Dia is logged into X and the Developer Console for manual
  dashboard work.

Implementation agents should verify:

- OAuth method and PKCE/client-secret requirements for the chosen X app type.
- Exact scopes needed for reading target post data and liking posts.
- Whether refresh tokens are issued for the chosen OAuth configuration.
- Rate-limit and error behavior for token validation and liking.

## Development Plan

1. Re-open the required skills/plugins listed above.
2. Confirm current routing shape for authenticated Home and Settings.
3. Confirm whether Next.js or Convex owns the OAuth callback.
4. Add or verify the required X env vars for the chosen runtime.
5. Add the production callback URL to the X Developer Console if it is not
   already configured.
6. Add the `accounts` schema and indexes.
7. Add Convex functions/endpoints for linked account state.
8. Add OAuth start/callback handling.
9. Add Settings linked/unlinked UI using the current X linking mocks.
10. Add Home missing-X blocked state using the current Home mock.
11. Add disconnect behavior.
12. Verify local auth, OAuth redirects, linked state, disconnect, and Home
    gating.

## Verification Plan

- Run `pnpm lint`.
- Run `pnpm typecheck`.
- Run Convex checks with the CLI where applicable:
  - `pnpm exec convex --help` when stuck.
  - `pnpm exec convex run health:ping`.
- Confirm env/config before OAuth testing:
  - `X_CLIENT_ID` is set in the runtime handling OAuth.
  - `X_CLIENT_SECRET` is set in the runtime handling OAuth.
  - `X_REDIRECT_URI` matches an allowed X Developer Console callback.
  - `X_OAUTH_SCOPES` contains
    `tweet.read users.read like.write offline.access`.
- Use the in-app browser for localhost verification:
  - Sign in.
  - Land on Home.
  - Confirm missing-X prompt appears.
  - Navigate to Settings.
  - Start OAuth or verify the configured local callback behavior.
  - Confirm linked state appears after a successful callback.
  - Disconnect X.
  - Confirm Home returns to the blocked state.
- Production deploys happen automatically on GitHub push. Do not manually deploy
  unless explicitly asked.
- Production verification after push:
  - Open `https://spcfarm.vercel.app`.
  - Sign in.
  - Confirm missing-X Home state.
  - Start X OAuth from Settings.
  - Confirm OAuth returns to Farm.
  - Confirm linked X account appears without exposing token material.
  - Disconnect X and confirm Home returns to the blocked state.

## Acceptance Criteria

- After Farm login, the user lands on Home.
- If the user has no active linked X account, Home shows a blocking prompt.
- Missing-X Home state prevents request engagement submission.
- The Home prompt routes the user to Settings.
- Settings can start official X OAuth.
- A successful OAuth callback creates or updates an X account entity.
- Linked X state is visible in Settings.
- Settings linked state contains only the connected X account summary and
  disconnect action.
- The client never receives raw token material.
- The user can disconnect X.
- Disconnecting X returns Home to the missing-X blocked state.
- Invite acceptance and broader onboarding remain out of scope.
