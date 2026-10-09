# Connect an osu! account

## Local testing setup

1. Sign in at https://osu.ppy.sh/home/account/edit#oauth and create an OAuth application.
2. Register the callback shown by osu!mosis: **http://127.0.0.1:3000/api/account/callback** for Tauri and the default npm server. Copy the exact URL if the npm server uses another port; `localhost` and `127.0.0.1` are different callback values.
3. In **Settings → osu! account and discovery**, enter the Client ID and secret, then save.
4. Click the profile in the top right and choose **Authorize on osu!**. The system browser opens the official authorization page with the `public identify` scopes.
5. Approve access, keep osu!mosis running during the localhost callback, then return to the application. The cached public profile includes the identity, avatar and available statistics.

The application never asks for your osu! password. The local backend handles the callback with a random, single-use `state` valid for ten minutes. It exchanges the code server-side and does not send tokens to the frontend. Changing the OAuth credentials disconnects the current profile.

## Cache and disconnect

The profile opens from cache without an API request every time. **Refresh profile** fetches the API; an expired token is renewed using its refresh token. The snapshot currently contains identity and primary-mode statistics from `/api/v2/me`, rather than top or recent scores.

`account.json` in the application data directory contains tokens and the cached profile. It uses `0600` permissions on systems that support them; Windows access depends on the account and directory ACLs. Storage is not encrypted or integrated with an OS credential vault yet. Exclude this file and `settings.json` from bug reports.

**Disconnect** removes local user credentials. To also revoke osu! authorization, remove the authorized application from your osu! account settings.

Online discovery uses a separate public client-credentials token. Its shared search budget stays at five requests per minute; account linking does not trigger searches or score imports.

## Before public distribution

Local tests use the developer's or user's personal OAuth application. A shared client secret must never be embedded in a distributed executable: a desktop binary cannot keep it confidential. Public distribution needs an osu!-supported desktop flow or an authentication service that keeps the secret server-side, followed by OS-vault token storage.

## Troubleshooting

- Rejected callback: compare the registered osu! callback and the Settings URL exactly.
- Localhost callback unreachable: keep the backend running, check the port and close any competing instance.
- Expired or denied authorization: start account linking again from the profile.
- Stale profile: use **Refresh profile**; the cache remains available offline.
- Validate the real OAuth flow with your own application's credentials. Cloud checks do not connect a real osu! account.
