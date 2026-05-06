# Farm PRD

Last updated: 2026-05-06

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
- Authentication: email-based app signup plus official X OAuth account linking.
- Communities: user-created Farms that members can join by invite link.
- Reporting: request-level status and history showing who engaged, who did not, and how many likes came through Farm.

Out of scope for the initial version:

- Comments, reposts, quote posts, bookmarks, follows, or DMs.
- LinkedIn or other social platforms.
- Non-official X automation, password-based login, scraping, or browser automation.
- Complex campaign management, scheduling, billing, or public discovery of Farms.

## Core Concepts

- User: A person with a Farm account, identified by email and name.
- Account: A connected external social account owned by a user. Initially, this is only an X account.
- Farm: A private group of users who agree to amplify each other's posts.
- Farm admin: The user who creates a Farm. Admins can delete the Farm and remove members.
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

### 1. Onboarding

A new user signs up with their email and name so Farm can identify them and associate them with Farms, connected accounts, and engagement requests.

Acceptance criteria:

- A user can create an account with only email and name.
- Farm does not require X linking during initial account creation.
- After onboarding, the user can reach the main app experience.

### 2. Link X Account

A user connects their X account from Settings using official X OAuth. Farm asks only for the minimum scopes needed to read the target post and like posts on the user's behalf. The user can later disconnect the X account.

Acceptance criteria:

- A user can start official X OAuth from Settings.
- Farm explains that the requested access is limited to reading relevant X post data and liking posts.
- A linked X account appears in Settings.
- A user can disconnect their X account.
- Farm does not request broad posting, DM, password, or unrelated account access.

### 3. Create and Manage a Farm

A user creates a Farm, becomes its admin, and receives a unique invite URL. Anyone with the invite URL can join the Farm after signing up or logging in. The admin can remove members or delete the Farm. Non-admin members can leave a Farm.

Acceptance criteria:

- A user can create a Farm.
- The creator is the Farm admin.
- Farm creates a unique join URL.
- A user with the join URL can join the Farm.
- Admins can remove members.
- Admins can delete the Farm.
- Members can leave the Farm.

### 4. Request Engagement

A user submits an X post URL and selects the Farm they want to request engagement from. If the user belongs to only one Farm, that Farm is selected by default. Farm validates that the URL is a valid X post before creating the request.

Acceptance criteria:

- A user can paste an X post URL.
- Farm validates that the URL points to a valid X post.
- A user can select one of their Farms.
- If the user belongs to exactly one Farm, it is selected by default.
- Farm creates an engagement request only after successful validation.

### 5. Automatic Likes

After an engagement request is created, Farm attempts to like the post from each eligible connected X account in the selected Farm using official X APIs. The request creator's own account may be included if it is eligible and product policy allows it.

Acceptance criteria:

- Farm attempts likes only for members of the selected Farm.
- Farm attempts likes only through linked X accounts with valid authorization.
- Farm records success, failure, skipped, or pending status per eligible member/account.
- Farm does not attempt engagement for users who have not linked X.
- Farm does not use non-official automation methods.

### 6. View Requests and Stats

A user can see active and historical engagement requests, including request status, how many likes came through Farm, which members/accounts engaged, and which did not.

Acceptance criteria:

- A user can view active engagement requests.
- A user can view historical engagement requests.
- Each request shows high-level engagement counts.
- Each request shows which eligible members/accounts successfully engaged.
- Each request shows members/accounts that did not engage or were skipped.

## UX Direction

Farm should feel sleek, lightweight, and app-like. The primary experience should be fast and focused: onboard, connect X, join or create a Farm, submit a post, and see request status. The product should avoid heavy marketing surfaces inside the app and should behave as much like a single-page app as the stack allows.

## UI and Platform Direction

Farm should be designed mobile-first as a touch-friendly progressive web app that users can install on their phones. The core flows should feel natural on a narrow phone viewport, with comfortable tap targets and simple navigation.

The desktop web app should use the same focused product surface rather than expanding into a wide dashboard. On larger screens, Farm should still feel like a narrow app: centered, constrained, and optimized for the same quick workflows people use on mobile.

Acceptance criteria:

- Farm can be used comfortably from a mobile browser.
- Farm can be installed as a progressive web app on supported phones.
- Core actions are touch-friendly and do not depend on desktop-only interactions.
- The desktop experience remains narrow and app-like instead of becoming a broad admin dashboard.
- The same core journeys work across mobile browser, installed PWA, and desktop web.

## Key Risks and Open Questions

- X API permissions, rate limits, and pricing may affect what can be automated reliably.
- Farm needs clear rules for failed likes, revoked OAuth tokens, private/deleted posts, duplicate requests, and already-liked posts.
- The product should define whether the request creator's own account is included in automatic engagement.
- Abuse prevention and trust controls may become important as Farms grow.
- Future platforms, especially LinkedIn, will likely need their own account, post, and engagement rules.

## Future Directions

- LinkedIn account linking and LinkedIn engagement.
- Additional engagement types such as reposts, comments, or follows.
- More detailed analytics per Farm and per request.
- Admin-level Farm settings for who can request engagement and whether approvals are required.
- Notifications when a request is created, completed, or needs attention.

## Amendments

### 2026-05-06: Mobile-First PWA Direction

Added UI and platform direction that Farm should be a touch-friendly progressive web app for phones, while the desktop web experience should remain a narrow, focused app surface.

### 2026-05-06: Initial High-Level PRD

Created the first lightweight product spec for Farm. Defined the core problem, initial X-only likes scope, terminology, major user journeys, high-level acceptance criteria, UX direction, and open questions.
