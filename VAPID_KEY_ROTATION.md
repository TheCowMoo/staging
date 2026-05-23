# VAPID Key Rotation — Response Activation System

## Environment Separation

Each deployment environment requires its own generated VAPID key pair.
**Do not reuse dev/staging keys in production.**

| Environment | Expected Secret Names | Notes |
|---|---|---|
| Development | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VITE_VAPID_PUBLIC_KEY` | Generated per-environment |
| Staging | Same names, different values | Regenerate before staging deploy |
| Production | Same names, different values | Regenerate before production deploy |

## Generating New Keys

```bash
node -e "const wp = require('web-push'); const keys = wp.generateVAPIDKeys(); console.log(JSON.stringify(keys, null, 2));"
```

Output:
```json
{
  "publicKey": "B...",
  "privateKey": "..."
}
```

Set:
- `VAPID_PUBLIC_KEY` = publicKey (server)
- `VAPID_PRIVATE_KEY` = privateKey (server-only, never expose)
- `VITE_VAPID_PUBLIC_KEY` = publicKey (client bundle)

## Key Safety Rules

- `VAPID_PRIVATE_KEY` is referenced only in `server/push.ts`
- It is never returned in any tRPC response
- It is never logged
- Vite's build system does not bundle variables without the `VITE_` prefix
- Only `VITE_VAPID_PUBLIC_KEY` is included in the client bundle

## Rotation Impact

**Rotating VAPID keys invalidates ALL existing push subscriptions.**

When keys are rotated:
1. All `push_subscriptions` rows become invalid
2. Users will not receive push notifications until they re-subscribe
3. The push enrollment banner will re-appear on next app open (subscription check fails)
4. Admin readiness view will show all users as "No push subscription on file"

**Recommended rotation procedure:**
1. Generate new key pair
2. Update secrets in target environment
3. Redeploy
4. Optionally: clear `push_subscriptions` table to remove stale rows
5. Notify users to re-open the app and re-enable alerts
