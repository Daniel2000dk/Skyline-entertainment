---
name: public-registration-abuse
description: Use for public signups, rate limits, capacity, moderation or abuse response.
---

# Public Registration Abuse

Keep public signup to GTA RP name only. Validate server side, verify Turnstile server side, use durable per-IP and per-event rate limits without treating IP as person identity. Normalize name, enforce unique active event registration and atomic capacity under concurrent requests. Minimize logged security data. Test repeat, case variants, racing requests, shared-IP legitimate users, bots and overload. Document that fake identities cannot be fully prevented.
