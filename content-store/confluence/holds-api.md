---
title: Holds API Reference (v2)
space: Engineering
owner: Marco Bianchi
status: published
last_updated: 2026-01-29
source_url: https://confluence.internal/VenueOS/Engineering/HoldsAPI
related_jira: VOS-1845
---

# Holds API Reference (v2)

## POST /v2/holds

Create a soft hold on a space.

Request body:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `space_id` | string | yes | The space to hold. |
| `start` | ISO 8601 datetime | yes | Event start. |
| `end` | ISO 8601 datetime | yes | Event end (before turnover buffer is applied). |
| `ttl_hours` | integer | no | Overrides the venue default (1–336). |

Responses:

- `201 Created` — returns `{ "hold_id": "...", "expires_at": "..." }`.
- `409 BOOKING_CONFLICT` — overlaps an existing `CONFIRMED` booking, including turnover buffer.
- `422` — start is not before end, or `ttl_hours` is out of range.

Conflict checks apply the venue `turnover_minutes` setting to the effective end time. A 6:00–9:00pm event with a 60-minute turnover occupies the space until 10:00pm for conflict purposes.
