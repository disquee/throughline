---
title: Holds API
sidebar_label: Holds API
owner: Engineering
last_review: 2026-01-29
---

# Holds API (v2)

## Create a hold

`POST /v2/holds`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `space_id` | string | yes | The space to hold. |
| `start` | datetime (ISO 8601) | yes | Event start. |
| `end` | datetime (ISO 8601) | yes | Event end, before the turnover buffer is applied. |
| `ttl_hours` | integer | no | Overrides the venue default. Range 1 to 336. |

Responses:

- `201 Created` returns the new `hold_id` and its `expires_at` timestamp.
- `409 BOOKING_CONFLICT` means the request overlaps a confirmed booking, including turnover buffer.
- `422` means the start is not before the end, or `ttl_hours` is out of range.

The conflict check applies the venue turnover setting to the effective end time, so a 6:00–9:00pm event with a 60-minute turnover occupies the space until 10:00pm.
