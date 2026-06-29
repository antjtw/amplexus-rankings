// Implexus Powerlifting — change log (rolling 7-day window)
// Written automatically by scripts/scrape.mjs on each daily run.
// generated:      ISO timestamp of the run that produced this file.
// baselineDate:   when the current rank baseline was set (refreshed every 7 days).
// prevRankActive / prevRankAll: slug -> rank as of baselineDate, RE-RANKED over
//   the current roster so arrivals/departures don't create phantom arrows.
//   Position arrows compare current rank against these, so only genuine
//   lifting-driven movement shows — roster logistics net to zero.
// rosterActive / rosterAll: the slugs present at this run (roster-change basis).
// arrivals / departures:    who joined / left since the baseline (stored for
//   possible future use; not displayed). Arrivals show as NEW, not as movers.
// pbEvents:       personal-best improvements from the last 7 days, each stamped
//   with the date it hit the board. Shown as callout cards in dynamic mode,
//   ageing out after 7 days. A new PB for a lifter overrides their older one.
//
// This is the initial baseline (empty) — arrows and PB cards begin appearing
// after the first scrape has data to compare against.

const CHANGES = {
  generated: null,
  baselineDate: null,
  prevRankActive: {},
  prevRankAll: {},
  curRankActive: {},
  curRankAll: {},
  rosterActive: [],
  rosterAll: [],
  arrivals: [],
  departures: [],
  pbEvents: []
};
