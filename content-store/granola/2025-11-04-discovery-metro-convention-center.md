---
title: Discovery — Metro Convention Center (double-booking pain)
date: 2025-11-04
type: customer-discovery
attendees: Dana Okafor (PM), Priya Raman (PM), Janet Cho (Metro Convention Center, Director of Booking)
source: Granola
related_jira: VOS-1840
---

# Discovery — Metro Convention Center

## Summary

- Metro Convention Center runs every space-availability decision through a shared spreadsheet that lives outside VenueOS. The spreadsheet, not VenueOS, is their real source of truth for what is free.
- Root pain: two reps confirmed the same hall for the same evening last quarter. They had to call one client and move them. Janet called it the single most damaging thing that can happen to the relationship.
- They want a way to "pencil in" a space without fully confirming it, with the hold visible to everyone and expiring on its own if the deal goes cold.
- Turnover time is critical for them. A hall is not actually free the minute an event ends; they need cleanup and reset time counted as occupied.
- Janet's AEs live in Salesforce and would prefer to see availability there rather than switching tools.

## Transcript

[00:02] Dana: Walk me through what happens today when a client asks to book the main hall.

[00:09] Janet: Honestly? Someone opens the spreadsheet. That is the first thing anyone does. VenueOS tells us what is confirmed, but it does not tell us what is about to be confirmed, so the team built a spreadsheet to track the maybes. That spreadsheet is the real truth. VenueOS is the system of record only after the fact.

[01:14] Priya: And when the spreadsheet and VenueOS disagree?

[01:19] Janet: The spreadsheet wins. Every time. Which is the problem, because half my team forgets to update it. Last quarter two reps confirmed the same hall for the same Saturday. We had to phone a client and ask them to move. You do not recover trust easily after that.

[02:40] Dana: If you could pencil something in inside VenueOS, what would that need to do?

[02:46] Janet: It needs to be visible to everyone instantly, and it needs to expire. If a rep holds a date and the deal goes quiet, I do not want that space locked up forever. Give it a couple of days and then let it go.

[03:55] Priya: One thing I want to get right. When is a space actually free again after an event?

[04:01] Janet: Not when the event ends. We need turnaround. Breakdown, cleaning, reset for the next group. If your system says the room is free at 10pm because the gala ended at 10pm, your system is wrong. We need that buffer respected or we will just go back to the spreadsheet.

[05:30] Janet: And my account execs basically live in Salesforce. If they could see "this is on hold" without logging into another tool, that is the dream. Not a dealbreaker, but that is where they work.
