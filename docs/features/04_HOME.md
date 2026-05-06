# Home

Status: Placeholder

## Purpose

Define the main app screen for requesting engagement, viewing active statuses, and navigating Farms.

## Scope

- Submit an X post URL for engagement.
- Select a Farm for the request.
- Show active engagement request statuses.
- Show the user's Farms.
- Surface account setup needs, such as missing X linkage.
- Link to post details, Farm details, and Settings.

Detailed missing-X blocking behavior is owned by
`docs/features/01_X_LOGIN.md`.

## Key Flows

- User lands on Home after login.
- User requests engagement for a post.
- User checks active request progress.
- User switches between Farms or navigates to Farm detail.
- User sees setup prompts when X is not linked.

## Open Questions

- Should Home prioritize request creation or active status monitoring?
- How should Home behave when the user has no Farms?
- How should Home behave when the user has no linked X account?
- Should historical requests appear on Home or only in a dedicated history/detail view?

## Acceptance Criteria

- Home gives a clear path to request engagement.
- A user can select one of their Farms when creating a request.
- If the user belongs to one Farm, it can be selected by default.
- Active requests show enough status to understand current progress.
- Empty states guide users toward the next useful action.
- If X is not linked, Home disables request engagement and routes the user to
  Settings to connect X.
