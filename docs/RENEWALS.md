# Renewals

Every renewable item in this project with its date and owner action. Phase 42
(DOC-04) owns this ledger's full shape; Phase 45 adds the first row (the Safe
Browsing key, UPD-29) and notes the coordination assumption below. If Phase 42
lands a fuller file first, these rows merge into it chronologically with the
key name as the stable key.

| Item | Date / cadence | Owner action |
|---|---|---|
| Google Safe Browsing API key (`/keys/sb-gapi.data` mount; keyfile on legion outside the repo) | No expiry; rotate on compromise or quota notice | Re-obtain in the Google Cloud console, replace the one-line keyfile on legion, rebuild the release container image |
