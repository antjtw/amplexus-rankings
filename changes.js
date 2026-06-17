// Implexus Powerlifting — weekly change log
// Written automatically by scripts/scrape.mjs each Wednesday.
// prevRankActive / prevRankAll: slug -> last week's rank in each view,
//   used to draw position arrows on the board.
// pbEvents: this week's personal-best improvements, shown as callout cards
//   in dynamic mode. Cleared and rewritten every run.
// generated: ISO timestamp of the run that produced this file.
//
// This is the initial baseline (empty) — arrows and PB cards begin appearing
// after the first scheduled scrape has a previous week to compare against.

const CHANGES = {
  generated: null,
  prevRankActive: {},
  prevRankAll: {},
  pbEvents: []
};
