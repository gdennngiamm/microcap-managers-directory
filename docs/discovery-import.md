# Daily Discovery import (preview-first)

The site's manager data mirrors the private "Microcap Fund Managers" Google Sheet.
The sheet ID stays out of this repo on purpose; the runner exports the tab at run
time and passes the snapshot file to the importer.

## Daily flow

1. The sheet agent keeps the `Discovery` tab current (stable 20-column schema).
2. Once a day the runner exports the tab (`A1:T<n>` values) to a local snapshot JSON.
3. `node scripts/import-discovery.mjs <snapshot.json> --write`
   appends new rows to `data/atlas/discovery.json` and syncs
   `data/excluded-discovery.json` from the sheet's Status column.
4. The run report (added / already present / quarantined / excluded synced) goes in
   the commit message and the pull request body.
5. One dated preview branch + PR per day. Vercel builds a preview for visual review.
6. Promotion to `main` (production) only on G-Den's explicit approval. Automatic
   live promotion has never been approved; every past live update was a one-off,
   user-approved push.

## Hardening rules (enforced by the script)

1. Schema gate: the header must match the 20-column Discovery schema; hard fail otherwise.
2. Append-only: existing entries are never edited or removed.
3. Dedupe: slug or normalized manager name already present -> skipped; re-runs are no-ops.
4. Status sync: `Status` values starting with "Duplicate" are synced into
   `data/excluded-discovery.json`, so the site hides them even though the raw mirror
   keeps every row. This replaces the old manual copy step ("importer drops Status").
5. Nothing invented: returns come only from the sheet's return columns; missing values
   become `null` / `pending`, never guesses. Image fields are used only when they are URLs.
6. Quarantine, not silence: rows missing a manager name are reported and skipped.
7. Strict display stays in the site: `app/page.js` shows only `capScope` matching
   `/^micro-? ?cap$/i` and applies the excluded list and name/id dedupe. The importer
   mirrors all valid rows; non-micro-cap additions are flagged `displayHidden` in the report.

## Known limits

- Logo/photo enrichment (finding a real image for a new manager) is a separate research
  step, not part of this deterministic script. New rows render with initials until enriched.
- One preview PR per day keeps Vercel preview deploys batched (Hobby deploy limit).
