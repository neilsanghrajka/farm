# Farm PRD

Last updated: 2026-05-07

## How to Update This Document

This is Farm's lightweight product requirements document and product changelog. Keep it high level: capture what changed, why it matters, core user journeys, and user acceptance criteria. Detailed specs for individual flows should live in separate documents and be linked from here.

When product requirements change:

1. Update the relevant section if the current product direction has changed.
2. Add an entry under Amendments with the date, summary, and any linked follow-up specs.
3. Keep implementation details, API schemas, and deep edge-case handling out of this document unless they are necessary to understand the product.

## Product Summary

Farm helps trusted communities amplify each other's public work on X. Today, founders and community members often ask for engagement by dropping links into noisy WhatsApp, Slack, or group chats. That workflow depends on people noticing the message, taking the time to open it, and manually liking or engaging.

Farm turns that informal "please engage" behavior into a lightweight pod-based product. A user joins a Farm with other trusted members. When a member requests engagement on a valid X post, Farm automatically likes that post from the connected X accounts of participating members, using official X APIs and minimal OAuth scopes.

## Problem Statement

Community members want early engagement on launches, updates, asks, and public work, but group-chat amplification is noisy, inconsistent, and manual. People intend to support each other, yet the cost of noticing and acting on every request means many posts get missed.

## Initial Scope

As of 2026-05-06, Farm is scoped to:

- Platform: X only.
- Engagement type: likes only.
- Authentication: password-based app login/signup plus official X OAuth account linking.
- Communities: user-created Farms that members can join by invite link.
- Reporting: request-level status and history showing who engaged, who did not, and how many likes came through Farm.

Out of scope for the initial version:

- Comments, reposts, quote posts, bookmarks, follows, or DMs.
- LinkedIn or other social platforms.
- Non-official X automation, passwordless magic-link or OTP login, scraping, or browser automation.
- Complex campaign management, scheduling, billing, or public discovery of Farms.

## Core Concepts

- User: A person with a Farm account, identified by email and name.
- Account: A connected external social account owned by a user. Initially, this is only an X account.
- Farm: A private group of users who agree to amplify each other's posts.
- Farm admin: The user who creates a Farm. Admins can copy the Farm join link
  and delete the Farm.
- Post: A public post on an external platform. Initially, this means a valid X post URL.
- Engagement request: A user's request for members of a selected Farm to engage with a specific post.
- Engagement: The action Farm performs on behalf of a connected account. Initially, this is an X like.

## Product Principles

- Use official platform APIs only.
- Request the minimum possible OAuth scopes.
- Make account access understandable and reversible.
- Keep the product lightweight and fast enough to feel like a single-page app.
- Prefer trusted private Farms over public amplification marketplaces.
- Show clear status so users know what Farm did and did not do.

## User Journeys

### 1. Login

A signed-out user continues with one password-based flow that handles both new and returning users. New users provide a name during the same flow so Farm can identify them and associate them with Farms, connected accounts, and engagement requests.

Detailed spec: `docs/features/00_LOGIN.md`

Acceptance criteria:

- A user can sign in or create an account from one combined password flow.
- A new user can provide a name without choosing a separate signup path.
- Farm does not require X linking during initial account creation.
- After login, the user can reach the main app experience.

### 2. X Account Linking

A user lands on Home after Farm login. If they have not linked X, Home changes
the primary request action to `Link X account` and sends them to Settings to
connect their X account through official X OAuth. Farm asks only for X
like/unlike permission plus offline access so the user does not need to
reconnect every session. The user can later disconnect the X account.

Detailed spec: `docs/features/01_X_LOGIN.md`

Acceptance criteria:

- Home shows a clear `Link X account` action when the user has not linked X.
- Engagement-request actions are disabled until the user has an eligible linked X account.
- A user can start official X OAuth from Settings.
- Farm explains before redirecting to X that requested access is limited to liking/unliking submitted X post URLs and staying connected.
- A linked X account appears in Settings and unblocks Home.
- A user can disconnect their X account.
- Farm does not request broad posting, DM, password, or unrelated account access.

### 3. Create and Manage a Farm

A user creates a Farm, becomes its admin, and receives a unique join URL. Anyone
with the join URL can review the Farm and join after signing up or logging in.
The admin can copy the join URL or delete the Farm. Non-admin members can leave
a Farm.

Detailed spec: `docs/features/03_FARM.md`

Acceptance criteria:

- A user can create a Farm.
- The creator is the Farm admin.
- Farm creates a unique join URL.
- A user with the join URL can confirm and join the Farm.
- Admins can copy the join URL.
- Admins can delete the Farm.
- Members can leave the Farm.

### 4. Request Engagement

A user opens Home, pastes an existing public X post URL, and selects the Farm
they want to request engagement from. If the user belongs to only one Farm, that
Farm is selected by default. Farm validates and canonicalizes the URL, verifies
the target post through official X APIs, creates the engagement request only
after successful validation, and routes the user to request status.

Detailed spec: `docs/features/04_HOME.md`

Acceptance criteria:

- A user can paste an existing X post URL.
- Farm does not require or support composing a new X post inside Farm for v1.
- Engagement request creation is disabled until the user has an eligible linked
  X account.
- A user can select one of their Farms.
- If the user belongs to exactly one Farm, it is selected by default.
- If the user has no Farms, Home gives them a clear create-Farm path.
- Farm validates that the URL points to a valid X post through official X APIs.
- Duplicate requests for the same Farm and X post route to the existing request
  instead of creating duplicate attempt rows.
- Farm creates an engagement request and member-attempt snapshot only after
  successful validation.
- After request creation, the user lands on request status.

### 5. Automatic Likes

After an engagement request is created, Farm attempts to like the post from each
eligible connected X account in the selected Farm using official X APIs. The
request creator's own account is included when the creator is an active member
of the selected Farm and has an eligible linked X account.

Acceptance criteria:

- Farm attempts likes only for members of the selected Farm.
- Farm attempts likes only through linked X accounts with valid authorization.
- Farm records success, failure, skipped, or pending status per eligible member/account.
- Farm does not attempt engagement for users who have not linked X.
- Farm does not use non-official automation methods.

### 6. View Requests and Stats

A user can see active and historical engagement requests, including request status, how many likes came through Farm, which members/accounts engaged, and which did not.

Detailed spec: `docs/features/05_POST.md`

Acceptance criteria:

- A user can view active engagement requests.
- A user can view historical engagement requests.
- Each request shows high-level engagement counts.
- Each request shows which eligible members/accounts successfully engaged.
- Each request shows members/accounts that did not engage or were skipped.

## UX Direction

Farm should feel sleek, lightweight, and app-like. The primary experience should be fast and focused: log in, connect X, join or create a Farm, submit a post, and see request status. The product should avoid heavy marketing surfaces inside the app and should behave as much like a single-page app as the stack allows.

## UI and Platform Direction

Farm should be designed mobile-first as a touch-friendly progressive web app that users can install on their phones. The core flows should feel natural on a narrow phone viewport, with comfortable tap targets and simple navigation.

The desktop web app should use the same focused product surface rather than expanding into a wide dashboard. On larger screens, Farm should still feel like a narrow app: centered, constrained, and optimized for the same quick workflows people use on mobile.

Farm should use a restrained shadcn/Tailwind v4 visual system: neutral theme tokens, Geist typography, consistent radius, one primary accent, and mobile-first app surfaces. Core UI should rely on shadcn components and global tokens rather than custom one-off styling.

Acceptance criteria:

- Farm can be used comfortably from a mobile browser.
- Farm can be installed as a progressive web app on supported phones.
- Core actions are touch-friendly and do not depend on desktop-only interactions.
- The desktop experience remains narrow and app-like instead of becoming a broad admin dashboard.
- The same core journeys work across mobile browser, installed PWA, and desktop web.

## Key Risks and Open Questions

- X API permissions, rate limits, and pricing may affect what can be automated reliably.
- Farm needs clear rules for failed likes, revoked OAuth tokens, private/deleted posts, duplicate requests, and already-liked posts.
- Abuse prevention and trust controls may become important as Farms grow.
- Future platforms, especially LinkedIn, will likely need their own account, post, and engagement rules.

## Future Directions

- LinkedIn account linking and LinkedIn engagement.
- Additional engagement types such as reposts, comments, or follows.
- Admin member removal and multiple-admin role management.
- More detailed analytics per Farm and per request.
- Admin-level Farm settings for who can request engagement and whether approvals are required.
- Notifications when a request is created, completed, or needs attention.

## Amendments

### 2026-05-07: Mobile UX Tightening

Tightened the Home, Settings, and Farm detail surfaces based on browser review:
Home now uses `Request X Engagement`, removes supporting copy and separate API
badges, folds linked-account readiness into the Farm selector, and shortens the
primary action to `Request`. Settings no longer shows a connected-status badge
for X accounts. Farm detail now uses a smaller title, one-line member/admin
metadata, and a compact share-link row.

### 2026-05-07: Top-Level Mobile Navigation

Added a persistent bottom nav for authenticated top-level app areas: `My Farms`,
center-highlighted `Home`, and `Posts`. `Posts` is the request history/status
surface and links rows back to request detail. Settings remains reachable from
the Home header gear instead of becoming a bottom tab.

### 2026-05-07: Missing-X Home CTA

Removed the separate missing-X setup card from Home. When X is missing,
expired, revoked, or otherwise not eligible, the main request CTA becomes
`Link X account` with a warning icon and routes to Settings.

### 2026-05-07: Strict X Like-Only Linking

Changed X linking to request only `like.write offline.access`. Farm no longer
requests user-context X read scopes for account linking; app-only post
validation remains separate from user authorization. If X rejects liking under
the stricter scope set, Farm should fail closed and report the permission
blocker rather than silently broadening scopes.

### 2026-05-07: Minimal Official X Like Processing

Added a narrow synchronous like pass after Home request creation. Eligible
pending attempts call the official X like endpoint using linked account tokens,
then record liked, retryable failure, or final failure outcomes in the existing
request-status tables.

### 2026-05-07: Grand Unification Pending-Only Auto Engage

Unified the X linking, Farm, Home request creation, and request-status work into
one mainline direction. Request creation/status can ship before automatic X
likes: created requests persist pending/skipped attempt rows, show those rows in
request status, and leave eligible accounts pending until
`docs/features/06_AUTO_ENGAGE.md` implements the official X like worker.

### 2026-05-07: Home Request Creation Spec

Expanded `docs/features/04_HOME.md` from placeholder to the detailed Home spec.
Home now owns the v1 URL-paste request flow: linked-X gating, Farm selection,
official X post validation, duplicate handling, request/attempt snapshot
creation, Auto Engage handoff, recent request navigation, and request-status
handoff. This supersedes treating request creation as part of the request-status
implementation slice once the WIP branches land.

### 2026-05-07: Request Status Implementation Slice

Expanded the request-status implementation scope to include the narrow Home
request creation path required for an end-to-end flow: X post URL input, Farm
selection, request record creation, pending member-attempt snapshot, and recent
request links. Broader Home history/filter behavior remains separate.

### 2026-05-06: Request Status Spec

Added `docs/features/05_POST.md` as the detailed request-status spec. The current
scope is private request detail, aggregate progress, member outcomes, historical
visibility, copy-link, and an `Ask again` navigation contract. Request creation,
X account linking, and automatic likes remain in their separate specs.

### 2026-05-06: Farm UI Scope

Added `docs/features/03_FARM.md` as the detailed Farm UI spec. The current Farm
scope is create, list, join by reusable link, copy link, leave, and admin delete.
X/Twitter eligibility gates, invite-member flows, member removal, and multiple
admin controls are deferred.

### 2026-05-06: X Linking Before Onboarding

Moved broader onboarding and invite acceptance out of the next spec. The current sequence is `docs/features/00_LOGIN.md`, then `docs/features/01_X_LOGIN.md`, with `docs/features/07_ONBOARDING.md` deferred for invite and first-run choices.

### 2026-05-06: Combined Login Flow

Split the signed-out entry experience into `docs/features/00_LOGIN.md`. Login and signup share one password-based flow, with name capture handled inside that flow for first-time users.

### 2026-05-06: Password Login Scope

Updated login scope to password-based app login/signup. Passwordless magic-link and OTP flows are out of scope for v1 login.

### 2026-05-06: Mobile-First PWA Direction

Added UI and platform direction that Farm should be a touch-friendly progressive web app for phones, while the desktop web experience should remain a narrow, focused app surface.

### 2026-05-06: Initial High-Level PRD

Created the first lightweight product spec for Farm. Defined the core problem, initial X-only likes scope, terminology, major user journeys, high-level acceptance criteria, UX direction, and open questions.
