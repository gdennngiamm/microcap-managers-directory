#!/usr/bin/env node
// import-discovery.mjs - daily Discovery-tab -> site data importer (preview-only pipeline).
//
// Input: a JSON snapshot of the "Discovery" tab (array of rows, header row first,
// 20 columns A..T) exported at run time. The private sheet ID is deliberately NOT
// in this repo; the runner passes the snapshot file path as argv[2].
//
// Usage:
//   node scripts/import-discovery.mjs <snapshot.json>           dry-run report, no writes
//   node scripts/import-discovery.mjs <snapshot.json> --write   apply appends + excluded sync
//
// Hardening rules (the checks the dead pipeline never got signed off):
//  1. Schema gate: header must match the stable 20-column Discovery schema; hard fail otherwise.
//  2. Append-only: existing entries in data/atlas/discovery.json are never edited or removed.
//  3. Dedupe: a row whose slug or normalized manager name already exists is skipped.
//  4. Status sync: rows whose Status (col L) starts with "Duplicate" have their manager
//     name synced into data/excluded-discovery.json (the site hides them even if present).
//  5. Nothing invented: returns come only from the sheet's return columns; missing values
//     become null / 'pending', never guesses. Image URLs are used only if they are URLs.
//  6. Quarantine, not silence: rows missing a manager name are reported and skipped.
//  7. Strict-display note: the site only displays rows whose capScope matches /^micro-? ?cap$/i;
//     imported rows with any other capScope are mirrored for the record and flagged in the report.
import { readFileSync, writeFileSync } from 'node:fs';

const COLS = ['Date added','Manager','Fund/Strategy','Country','Style','Cap scope','Website','Letters/returns page','Socials','Found via','Notes','Status','photo_url','logo_url','image_source_url','image_status','return_period','return_value','return_basis','return_currency_fx'];
const DISCOVERY_PATH = 'data/atlas/discovery.json';
const EXCLUDED_PATH = 'data/excluded-discovery.json';
const isUrl = s => typeof s === 'string' && /^https?:\/\//i.test(s.trim());
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const norm = s => String(s || '').trim().toLowerCase();

function parseSocials(v) {
  if (!v || typeof v !== 'string') return [];
  return v.split(/[,\s]+/).map(t => t.trim()).filter(isUrl);
}

function rowToEntry(row, sheetRow) {
  const [dateAdded, manager, fund, country, style, capScope, website, letters, socials, , , , photo, logo, imgSrc, imgStatus, rPeriod, rValue, rBasis, rFx] = row.map(c => (c == null ? '' : String(c).trim()));
  const entry = {
    id: slug(manager),
    manager,
    fund: fund || null,
    country: country || null,
    style: style || null,
    capScope: capScope || null,
    website: website || null,
    lettersUrl: isUrl(letters) ? letters.trim() : null,
    socials: parseSocials(socials),
    dateAdded: dateAdded || new Date().toISOString().slice(0, 10),
    returns: rValue ? { period: rPeriod || null, value: rValue, basis: rBasis || null, currency: rFx || null, source: isUrl(letters) ? letters.trim() : null } : null,
    returnsStatus: rValue ? 'sourced' : 'pending',
    logoUrl: isUrl(logo) ? logo.trim() : null,
    imageSource: isUrl(imgSrc) ? imgSrc.trim() : null,
    imageStatus: imgStatus || 'pending',
  };
  if (isUrl(photo)) entry.imageUrl = photo.trim();
  return entry;
}

const [, , snapshotPath, ...flags] = process.argv;
const write = flags.includes('--write');
if (!snapshotPath) { console.error('usage: node scripts/import-discovery.mjs <snapshot.json> [--write]'); process.exit(2); }

const values = JSON.parse(readFileSync(snapshotPath, 'utf8'));
if (!Array.isArray(values) || values.length < 2) { console.error('FAIL: snapshot is not a rows array with data'); process.exit(1); }
const header = values[0].map(c => String(c ?? '').trim());
if (JSON.stringify(header) !== JSON.stringify(COLS)) {
  console.error('FAIL: schema mismatch. Expected 20-col Discovery schema, got: ' + JSON.stringify(header));
  process.exit(1);
}

const discovery = JSON.parse(readFileSync(DISCOVERY_PATH, 'utf8'));
const excluded = JSON.parse(readFileSync(EXCLUDED_PATH));
const knownIds = new Set(discovery.map(d => d.id));
const knownNames = new Set(discovery.map(d => norm(d.manager)));
const exclSet = new Set(excluded.managers);

const report = { mode: write ? 'write' : 'dry-run', runDate: new Date().toISOString().slice(0, 10), sheetRows: values.length - 1, added: [], alreadyPresent: 0, quarantined: [], excludedSynced: [], displayHidden: [] };
const out = [...discovery];

values.slice(1).forEach((row, i) => {
  const sheetRow = i + 2;
  const manager = String(row[1] ?? '').trim();
  if (!manager) { report.quarantined.push({ sheetRow, reason: 'missing manager name' }); return; }
  if (knownIds.has(slug(manager)) || knownNames.has(norm(manager))) { report.alreadyPresent++; return; }
  const entry = rowToEntry(row, sheetRow);
  out.push(entry);
  knownIds.add(entry.id); knownNames.add(norm(manager));
  report.added.push({ sheetRow, manager: entry.manager, capScope: entry.capScope });
  if (!/^micro-? ?cap$/i.test(String(entry.capScope || '').trim())) report.displayHidden.push({ sheetRow, manager: entry.manager, capScope: entry.capScope });
});

values.slice(1).forEach((row, i) => {
  const status = String(row[11] ?? '').trim();
  const manager = String(row[1] ?? '').trim();
  if (manager && /^duplicate/i.test(status) && !exclSet.has(manager)) {
    exclSet.add(manager); excluded.managers.push(manager);
    report.excludedSynced.push({ sheetRow: i + 2, manager });
  }
});

console.log(JSON.stringify(report, null, 2));
if (write && (report.added.length || report.excludedSynced.length)) {
  writeFileSync(DISCOVERY_PATH, JSON.stringify(out, null, 2) + '\n');
  if (report.excludedSynced.length) {
    excluded.updated = report.runDate;
    writeFileSync(EXCLUDED_PATH, JSON.stringify(excluded, null, 2) + '\n');
  }
  console.log(`WROTE: ${report.added.length} appended, ${report.excludedSynced.length} excluded synced`);
} else {
  console.log('NO WRITES' + (write ? ' (nothing to do)' : ' (dry-run)'));
}
