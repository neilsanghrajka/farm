# Settings

Status: Placeholder

## Purpose

Define the settings area for account management, X account linking, and Farm membership controls.

## Scope

- View and update basic profile information.
- Link an X account through official OAuth.
- View linked X account status.
- Disconnect an X account.
- View Farms the user belongs to.
- Manage Farm-level actions the user is allowed to take.

## Key Flows

- User opens Settings from the main app.
- User links an X account.
- User disconnects an X account.
- User views Farms and navigates to Farm management.
- User checks account or membership status.

## Open Questions

- Which profile fields are editable in v1?
- What X account metadata should be shown after linking?
- Should Farm management actions live directly in Settings or link to Farm detail pages?

## Acceptance Criteria

- Settings clearly shows whether an X account is linked.
- A user can start X OAuth from Settings.
- A user can disconnect their X account.
- A user can see Farms they belong to.
- Admin-only Farm actions are only available to Farm admins.
