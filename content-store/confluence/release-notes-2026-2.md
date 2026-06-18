---
title: VenueOS 2026.2 Release Notes (internal draft)
space: Releases
owner: Priya Raman
status: draft
last_updated: 2026-02-05
source_url: https://confluence.internal/VenueOS/Releases/2026-2
related_jira: VOS-1846
---

# VenueOS 2026.2 — Release Notes (internal draft)

Target ship date: 2026-02-18. This is the internal rationale draft. The customer-facing version is owned by Docs under VOS-1846 and must be reviewed by PMM before publication.

## Headline: Smart Hold

Venues can now hold a space without confirming it, preventing the double-booking that previously required a side spreadsheet. See the Smart Hold Overview for the full model.

- New `HOLD` booking state with a configurable TTL (default 48h).
- Conflict detection now respects turnover/buffer time between events.
- New API endpoint `POST /v2/holds`.

## Also in this release

- Reporting export now includes cancelled and expired holds, so RevOps funnel volume is no longer understated (VOS-1852).

## Known gaps / talking points for GTM

- Hold status is not yet visible in Salesforce. AEs must open VenueOS to check availability until 2026.3.
- There is no in-app guidance yet for first-time hold creation; CS should expect "how do I hold a space" tickets in the first weeks.
