# Farm Flow QA Plan And Results

Date: 2026-05-06
Status: Passed after unavailable-state fix

## Scope

This QA pass covers the Farm UI and Convex-backed Farm membership flows defined
in `docs/features/03_FARM.md`.

It intentionally excludes X/Twitter account linking, engagement request
creation, automatic likes, invite expiry/rotation, admin member removal, and
production deployment verification.

## Test Environment

- App: local production build served at `http://localhost:3000`
- Backend: Convex dev deployment
- Browser: Codex in-app browser
- Admin origin: `http://localhost:3000`
- Member origin: `http://127.0.0.1:3000`

Using separate origins gives admin and member users isolated browser storage
inside the in-app browser while exercising the same local app and backend.

Dia was not used. Dia should remain reserved for external admin dashboards only.

## Static Verification Plan

- Run `pnpm lint`.
- Run `pnpm typecheck`.
- Run `pnpm build`.
- Run `pnpm exec convex codegen` after Convex changes.
- Run `pnpm exec convex run health:ping`.

## Browser Flow Plan

### Authentication And Empty States

- Open Home while signed out.
- Confirm login form appears.
- Sign up a fresh admin.
- Confirm Home renders the empty `My Farms` state.
- Open Settings.
- Confirm profile details render.
- Open `Manage my Farms`.
- Confirm the Farm list empty state renders.

### Farm Creation

- Open Create Farm from the Farm list.
- Submit a blank Farm name.
- Confirm inline validation appears.
- Enter a valid Farm name.
- Submit.
- Confirm Farm detail route loads.
- Confirm creator is admin.
- Confirm member count is `1 member`.
- Confirm member list shows the admin.
- Confirm `Share Join Link` appears.
- Confirm `Invite members` does not appear.
- Confirm `Delete Farm` appears for admin.
- Click `Copy`.
- Confirm visible `Copied` feedback.

### Admin Navigation

- Return Home.
- Confirm the created Farm appears under `My Farms`.
- Open all Farms.
- Confirm the created Farm appears in the list with role/member count.

### Signed-Out Join Link

- Open the join URL from the member origin while signed out.
- Confirm the login form appears first.
- Confirm the user is not automatically added before auth.

### Member Join

- Sign up a fresh member on the join URL.
- Confirm join confirmation appears.
- Confirm Farm name, member count, creator, and current user are visible.
- Click `Not now`.
- Confirm member remains out of the Farm.
- Reopen the join URL.
- Click `Join Farm`.
- Confirm Farm detail loads.
- Confirm member role is `member`.
- Confirm member count is `2 members`.
- Confirm both admin and member rows render.
- Confirm member does not see `Share Join Link`.
- Confirm member does not see `Delete Farm`.
- Confirm member sees `Leave Farm`.

### Already-Member Join

- Open the same join URL while already a member.
- Confirm already-member state appears.
- Click `Go to Farm`.
- Confirm Farm detail loads.

### Direct-URL Guardrails

- Open `/farms/[farmId]/delete` as a member.
- Confirm the delete confirmation action is disabled.
- Open `/farms/[farmId]/leave` as an admin.
- Confirm the leave confirmation action is disabled.

### Leave Flow

- Open leave confirmation as a member.
- Click `Cancel`.
- Confirm member returns to Farm detail.
- Open leave confirmation again.
- Click `Leave Farm`.
- Confirm member returns to empty `My Farms`.
- Reopen invite and rejoin.
- Confirm member count returns to `2 members`.

### Invalid And Deleted Links

- Open an invalid invite code while authenticated.
- Confirm invalid-link state appears.
- Delete the Farm as admin.
- Confirm admin returns to empty `My Farms`.
- Open the old invite link as member.
- Confirm invalid-link state appears.
- Open deleted Farm detail, delete, and leave routes as member.
- Confirm each route shows the friendly unavailable state.

### Sign-Out

- Sign out member.
- Confirm login form appears.
- Sign out admin.
- Confirm login form appears.

## Browser Results

Test users:

- Admin: `farm-admin-75527406@example.com`
- Member: `farm-member-75527406@example.com`
- Farm: `QA Farm 75527406`
- Farm id: `kd76r0fp2gcm8p2e76rw06vpxh866ff6`
- Invite code: `WoTBLXrL`

Passed:

- Signed-out Home login state.
- Admin sign-up and empty Home.
- Settings to `Manage my Farms`.
- Farm list empty state.
- Blank Farm name validation.
- Farm creation.
- Admin Farm detail, compact admin metadata, member count, member list, delete
  control.
- No `Invite members` UI.
- Copy-link visible feedback.
- Home and My Farms list navigation.
- Signed-out join link auth gate.
- Member sign-up from join URL.
- Join confirmation without auto-join.
- `Not now` keeps user out.
- Member join.
- Member detail without admin-only controls.
- Already-member join URL state.
- Direct member delete route disabled.
- Member leave cancel.
- Member leave.
- Member rejoin.
- Authenticated invalid invite state.
- Direct admin leave route disabled.
- Admin delete cancel.
- Admin delete.
- Deleted invite unavailable state.
- Deleted Farm detail/delete/leave unavailable states.
- Member sign-out.
- Admin sign-out.

## Issue Found And Fixed

During the first full browser pass, opening a deleted Farm detail URL as a former
member produced a client-side Convex query error instead of a friendly
unavailable state.

Fix:

- `farms:get` now returns `{ status: "unavailable" }` for missing, deleted, or
  non-member Farms instead of throwing for those user-recoverable states.
- Farm detail, delete, and leave pages render a shared unavailable state with a
  `Go to my Farms` recovery action.

Targeted retest:

- Deleted detail route: passed.
- Deleted delete route: passed.
- Deleted leave route: passed.
- New browser console errors after fix: none.

## Final Verification Commands

```bash
pnpm exec convex codegen
pnpm lint
pnpm typecheck
pnpm build
pnpm exec convex run health:ping
```

## Residual Risks

- This pass used local Convex dev data, not production.
- The in-app browser shares one visible tab, so separate users were isolated by
  origin rather than simultaneous side-by-side browser windows.
- Visual comparison was DOM/state driven; no pixel-diff pass was run.
