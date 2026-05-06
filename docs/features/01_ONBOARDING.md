# Onboarding

Status: Placeholder

## Purpose

Define the first-run experience for creating an account, logging in, and reaching the main Farm app.

## Scope

- Sign up with email and name.
- Log in as an existing user.
- Handle invite links during signup or login.
- Route users into the app after authentication.
- Keep X account linking optional during onboarding.

## Key Flows

- New user creates an account.
- Existing user logs in.
- Invited user signs up or logs in and lands in the join Farm flow.
- Authenticated user returns to the app without repeating onboarding.

## Open Questions

- What authentication provider and email verification behavior should v1 use?
- Should onboarding collect a display name before or after joining a Farm?
- What is the default destination when a user has no Farms yet?

## Acceptance Criteria

- A user can create an account with email and name.
- A user can log in again after account creation.
- X linking is not required to finish onboarding.
- Invite links preserve the intended Farm join context.
