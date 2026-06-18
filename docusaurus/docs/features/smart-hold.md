---
title: Smart Hold
sidebar_label: Smart Hold
owner: Product
last_review: 2026-02-05
---

# Smart Hold

Smart Hold lets a venue reserve a space without confirming it, so two reps can no longer sell the same room for the same time. It ships in 2026.2.

## How it works

Bookings now move through three states. A **draft** blocks no one. A **hold** soft-reserves the space for a set period and is visible to the whole team. A **confirmed** booking is a hard reservation. Any hold or confirmation that overlaps an existing confirmed booking is rejected.

A hold that is not confirmed before its time limit expires releases the space automatically, so a stalled deal never locks a room indefinitely.

## Turnover time is respected

A space is not treated as free the moment an event ends. The conflict check extends the booking's end by the venue's turnover setting to account for breakdown, cleaning, and reset. A gala ending at 10:00pm with a 60-minute turnover keeps the room occupied until 11:00pm for booking purposes.

## Configuring holds

Venue admins set the hold time limit under **Admin > Booking Rules**, anywhere from one hour to fourteen days. The default is 48 hours.

## What is not in this release

Hold status does not yet sync to Salesforce, and there is no in-app walkthrough for creating a first hold. Both are planned for 2026.3.
