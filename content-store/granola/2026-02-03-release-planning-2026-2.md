---
title: Release Planning — 2026.2 scope lock
date: 2026-02-03
type: internal-release-planning
attendees: Priya Raman (PM), Dana Okafor (PM), Marco Bianchi (Eng), Sofia Almeida (CS), Eric (Docs)
source: Granola
related_jira: VOS-1846
---

# Release Planning — 2026.2 scope lock

## Summary

- 2026.2 ships Smart Hold: the HOLD state, configurable TTL, turnover-aware conflict detection, and the POST /v2/holds endpoint.
- Salesforce hold-status sync and the Pendo onboarding guide are explicitly pushed to 2026.3 to protect the ship date.
- Docs owns the customer-facing release notes and a KB how-to (VOS-1846). PMM reviews before anything is published.
- CS flagged an expected spike in "how do I hold a space" tickets because there is no in-app guidance at launch.
- Open risk: the existing Booking Rules config page is stale and still describes the old two-state model.

## Transcript

[00:05] Priya: Scope for 2026.2 is Smart Hold and nothing that threatens the date. Hold state, TTL, turnover-aware conflicts, and the holds endpoint. Everyone aligned?

[00:31] Marco: Endpoint is done and the conflict check now respects turnover minutes. The back-to-back bug is fixed.

[00:48] Dana: Salesforce sync and the Pendo guide move to 2026.3. I know GTM wants the Salesforce piece but it is not worth slipping the date.

[01:20] Sofia: If there is no in-app guidance at launch, CS is going to eat a wave of "how do I hold a space" tickets in the first two weeks. I want the KB article live on ship day, not a week after.

[01:52] Eric: I will have the KB how-to and the release notes drafted before ship. I am generating the API reference from the v2 spec so it stays in sync. One thing: the old Booking Rules page still describes the two-state model. It is going to contradict the new docs. We should flag it for the staleness pass rather than let it sit there telling customers the wrong thing.

[02:48] Priya: Agreed. Log it. Customer-facing notes go through PMM before they publish.
