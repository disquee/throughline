---
title: Smart Hold Overview
space: Product
owner: Priya Raman
status: published
last_updated: 2026-02-04
source_url: https://confluence.internal/VenueOS/Product/SmartHold
related_jira: VOS-1840
---

# Smart Hold Overview

Smart Hold is VenueOS's overbooking-protection feature, shipping in release 2026.2. It introduces a formal `HOLD` state into the booking lifecycle so that two sales reps can no longer confirm the same space for overlapping times.

## Why it exists

Before Smart Hold, large venues prevented double-booking with an out-of-band spreadsheet that sat next to VenueOS. That spreadsheet was the venue's real source of truth for "is this space actually free," which meant VenueOS itself could not be trusted for availability. Smart Hold pulls that logic back into the platform.

## Booking lifecycle

A booking moves through three states:

1. `DRAFT` — created but not blocking anyone.
2. `HOLD` — soft-reserves the space for a configurable time-to-live (TTL). Multiple overlapping holds are permitted but flagged.
3. `CONFIRMED` — hard reservation. A new hold or confirmation that overlaps an existing `CONFIRMED` booking is rejected.

A `HOLD` that is not confirmed before its TTL expires reverts to `DRAFT` automatically.

## Conflict detection

Conflicts are detected on the tuple `(space_id, start, end)`. The effective end time is extended by the venue's `turnover_minutes` setting so that cleanup and changeover time between events counts as occupied. This was the fix for the back-to-back booking gap reported in VOS-1844.

## Configuration

Venue admins set the hold TTL under **Admin > Booking Rules**. The range is 1 hour to 14 days; the default is 48 hours.

## What is out of scope for 2026.2

Salesforce sync of hold status and the in-app Pendo onboarding guide are scheduled for 2026.3. Floorplan Designer v2 is unrelated and tracked separately.
