# Implexus Powerlifting — Gym Rankings

A static leaderboard ranking Implexus gym members by their best DOTS score from any competition.

## Stack

Pure HTML + CSS + vanilla JS. Zero dependencies, zero build step. Static files deployable anywhere.

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Import the repo in [vercel.com](https://vercel.com)
3. Framework preset: **Other** (no build step needed)
4. Deploy — done

Or via Vercel CLI:
```bash
npm i -g vercel
vercel
```

## Add the gym logo

Drop your logo file into the project root as `logo.png` (or `logo.svg`).
The `<img>` in `index.html` falls back to the text "IMPLEXUS" if no logo is found.

## Update lifter data

Edit `data.js`. Each lifter object:

```js
{
  name: "Full Name",          // Display name
  slug: "urlslug",            // OpenPowerlifting URL slug (from /u/slug)
  ig: "instagramhandle",      // or null if none
  squat: 200,                 // kg — from the best-DOTS competition
  bench: 120,
  deadlift: 220,
  total: 540,
  dots: 349.24,               // The DOTS score for that meet
  equip: "Raw",               // "Raw" or "Wraps"
  comp: "Competition Name",
  date: "2026-01-25",         // ISO date
}
```

The leaderboard auto-sorts by `dots` descending. Rankings update on page load.

## Add Instagram handles

Find the lifter in `data.js` and set their `ig` field to the handle (without @):

```js
ig: "theirhandle",
```

Set to `null` to hide the icon.
