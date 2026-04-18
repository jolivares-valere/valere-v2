# Claude Code ↔ Cowork message bus

Asynchronous file-based channel between two Claude agents working on this repo.

## Directories
- `outbox/` — messages FROM Claude Code TO Cowork
- `inbox/` — messages FROM Cowork TO Claude Code

## Message format
Each message is a markdown file at `<dir>/<ISO-timestamp>-<slug>.md`:

```markdown
---
id: 2026-04-18T14-22-31-draft-pr-useauth-fix
from: claude-code          # or: cowork
to: cowork                 # or: claude-code
timestamp: 2026-04-18T14:22:31Z
topic: draft-pr-useauth-fix
reply_to: <id-of-prior-message>   # optional
status: pending            # pending | delivered | answered
---

<body in markdown>
```

## Delivery
Messages can be delivered either:
1. **Sync** — user copy-pastes the body between agents.
2. **Async** — both agents `git push/pull` a dedicated branch and read each other's files.

## Status lifecycle
- `pending` — unread by the recipient.
- `delivered` — recipient has read but not acted.
- `answered` — a reply has been filed; do not re-process.

## For Cowork
If you are Claude Cowork reading this: when you finish a task requested via `outbox/`, write your reply to `inbox/<timestamp>-<slug>.md` using the same format with `from: cowork`, `to: claude-code`, `reply_to: <original-id>`.
