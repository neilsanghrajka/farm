# Auto Engage

Status: Placeholder

## Purpose

Define the backend system that processes engagement requests and automatically likes posts through eligible linked X accounts.

## Scope

- Validate queued engagement requests.
- Determine eligible Farm members and linked X accounts.
- Use official X APIs to like posts.
- Record per-account status.
- Own the shared internal request lifecycle contract from request processing:
  update one attempt outcome, recalculate aggregate request counts, and mark
  requests completed, partial, failed, or canceled.
- Handle retries, failures, revocations, and skipped accounts.
- Provide status data to the app.

## Key Flows

- Engagement request is created.
- Backend finds eligible accounts in the selected Farm.
- Backend attempts the configured engagement action.
- Backend records success, failure, skipped, or pending status.
- Backend updates request aggregate counts and terminal request status when
  attempts settle.
- UI reads updated request status.

## Open Questions

- What retry policy should failed X API calls use?
- How should rate limits be surfaced to users?
- Should the request creator's own linked X account be included?
- How should revoked or expired X tokens be detected and handled?
- What audit trail is required for automated actions?

## Acceptance Criteria

- Engagement attempts only run for members of the selected Farm.
- Engagement attempts only use linked X accounts with valid authorization.
- The system uses official X APIs only.
- Each eligible account receives a durable status.
- Attempt updates flow through shared helpers/mutations that keep request
  counts and terminal status consistent.
- Failed and skipped attempts are visible to the app.
