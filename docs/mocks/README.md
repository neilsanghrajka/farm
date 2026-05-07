# Mocks

This folder keeps only the current approved visual references for the shipped
or intended v1 behavior.

## Canonical Set

- `00_LOGIN/login-screen.png` - password login surface.
- `01_X_LOGIN/home-missing-x.png` - Home blocked by missing X.
- `01_X_LOGIN/settings-x-unlinked.png` - Settings before X linking.
- `01_X_LOGIN/settings-x-linked.png` - Settings after X linking.
- `03_FARM/farm-flow-main.png` - Home Farms list, Farm list, create Farm,
  Farm detail, join, and member detail states.
- `03_FARM/farm-flow-confirmations.png` - joined, delete, leave, and invalid
  Farm link states.
- `06_AUTO_ENGAGE/post-detail-flow.png` - Post detail active, paused, and
  stopped/unavailable Auto Engage states.
- `ask-engagement.png` - Home request composer, readiness strip, and recent
  request reference.
- `request-status.png` - request status page reference.

## Removed Legacy Mocks

- `settings-account.png` was removed because it showed Invite links, secondary
  OAuth proof rows, and a multi-account CTA that are not part of v1.
- `farm-management.png` was removed because it showed pending invites, member
  removal, and X-linked member states that the approved Farm flow does not ship.
