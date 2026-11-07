# Changelog

Every release of Zalmox, newest first. Created by `npm run release`.

## v0.9.0 — 2026-11-07

First numbered release: everything built before it, ready for the production launch. Later releases list their own changes.

**Database:** baseline — every migration up to and including `113_public_site_stays_place_sections.sql`.

- Reception: Gantt calendar of rooms and bookings, holds, blocks, availability heatmap, booking requests queue and check-in / check-out with keys.
- Bookings and guests: guest profiles and identity, occupants, children and cots, payments ledger, invoices, proformas and fiscal submission.
- Guest app: pre-check-in, stay details, reception requests and reviews.
- Public site per guesthouse: an editor built on section kinds (outline with drag and drop, each part on its own screen, three layouts, six palettes, three languages), live preview at phone, tablet and desktop width, publish checklist, legal pages, booking page, robots.txt, sitemap and favicon per host.
- Platform: multi-tenant by subdomain or custom domain, team permissions, email delivery per tenant, daily backups, rate limits and Sentry.
- Releases: version and commit in `/api/health`, backups, Sentry and the admin; `npm run release` for the next ones.
