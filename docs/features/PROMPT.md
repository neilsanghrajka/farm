# Feature Spec Generator Prompt

Use this prompt whenever you want to turn a feature idea into a detailed Farm feature spec under `docs/features`.

The user should only need to describe what they want to build. The agent using this prompt is responsible for turning that description into a design-backed product spec, technical plan, development plan, verification plan, and execution-ready handoff.

Do not copy repo policy into every generated spec. Read and follow `AGENTS.md`, then reference the relevant repo docs and skills from the spec.

Current feature order:

1. `docs/features/00_LOGIN.md` - password-based Farm login/signup.
2. `docs/features/01_X_LOGIN.md` - first authenticated Home experience and X account linking.
3. `docs/features/07_ONBOARDING.md` - deferred broader onboarding and invite acceptance.

Do not treat X account linking as the broader onboarding spec unless the user explicitly asks to merge those scopes.

```md
You are working in `/Users/neilsanghrajka/Code/farm`.

I am describing a feature. Your job is to create a detailed feature spec that can later be handed to implementation agents to prototype, get design approval, build, self-verify, and push.

Feature name:
[FEATURE_NAME]

Target feature doc:
`docs/features/[NN_FEATURE_NAME].md`

Feature description:
[PASTE FEATURE IDEA / RAW NOTES HERE]

Current mode:
[SPEC_ONLY or SPEC_THEN_BUILD]

Follow `AGENTS.md`. Do not repeat its standing instructions inside the generated feature spec. Reference repo docs, skills, commands, and existing patterns instead.

## Required Process

### 1. Clarify Scope

Turn the raw feature description into:

- current scope
- future scope
- non-goals
- blocking open questions only
- safe assumptions

If the user gave contradictory notes, use the latest and most specific instruction as the source of truth.

Ask questions only when the answer blocks the spec. Otherwise make a reasonable assumption and record it.

If the notes mix onboarding, invite acceptance, Home, Settings, and X OAuth, separate them by current scope:

- Farm login belongs in `00_LOGIN`.
- X account linking and the missing-X Home block belong in `01_X_LOGIN`.
- Invite acceptance, Farm joining, Farm leaving, and broader first-run choices belong in the deferred onboarding/Farm specs unless the user explicitly moves them into current scope.

### 2. Run Parallel Spec-Writing

Use 3 parallel subagents while writing the spec.

Each spec-writing subagent must inspect a distinct area and return concise findings with file references:

1. Product and docs:
   - `docs/PRD.md`
   - existing `docs/features/*`
   - feature naming conventions
   - existing product journeys and acceptance criteria

2. Design, frontend, and shadcn:
   - existing app screens/routes
   - existing shadcn components
   - theme/style conventions
   - existing mocks in `docs/mocks`
   - which existing components should compose the feature

3. Technical, data, and verification:
   - `docs/CONVEX.md`
   - `convex/_generated/ai/guidelines.md`
   - schema/functions/auth patterns
   - entities, queries, mutations, actions, env vars, and backend checks needed
   - local scripts and commands
   - in-app browser verification path
   - Convex CLI checks
   - production verification path
   - push/deploy expectations from repo docs

Use the relevant repo skills by reference:

- `$frontend-skill`
- `$vercel:shadcn` at
  `/Users/neilsanghrajka/.codex/plugins/cache/openai-curated/vercel/9d07fd08/skills/shadcn/SKILL.md`
- Convex skills
- Vercel skills
- X/Twitter skills when the feature touches X
- ImageGen when the feature needs visual mocks
- `$browser-use` / `@Browser` in-app browser skill for visual and flow testing

Shadcn implementation guidance:

- Use `$vercel:shadcn` for all UI implementation guidance.
- Prefer shadcn components for UI primitives and interaction patterns. Shadcn
  has components for common product needs: buttons, inputs, labels, forms,
  cards, badges, alerts, dialogs, dropdowns, sheets, tabs, tables, skeletons,
  separators, avatars, scroll areas, tooltips, and more.
- If a needed shadcn component is not already in `components/ui`, the spec
  should tell implementors to add it with the shadcn CLI using `pnpm`/`pnpm dlx`
  and the non-interactive flags from the skill, then compose that component.
- Do not hand-roll custom UI primitives or local one-off replacements when a
  shadcn component exists. Do not create custom app components just to wrap
  basic UI primitives; compose the shadcn components directly unless there is a
  clearly feature-specific, reusable product component.
- Keep foundational styling on shadcn/Tailwind v4 theme tokens from
  `app/globals.css`.

Browser surface guidance:

- Use the in-app Browser plugin for local app verification, including
  `localhost`, `127.0.0.1`, production URL checks, visual review, screenshots,
  form flows, auth flows, and console-log checks.
- Prefer Browser over Computer Use for anything inside the Farm web app. Browser
  gives DOM snapshots, Playwright-style selectors, screenshots, and console
  logs, so it is the default verification surface.
- Use Computer Use only when Browser is the wrong surface: admin dashboards that
  require Dia/browser state, native desktop apps, browser extension UI, OS
  dialogs, or other non-page surfaces the Browser plugin cannot control.
- If Browser tool discovery is needed, look up the Browser/node REPL runtime and
  initialize it with the `iab` backend before falling back to Computer Use.
- If Browser cannot be used after attempting the documented setup, record the
  blocker in the spec/verification notes and then use the safest fallback.

### 3. Create Or Update Design Mocks First

Before finalizing a feature spec that changes UX, generate the required visual mock with ImageGen.

Use existing mocks in `docs/mocks` as design context.

Exception: if the user explicitly says to keep existing mocks as-is, do not generate a new mock. Reference the existing approved mock paths and record that no new mock was needed.

Store approved mocks under:

`docs/mocks/[NN_FEATURE_NAME]/[mock-name].png`

Process:

1. Generate the first mock.
2. Show it to the user.
3. Iterate until the user approves the direction.
4. Save the approved mock under `docs/mocks`.
5. Reference the approved mock path in the feature spec.

Do not treat the mock as optional for UI-facing features. The spec should be design-backed.

### 4. Write The Feature Spec

Write the feature doc at:

`docs/features/[NN_FEATURE_NAME].md`

The generated spec should read like a PM-written product spec plus an engineering execution plan. It should not be a copy of `AGENTS.md`.

Use this structure:

# [Feature Name]

Status: Draft

## Purpose

Explain the user problem and why this feature matters.

## Current Scope

List exactly what will be built now.

## Future Scope

Capture related ideas that should not be built in this feature.

## Non-Goals

List what is explicitly out of scope.

## Design

Include:

- approved mock links
- existing mocks used as references
- key layout decisions
- mobile-first behavior
- desktop behavior
- design approval status

Example:

- Approved mock: `docs/mocks/00_LOGIN/login-screen.png`
- Reference mocks: `docs/mocks/settings-account.png`

## Product Requirements

Include:

- user problem
- product goal
- primary user journey
- secondary user journeys
- sub-flows
- edge cases
- success states
- failure states

For each user flow, include:

- entry point
- user intent
- steps
- system behavior
- success outcome
- failure outcome
- next destination

## UX Requirements

Include:

- screen/page inventory
- required UI states
- copy requirements
- fields and validation
- loading states
- empty states
- error states
- success states
- accessibility basics
- responsive behavior

## Technical Specification

This section should describe what implementation agents need to build without over-prescribing unrelated refactors.

Include the relevant subsections only:

### Frontend

Include:

- routes/pages affected
- component ownership
- existing shadcn components to compose
- any theme/token changes
- state management
- form handling
- navigation
- loading/error/success handling

Use shadcn components wherever they fit. If the needed component is not already
installed locally, specify the shadcn component to add instead of asking
implementors to hand-roll custom UI. Avoid creating bespoke local UI components
for primitives that shadcn already provides.

### Convex / Backend

Include:

- entities/tables created or changed
- fields and indexes
- queries
- mutations
- actions
- auth/session mapping
- backend validation
- env vars
- CLI checks needed

Point to Convex docs/skills instead of restating Convex rules.

### Auth

Include this when auth is involved:

- provider or auth mechanism
- login/signup behavior
- session behavior
- user entity creation/update behavior
- redirect behavior
- local env vars
- production env vars
- verification checks

### Integrations

Include this when the feature touches X, Vercel, email, or another external system:

- integration purpose
- scopes/permissions
- callback/redirect behavior
- env vars
- success/failure handling
- verification checks

## Data Model

List every entity created or changed.

For each entity include:

- purpose
- fields
- indexes
- relationships
- creation/update lifecycle
- example record shape if useful

## Development Plan

Create a small, sequential implementation plan.

Also include an explicit parallel implementation plan with 4 parallel building subagents when implementation begins.

Building subagents must have non-overlapping ownership, for example:

1. Design/theme/mock fidelity owner
2. Frontend route and component owner
3. Convex/auth/data owner
4. Verification, browser testing, backend checks, and cleanup owner

Tell building subagents:

- they are not alone in the codebase
- they must not revert others' edits
- they must adapt to nearby changes
- they must report changed files and verification results

The main agent owns final integration.

## Acceptance Criteria

Use checkboxes.

Include criteria for:

- product behavior
- visual fidelity to approved mocks
- frontend states
- backend/data behavior
- auth/session behavior when relevant
- error handling
- mobile behavior
- desktop behavior
- accessibility basics
- no unrelated product changes

## Verification Plan

The implementation agent must verify the feature with multiple testing modes.

### Parallel Verification Agents

After implementation, launch multiple verification agents to run different types of tests in parallel.

Use separate verification agents for distinct checks, for example:

1. Visual testing against approved mocks
2. Flow and end-to-end browser testing
3. Convex/backend/data verification
4. Spec adherence review

Each verification agent must report:

- what it tested
- commands, browser flows, or backend checks it ran
- pass/fail result
- issues found
- recommended fixes

The main agent owns integrating fixes and rerunning the relevant verification agents until the feature passes.

### Visual Testing

Use the in-app Browser plugin on localhost. Do not use Computer Use for app-page
visual testing unless Browser setup is blocked and the blocker is recorded.

Compare the implemented UI against the approved mock.

If it does not match well enough, refine and re-test until it does.

Check:

- layout
- spacing
- typography
- color/theme
- mobile viewport
- desktop viewport
- loading/error/success states
- text overflow

### Flow Testing

Use the in-app Browser plugin to click through the user journey, read DOM
snapshots, capture screenshots when useful, and check console errors/warnings.
Use Computer Use only for non-page surfaces such as admin dashboards, browser
extension popovers, or OS dialogs.

Check:

- entry point
- primary action
- secondary actions
- validation
- redirects/navigation
- refresh behavior
- failure paths

### End-To-End Testing

Run the real feature path end to end.

Check:

- UI behavior
- backend writes
- backend reads
- auth/session behavior when relevant
- duplicate prevention
- expected final state

### Convex / Backend Testing

Use Convex skills and CLI checks.

Check:

- expected entities exist
- fields are populated correctly
- indexes support the intended queries
- mutations/actions validate input
- auth identity maps correctly to app user records
- local env vars work
- production env vars are present when production verification is in scope

### Spec Adherence Testing

Use a dedicated verification agent to compare the generated implementation against this feature spec.

Check:

- every current-scope requirement is implemented
- every acceptance criterion is satisfied
- the approved mock is reflected in the UI
- non-goals were not accidentally implemented
- future-scope notes stayed out of the current implementation
- technical requirements were followed
- required verification steps were actually run
- known deviations are documented with a reason

If the implementation does not adhere to the spec, fix the implementation or update the spec only when the product direction intentionally changed.

### Production Verification

Include only when the implementation is pushed or production behavior is explicitly in scope.

Check:

- `https://spcfarm.vercel.app`
- production Convex deployment
- production auth/integration env vars
- user-visible flow in production

Do not manually deploy unless explicitly asked. Trust the repo's automatic production deployment after GitHub push, then verify production status if needed.

## Push / Completion Criteria

When implementation is requested, the work is not complete until:

- the approved mock is referenced in the spec
- the implementation matches the mock closely
- local verification passes
- backend verification passes when applicable
- spec adherence verification passes
- production verification is done when applicable
- run-specific leftovers are cleaned up
- changes are committed and pushed when the user asked for push

## Open Questions

List only questions that block implementation.

## Assumptions

List assumptions made from repo evidence or user notes.

## Amendments

Append dated changes here when the feature direction changes.

### 5. If Current Mode Is SPEC_ONLY

Stop after writing the feature spec and summarize:

- spec path
- mock path
- open questions
- whether the spec is ready for implementation

### 6. If Current Mode Is SPEC_THEN_BUILD

After the user approves the spec and mock:

1. launch 4 parallel building subagents
2. implement with the ownership plan from the spec
3. launch multiple verification agents for visual, flow, end-to-end, backend, and spec-adherence testing
4. refine until the feature passes the spec
5. commit and push if requested
6. report exactly what changed and how it was verified
```
