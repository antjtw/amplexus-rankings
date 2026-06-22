#!/usr/bin/env node
/**
 * Implexus Powerlifting — weekly scraper
 *
 * Reads data.js, fetches every lifter's OpenPowerlifting profile, re-derives
 * PBs (squat/bench/deadlift/total/DOTS) and the fed/equip/bodyweight from the
 * competition row that produced their best DOTS, then:
 *   - writes an updated data.js (preserving name, slug, ig, legacy, ordering)
 *   - writes changes.js (previous ranks for both views + this week's PB events)
 *
 * Defensive by design:
 *   - a profile that fails to fetch or parse keeps its EXISTING data untouched
 *   - if too few profiles parse (looks like a site-wide breakage), it ABORTS
 *     without writing anything, so a bad run can never wipe the board.
 *
 * Run: node scripts/scrape.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "data.js");
const CHANGES_PATH = join(ROOT, "changes.js");

const BASE = "https://www.openpowerlifting.org/u/";
const REQUEST_DELAY_MS = 1200;        // polite gap between requests
const MIN_PARSE_RATIO = 0.6;          // abort if fewer than 60% parse OK
const DOTS_MATCH_TOLERANCE = 0.01;    // matching PB dots to a competition row

// ── Load the current LIFTERS array out of data.js ────────────────
// data.js declares `const LIFTERS = [...]` with no export, so we evaluate it
// in a tiny sandbox and capture the array.
function loadLifters() {
  const src = readFileSync(DATA_PATH, "utf8");
  // eslint-disable-next-line no-new-func
  const fn = new Function(`${src}; return LIFTERS;`);
  const lifters = fn();
  if (!Array.isArray(lifters) || lifters.length === 0) {
    throw new Error("Could not read LIFTERS from data.js");
  }
  return lifters;
}

// Load the existing CHANGES object from changes.js (for the 7-day rolling
// window). Returns a safe empty default if the file is missing or unreadable.
function loadChanges() {
  try {
    const src = readFileSync(CHANGES_PATH, "utf8");
    // eslint-disable-next-line no-new-func
    const fn = new Function(`${src}; return CHANGES;`);
    const c = fn();
    if (c && typeof c === "object") return c;
  } catch (_) { /* fall through to default */ }
  return { generated: null, baselineDate: null, prevRankActive: {}, prevRankAll: {}, pbEvents: [] };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Fetch one profile's HTML ─────────────────────────────────────
async function fetchProfile(slug) {
  const res = await fetch(BASE + slug, {
    headers: { "User-Agent": "ImplexusLeaderboard/1.0 (gym leaderboard refresh)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Strip HTML tags from a cell
const clean = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();

// ── Parse PBs + matched meet from a profile's HTML ───────────────
// Returns { squat, bench, deadlift, total, dots, fed, equip, bodyweight }
// or throws if the structure can't be read.
function parseProfile(html) {
  // The page has a "Personal Bests" table then a "Competition Results" table.
  // Personal Bests rows: Equip | Squat | Bench | Deadlift | Total | Dots
  const pbSplit = html.split(/Personal Bests<\/h2>/i)[1];
  if (!pbSplit) throw new Error("no Personal Bests section");
  const pbBlock = pbSplit.split(/Competition Results/i)[0];

  const pbRows = [...pbBlock.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map((m) =>
    [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => clean(c[1]))
  );

  // Collect best individual lifts across all PB rows (Raw + Wraps etc.)
  let bestSquat = 0, bestBench = 0, bestDead = 0, bestTotal = 0, bestDots = 0;
  for (const cells of pbRows) {
    if (cells.length < 6) continue;
    const sq = parseFloat(cells[1]) || 0;
    const bp = parseFloat(cells[2]) || 0;
    const dl = parseFloat(cells[3]) || 0;
    const tot = parseFloat(cells[4]) || 0;
    const dots = parseFloat(cells[5]) || 0;
    bestSquat = Math.max(bestSquat, sq);
    bestBench = Math.max(bestBench, bp);
    bestDead = Math.max(bestDead, dl);
    bestTotal = Math.max(bestTotal, tot);
    bestDots = Math.max(bestDots, dots);
  }
  if (bestDots === 0) throw new Error("no DOTS in Personal Bests");

  // Competition Results: find the row whose final DOTS == bestDots, and read
  // Fed (col 1), Equip (col 7), Weight (col 9) from it.
  const compBlock = html.split(/Competition Results/i)[1] || "";
  const compRows = [...compBlock.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map((m) =>
    [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => clean(c[1]))
  );

  let fed = null, equip = null, bodyweight = null;
  for (const cells of compRows) {
    if (cells.length < 10) continue;
    const rowDots = parseFloat(cells[cells.length - 1]);
    if (!isFinite(rowDots)) continue;
    if (Math.abs(rowDots - bestDots) <= DOTS_MATCH_TOLERANCE) {
      fed = cells[1] || null;
      equip = cells[7] || null;
      bodyweight = cells[9] || null;
      break;
    }
  }

  return {
    squat: bestSquat,
    bench: bestBench,
    deadlift: bestDead,
    total: bestTotal,
    dots: bestDots,
    fed,
    equip,
    bodyweight,
  };
}

// ── Ranking helper ───────────────────────────────────────────────
// Returns a map slug -> rank (1-based) for a DOTS-sorted list.
function rankMap(lifters) {
  const sorted = [...lifters].sort((a, b) => b.dots - a.dots);
  const map = {};
  sorted.forEach((l, i) => { map[l.slug] = i + 1; });
  return map;
}

// ── Serialise LIFTERS back into data.js (matching the hand-written style) ──
function serialiseData(lifters) {
  const line = (l) => {
    const parts = [
      `  {`,
      `    name: ${JSON.stringify(l.name)},`,
      `    slug: ${JSON.stringify(l.slug)},`,
      `    ig: ${l.ig == null ? "null" : JSON.stringify(l.ig)},`,
      `    squat: ${l.squat}, bench: ${l.bench}, deadlift: ${l.deadlift}, total: ${l.total}, dots: ${l.dots},`,
      `    fed: ${JSON.stringify(l.fed)}, equip: ${JSON.stringify(l.equip)}, bodyweight: ${JSON.stringify(String(l.bodyweight))},`,
    ];
    if (l.legacy) parts.push(`    legacy: true,`);
    parts.push(`  },`);
    return parts.join("\n");
  };

  // Preserve the active / legacy grouping in output
  const active = lifters.filter((l) => !l.legacy);
  const legacy = lifters.filter((l) => l.legacy);

  return `// Implexus Powerlifting — Leaderboard Data
// PB squat, bench, deadlift and total from OpenPowerlifting Personal Bests table.
// For lifters with Raw + Wraps entries, best DOTS row determines ranking;
// individual lift PBs are taken across both equip categories.
// legacy: true = former member, shown only when legacy filter is on.
//
// This file is refreshed automatically every Wednesday by scripts/scrape.mjs.
// Add new lifters by hand; the scraper only updates lifters already listed.

const LIFTERS = [
  // ── ACTIVE MEMBERS ──────────────────────────────────────────
${active.map(line).join("\n")}

  // ── LEGACY MEMBERS ──────────────────────────────────────────
${legacy.map(line).join("\n")}

];
`;
}

// ── Serialise changes.js ─────────────────────────────────────────
function serialiseChanges(changes) {
  return `// Implexus Powerlifting — change log (rolling 7-day window)
// Written automatically by scripts/scrape.mjs on each daily run.
// generated:      ISO timestamp of the run that produced this file.
// baselineDate:   when the current rank baseline was set (refreshed every 7 days).
// prevRankActive / prevRankAll: slug -> rank as of baselineDate, in each view.
//   Position arrows compare current rank against these, so movement reflects
//   the whole week rather than just the last run.
// pbEvents:       personal-best improvements from the last 7 days, each stamped
//   with the date it hit the board. Shown as callout cards in dynamic mode,
//   ageing out after 7 days. A new PB for a lifter overrides their older one.

const CHANGES = ${JSON.stringify(changes, null, 2)};
`;
}

// ── Main ─────────────────────────────────────────────────────────
const WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const lifters = loadLifters();
  console.log(`Loaded ${lifters.length} lifters from data.js`);

  const prev = loadChanges();
  const now = new Date();
  const nowISO = now.toISOString();

  // Rank baseline: arrows compare CURRENT rank against a baseline that is
  // refreshed only once every 7 days, so movement reflects the whole week
  // rather than just the last run. If the stored baseline is missing or older
  // than the window, we re-snapshot it from the pre-update ranks now.
  const baselineAge = prev.baselineDate ? (now - new Date(prev.baselineDate)) : Infinity;
  const baselineExpired = baselineAge >= WINDOW_DAYS * DAY_MS;

  const preRankActive = rankMap(lifters.filter((l) => !l.legacy));
  const preRankAll = rankMap(lifters);

  let baselineDate, prevRankActive, prevRankAll;
  if (baselineExpired || !prev.prevRankActive || Object.keys(prev.prevRankActive).length === 0) {
    // Start a fresh 7-day window from today's pre-update ranks
    baselineDate = nowISO;
    prevRankActive = preRankActive;
    prevRankAll = preRankAll;
  } else {
    // Keep the existing baseline so arrows keep measuring against it all week
    baselineDate = prev.baselineDate;
    prevRankActive = prev.prevRankActive;
    prevRankAll = prev.prevRankAll;
  }

  const updated = [];
  const newPbEvents = [];
  let okCount = 0;

  for (const lifter of lifters) {
    const next = { ...lifter };
    try {
      const html = await fetchProfile(lifter.slug);
      const scraped = parseProfile(html);

      // Detect genuine PB improvements in the actual lifts.
      // A DOTS change on its own does NOT count — OpenPowerlifting can recompute
      // DOTS to a slightly different precision than we have stored, which would
      // otherwise flag everyone as a "PB" every run. We only celebrate when a
      // squat/bench/deadlift/total actually goes UP by a meaningful margin.
      const EPS = 0.01; // ignore sub-kg float noise
      const improved = {};
      for (const k of ["squat", "bench", "deadlift", "total"]) {
        const prev = lifter[k] || 0;
        if (prev > 0 && scraped[k] > prev + EPS) {
          improved[k] = { from: prev, to: scraped[k] };
        }
      }

      // Only a real lift improvement generates a card. DOTS is shown on the
      // card for context but never triggers one by itself.
      if (Object.keys(improved).length > 0) {
        newPbEvents.push({
          slug: lifter.slug,
          name: lifter.name,
          improved,                                   // {lift: {from,to}}
          dots: { from: lifter.dots || 0, to: scraped.dots },
          date: nowISO,                               // when this PB hit the board
        });
      }

      // Apply scraped numbers; keep fed/equip/bodyweight only if found
      next.squat = scraped.squat;
      next.bench = scraped.bench;
      next.deadlift = scraped.deadlift;
      next.total = scraped.total;
      next.dots = scraped.dots;
      if (scraped.fed) next.fed = scraped.fed;
      if (scraped.equip) next.equip = scraped.equip;
      if (scraped.bodyweight) next.bodyweight = scraped.bodyweight;

      okCount++;
      console.log(`  ✓ ${lifter.name} (${scraped.dots})`);
    } catch (err) {
      // Keep existing data untouched on any failure
      console.warn(`  ! ${lifter.name}: ${err.message} (kept existing data)`);
    }
    updated.push(next);
    await sleep(REQUEST_DELAY_MS);
  }

  // Safety valve: if too few parsed, something is broken site-wide. Abort.
  const ratio = okCount / lifters.length;
  if (ratio < MIN_PARSE_RATIO) {
    console.error(
      `ABORT: only ${okCount}/${lifters.length} profiles parsed (${(ratio * 100).toFixed(0)}%). ` +
      `Refusing to write — leaving data.js and changes.js untouched.`
    );
    process.exit(1);
  }

  // Compute new ranks AFTER updating
  const newRankActive = rankMap(updated.filter((l) => !l.legacy));
  const newRankAll = rankMap(updated);

  // ── Build the rolling 7-day PB window ──────────────────────────
  // Start from existing events still inside the window, then layer this run's
  // new PBs on top. New PBs override any existing event for the same lifter
  // (a fresh PB replaces their older one — the common, expected case).
  const cutoff = now - WINDOW_DAYS * DAY_MS;
  const survivors = (prev.pbEvents || []).filter((ev) => {
    const t = ev.date ? new Date(ev.date).getTime() : 0;
    return t >= cutoff;
  });

  const bySlug = new Map();
  for (const ev of survivors) bySlug.set(ev.slug, ev);   // keep recent
  for (const ev of newPbEvents) bySlug.set(ev.slug, ev); // new overrides

  const pbEvents = [...bySlug.values()];

  // (Re)compute rank movement for every event in the window against the
  // 7-day baseline, so "Up N places" reflects the whole week, not one run.
  for (const ev of pbEvents) {
    const before = prevRankActive[ev.slug];
    const after = newRankActive[ev.slug];
    if (before != null && after != null && after < before) {
      ev.placesUp = before - after;
    } else {
      delete ev.placesUp;
    }
  }

  const changes = {
    generated: nowISO,
    baselineDate,         // when the current 7-day rank baseline was set
    prevRankActive,       // ranks as of baselineDate — board diffs current vs these
    prevRankAll,
    pbEvents,             // rolling 7-day window of PBs
  };

  writeFileSync(DATA_PATH, serialiseData(updated), "utf8");
  writeFileSync(CHANGES_PATH, serialiseChanges(changes), "utf8");

  console.log(
    `\nDone. ${okCount}/${lifters.length} refreshed, ` +
    `${pbEvents.length} PB event(s) this week.`
  );
}

main().catch((err) => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
