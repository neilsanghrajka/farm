# Test Users

## Purpose

This file tracks reusable production QA identities for Farm and AgentMail email testing, plus the manual X account requirements for Auto Engage smoke tests. These accounts are test-only, must not contain real user data, and must never be used for production customer activity.

Keep this document safe to commit. Store stable test credentials and the AgentMail API key only in ignored `.env.local`. Never store OAuth access tokens, refresh tokens, recovery codes, one-time verification codes, or magic links in tracked docs or `.env.local`.

## Inventory

These AgentMail/Farm slots are reserved for Auto Engage production smoke tests. Update the table after each Farm account is actually created and verified.

Provisioning status: these rows track AgentMail inboxes and Farm users only. Do not create fresh X accounts for these slots. A row is useful for general Farm QA once Farm role/status is active; it is useful for live Auto Engage smoke only after the user links a separately supplied, aged X test account through Farm Settings.

| Slot | AgentMail email | Farm email | Farm role/status | Linked-X status | Created date |
| --- | --- | --- | --- | --- | --- |
| 1 | `farm-auto-qa-01@agentmail.to` | `farm-auto-qa-01@agentmail.to` | Farm user created; admin in `Farm Auto QA` | Not linked; fresh X signup path blocked by X and should not be retried | 2026-05-07 (AgentMail + Farm) |
| 2 | `farm-auto-qa-02@agentmail.to` | `farm-auto-qa-02@agentmail.to` | Farm user created; member in `Farm Auto QA` | Not linked; use a manually maintained aged X test account if needed | 2026-05-07 (AgentMail + Farm) |
| 3 | `farm-auto-qa-03@agentmail.to` | `farm-auto-qa-03@agentmail.to` | Farm user created; member in `Farm Auto QA` | Not linked; use a manually maintained aged X test account if needed | 2026-05-07 (AgentMail + Farm) |

QA Farm:

- Name: `Farm Auto QA`
- Production Farm id: stored locally as `QA_FARM_ID` in `.env.local`
- Production join URL: stored locally as `QA_FARM_JOIN_URL` in `.env.local`

## Local Credentials

Use `.env.local` for local-only credentials. `.env.local` is ignored and must stay uncommitted.

Recommended keys:

```bash
AGENTMAIL_API_KEY=

TEST_USER_1_EMAIL=farm-auto-qa-01@agentmail.to
TEST_USER_1_FARM_PASSWORD=

TEST_USER_2_EMAIL=farm-auto-qa-02@agentmail.to
TEST_USER_2_FARM_PASSWORD=

TEST_USER_3_EMAIL=farm-auto-qa-03@agentmail.to
TEST_USER_3_FARM_PASSWORD=
```

Do not store AgentMail magic links, X recovery codes, one-time verification codes, OAuth access tokens, refresh tokens, blocked fresh-X credentials, or Convex account secrets in `.env.local`. Prefer regenerating one-time values. If the user supplies aged X test-account credentials for manual smoke testing, store them under clearly separate keys such as `MANUAL_X_TEST_1_USERNAME` and `MANUAL_X_TEST_1_PASSWORD`.

## AgentMail Provisioning

Use the repo-local `$agentmail` skill before creating or inspecting test inboxes. The current skill documents the AgentMail SDK and these core calls:

- Initialize with `new AgentMailClient({ apiKey })`.
- Create inboxes with `client.inboxes.create({ username, domain: "agentmail.to", clientId })`.
- Reuse stable `clientId` values such as `farm-auto-qa-01` so a retry returns the original inbox instead of creating duplicates.
- Poll inbound messages with `client.inboxes.messages.list(inboxId)` and read individual messages with `client.inboxes.messages.get(inboxId, messageId)`.

Suggested setup flow:

1. Confirm `AGENTMAIL_API_KEY` exists in `.env.local`.
2. Create or fetch the three inboxes with usernames `farm-auto-qa-01`, `farm-auto-qa-02`, and `farm-auto-qa-03`.
3. Send a harmless test email to each inbox if needed and confirm it appears via AgentMail messages.
4. Leave the inboxes active for future Farm verification emails.

If AgentMail API access is missing or an inbox cannot receive mail, stop and fix AgentMail before creating Farm accounts. Do not use AgentMail inboxes to automate fresh X account creation.

## Farm User Creation

Use `https://spcfarm.vercel.app` for production QA.

1. Sign out of any existing Farm session.
2. Create the Farm user with the matching AgentMail email.
3. Store the generated Farm password in `.env.local`.
4. Confirm the user can sign in again after a full sign-out.
5. Join or invite the user into the private QA Farm used for Auto Engage tests.
6. Update the inventory table with the Farm status and created date.

Do not create real customer content with these users. Keep names and profile details obviously test-oriented.

## X Test Accounts

Use the existing Farm X OAuth app; do not create a separate X developer app per test user.

Do not automate new X account creation for Farm QA. The AgentMail-based X signup strategy failed because X blocked the newly created slot-1 account after signup/login. Future Auto Engage production smoke tests must use manually maintained, aged X test accounts that the user has already unblocked and can sign into normally.

1. Sign into an existing aged X test account in the same browser session used for Farm OAuth.
2. Link it from Farm Settings through official X OAuth.
3. Store only user-supplied aged X test-account credentials in `.env.local` if the user explicitly wants local reuse. Do not store credentials from blocked/fresh signup attempts.
4. If X asks for CAPTCHA, phone verification, selfie/review, abuse review, or any other human-risk challenge, stop and ask the user to complete that step manually.
5. Update the inventory table only after the X account can sign in normally and link through Farm.

Current X blocker:

- On 2026-05-07, slot 1 completed AgentMail email verification in the in-app Browser and accepted a generated password. A follow-up login test recognized `farm-auto-qa-01@agentmail.to`, but the account was then blocked by X after login.
- Do not create slots 2 and 3 on X. More rapid fresh-account creation is likely to increase blocks.
- Prefer one of these next strategies:
  - Have the user manually appeal/unblock slot 1 and complete any required X trust steps.
  - Use existing aged X test accounts instead of brand-new accounts.
  - Create X test accounts manually with normal human pacing outside agent automation, then only use Farm to link them through official OAuth.

## Linking X In Farm

For each test user:

1. Sign into Farm as the test user.
2. Sign into X as the separately supplied aged X test account in the same browser session used for OAuth.
3. Open Farm Settings and run the X OAuth link flow.
4. Confirm Farm reports the account as linked.
5. Verify the production Convex `accounts` row is linked and has the expected scopes: `tweet.read`, `users.read`, and `like.write`.
6. Confirm token metadata is present and not expired. Do not copy token values into docs or chat.

## Auto Engage Smoke Flow

Use the three Farm QA users plus separately supplied, aged X test accounts for production Auto Engage smoke tests.

1. Create or reuse one private QA Farm.
2. Confirm all three users are active members of the QA Farm.
3. Submit a safe X test post URL from a test account.
4. Confirm the Post Detail view shows pending rows immediately.
5. Confirm Convex `engagementAttempts` rows include selected and scheduled metadata.
6. Confirm at least one selected attempt performs a real X like.
7. Confirm the UI updates live without refresh.
8. Confirm skipped/capped users show plain user-facing statuses, not internal policy details.

Useful Convex checks:

```bash
pnpm exec convex run --deployment production-eu health:ping
pnpm exec convex data --deployment production-eu engagementRequests
pnpm exec convex data --deployment production-eu engagementAttempts
```

Do not dump the production `accounts` table in a shared terminal or chat. Use a targeted status-only Convex function or carefully scoped CLI query that returns only linked status, scopes, and expiration metadata without encrypted token fields.

## Cleanup Policy

- Keep the three QA identities reusable unless an account is compromised, blocked, or no longer links cleanly.
- Remove test posts and QA Farm artifacts through product flows when supported.
- Rotate passwords in `.env.local` if a credential is pasted into chat, committed, or exposed in terminal output.
- Never delete AgentMail inboxes that are still referenced by active Farm accounts unless the whole test identity is being retired.

## Learnings

- AgentMail inboxes should be created before Farm signup so verification emails can be received without switching plans mid-flow.
- Use idempotent AgentMail inbox creation with stable `clientId` values; browser or network retries should not create extra inboxes.
- X signup and trust challenges are human-owned. Treat CAPTCHA, phone, abuse review, or unblock flows as stop points, not automation problems.
- If X blocks a newly created QA account, stop all further X account creation attempts and switch to aged/manual X test accounts.
- Keep one test identity per browser session while linking X, because Farm OAuth will attach whichever X account is currently logged in.
- The tracked source of truth is this document for Farm/AgentMail inventory, and ignored `.env.local` for credentials.
