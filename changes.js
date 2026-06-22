// Implexus Powerlifting — change log (rolling 7-day window)
// Written automatically by scripts/scrape.mjs on each daily run.
// generated:      ISO timestamp of the run that produced this file.
// baselineDate:   when the current rank baseline was set (refreshed every 7 days).
// prevRankActive / prevRankAll: slug -> rank as of baselineDate, in each view.
//   Position arrows compare current rank against these, so movement reflects
//   the whole week rather than just the last run.
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
  pbEvents: []
};
