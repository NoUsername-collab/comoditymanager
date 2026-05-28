# Client Search & Dedup Contract

This document defines the functional contract for the client (guest) search, dedup, and autofill behavior. It is used as a non-regression reference during the master refactor.

## Matching priority

The identity matcher must resolve guests in this strict order:

1. `phone + email` exact normalized match
2. `phone` exact normalized match
3. `email` exact normalized match (ignoring placeholder emails)
4. full `last_name + first_name` fallback

Source contract: `src/domain/guest/matching-contract.ts`.

## Search sorting contract

When multiple results are eligible:

1. flagged guests first (`blacklist` > `watchlist` > `normal`)
2. then by most recently updated profile

This ensures operational risk is always visible first in search and list views.

## Non-regression checklist

### Admin guests page

- Search by phone returns the same flagged profile as direct profile access.
- Search by email does not hide a stronger flagged variant.
- Filter + pagination preserve URL state (`q/filter/page`).
- Selecting preview keeps current list context and supports clean close back to list.

### Guest profile page

- Back link returns to the same filtered list state.
- Dedup warning renders when candidates exist.
- Merge panel and blacklist panel remain reachable from the refactored layout.

### Public + reception forms

- Typing identity data can trigger existing guest suggestion.
- Suggested guest prefills identity fields (name, email, phone) when available.
- Watchlist/blacklist suggestions show explicit warning messages.
- Valid normal guests still submit without friction.

### Queue + booking navigation

- New requests and unassigned items maintain links to booking detail.
- Guest risk badges remain visible in queue cards and booking list rows.
