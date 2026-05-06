# Post

Status: Placeholder

## Purpose

Define the post engagement detail experience, including request status, member outcomes, and history.

## Scope

- View an engagement request for a specific X post.
- Show post URL and metadata when available.
- Show overall engagement progress.
- Show per-member or per-account status.
- Show failed, skipped, pending, and successful engagement outcomes.
- Support returning to Home or Farm context.

## Key Flows

- User opens a post request from Home.
- User reviews current engagement status.
- User checks which members engaged successfully.
- User checks failures or skipped accounts.
- User returns to the relevant Farm or Home view.

## Open Questions

- What X post metadata should be cached and displayed?
- Should users see member-level detail for every Farm member?
- Should admins see more detail than regular members?
- How should retries be represented in the status model?

## Acceptance Criteria

- A user can view status for a submitted post.
- The page shows high-level engagement counts.
- The page shows per-member or per-account outcomes.
- Failure and skipped states are understandable.
- Historical requests remain viewable after completion.
