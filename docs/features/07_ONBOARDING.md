# Onboarding

Status: Deferred

## Purpose

Define the broader first-run experience after login, including invite
acceptance, Farm joining, and the choices a new user sees before becoming a
fully useful Farm member.

## Current Decision

Onboarding is not the next implementation spec. The sequence is:

1. `docs/features/00_LOGIN.md` - password-based Farm login/signup.
2. `docs/features/01_X_LOGIN.md` - first authenticated Home experience and X
   account linking.

## Future Scope

- Preserve invite context through login.
- Show a pending Farm invite on Home.
- Let an invited user accept the Farm invite.
- Let admin-like users create a Farm.
- Decide what a user with no Farms should see.
- Decide how Farm joining, leaving, and member management fit with Settings and
  Home.

## Non-Goals For Now

- Designing or building a full onboarding wizard.
- Implementing Farm invite acceptance.
- Implementing Farm creation or leaving.
- Adding backend membership changes beyond what other feature specs require.

## Notes

- Users should not think of X linking as a separate onboarding wizard.
- X linking is the first setup action inside the normal app surface.
- Invite acceptance should use the existing Farm/Home mocks as context when it
  becomes active scope.
