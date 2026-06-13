// Implexus Powerlifting — Leaderboard Data
// PB squat, bench, deadlift and total from OpenPowerlifting Personal Bests table.
// For lifters with Raw + Wraps entries, best DOTS row determines ranking;
// individual lift PBs are taken across both equip categories.
// legacy: true = former member, shown only when legacy filter is on.

const LIFTERS = [
  // ── ACTIVE MEMBERS ──────────────────────────────────────────
  {
    name: "Wylie Du Sung",
    slug: "wyliesung",
    ig: "wyliesung28",
    squat: 337.5, bench: 200, deadlift: 357.5, total: 890, dots: 562.53,
  },
  {
    name: "Mike Jones",
    slug: "mikejones1",
    ig: "mikejoneswigan",
    squat: 350, bench: 202.5, deadlift: 355, total: 902.5, dots: 535.63,
  },
  {
    name: "Jurassic Gen",
    slug: "genevievecollins",
    ig: "swole_mami",
    squat: 177.5, bench: 97.5, deadlift: 192.5, total: 467.5, dots: 466.15,
  },
  {
    name: "Chris Jennings",
    slug: "chrisjennings",
    ig: "chris_implexus",
    squat: 202.5, bench: 140, deadlift: 245, total: 587.5, dots: 460.84,
  },
  {
    name: "Ant White",
    slug: "anthonywhite1",
    ig: "shred.kemer",
    squat: 250, bench: 137.5, deadlift: 280, total: 645, dots: 411.24,
  },
  {
    name: "Nick Johnstone",
    slug: "nickjohnstone",
    ig: "njfullpower",
    squat: 245, bench: 180, deadlift: 242.5, total: 667.5, dots: 408.42,
  },
  {
    name: "Talia Firth",
    slug: "taliafirth",
    ig: "talsssssx",
    squat: 177.5, bench: 102.5, deadlift: 187.5, total: 465, dots: 399.98,
  },
  {
    name: "Steve Whittles",
    slug: "stevewhittles",
    ig: "mrnorfgym",
    squat: 230, bench: 150, deadlift: 270, total: 650, dots: 395.43,
  },
  {
    name: "Will Webb",
    slug: "williamwebb1",
    ig: "willwebbpower",
    squat: 252.5, bench: 127.5, deadlift: 260, total: 630, dots: 385.53,
  },
  {
    name: "Ash Keeble",
    slug: "ashlingkeeble",
    ig: "ashlinglifts",
    squat: 145, bench: 87.5, deadlift: 162.5, total: 390, dots: 378.95,
  },
  {
    name: "Joe Curzon",
    slug: "joecurzon",
    ig: "joecurzon93",
    squat: 242.5, bench: 125, deadlift: 250, total: 615, dots: 378.87,
  },
  {
    name: "Leo Hannan",
    slug: "leohannan",
    ig: "leo.hannan",
    squat: 200, bench: 127.5, deadlift: 250, total: 572.5, dots: 388.07,
    legacy: true,
  },
  {
    name: "Toby Solomon",
    slug: "tobysolomon",
    ig: "toby_solomon_",
    squat: 182.5, bench: 127.5, deadlift: 230, total: 540, dots: 345.84,
  },
  {
    name: "Finn Davis",
    slug: "finndavis",
    ig: "finndavispl",
    squat: 190, bench: 120, deadlift: 215, total: 525, dots: 339.47,
  },
  {
    name: "Matt Anderson",
    slug: "matthewanderson2",
    ig: "mattslifts",
    squat: 160, bench: 110, deadlift: 215, total: 485, dots: 329.44,
  },
  {
    name: "Owen Crisp",
    slug: "owencrisp",
    ig: "owen_crisp",
    squat: 160, bench: 102.5, deadlift: 202.5, total: 462.5, dots: 327.69,
  },
  {
    name: "Sam Lusher",
    slug: "samlusher",
    ig: "lush_sa94",
    squat: 205, bench: 142.5, deadlift: 215, total: 562.5, dots: 326.22,
    legacy: true,
  },
  {
    name: "Jodie Barnsley",
    slug: "jodiebarnsley",
    ig: null,
    squat: 117.5, bench: 70, deadlift: 122.5, total: 307.5, dots: 295.36,
  },
  {
    name: "Laura Jones",
    slug: "laurajones6",
    ig: "lauraelizabeth193",
    squat: 82.5, bench: 45, deadlift: 117.5, total: 245, dots: 245.62,
  },

  {
    name: "Jack Larkins-Thomas",
    slug: "jacklarkinsthomas",
    ig: "jackliftingstuff",
    squat: 160, bench: 82.5, deadlift: 180, total: 422.5, dots: 245.91,
  },

  {
    name: "Kai Richardson",
    slug: "kairichardson",
    ig: "koach_kai",
    squat: 207.5, bench: 145, deadlift: 300, total: 637.5, dots: 450.21,
  },
  {
    name: "Dr. Peter King",
    slug: "peterking1",
    ig: "kingpete__",
    squat: 220, bench: 155, deadlift: 270, total: 630, dots: 420.14,
  },

  // ── LEGACY MEMBERS ──────────────────────────────────────────
  {
    name: "Chris Onuoha",
    slug: "chrisonuoha",
    ig: "chris_onu",
    squat: 280, bench: 150, deadlift: 340, total: 760, dots: 487.65,
    legacy: true,
  },
  {
    name: "Rory Turnbull",
    slug: "roryturnbull",
    ig: "rpturnbull",
    squat: 170, bench: 112.5, deadlift: 230, total: 512.5, dots: 314.64,
    legacy: true,
  },
  {
    name: "Gerry-Lee Pierre",
    slug: "gerryleepierre",
    ig: "gerryleepierre",
    squat: 305, bench: 182.5, deadlift: 305, total: 785, dots: 483.49,
    legacy: true,
  },
  {
    name: "Karl Daniel",
    slug: "karldaniel",
    ig: "only_2_ks",
    squat: 240, bench: 160, deadlift: 300, total: 700, dots: 452.62,
    legacy: true,
  },
  {
    name: "Brady Crooks",
    slug: "bradycrooks",
    ig: null,
    squat: 245, bench: 152.5, deadlift: 255, total: 652.5, dots: 415.15,
    legacy: true,
  },
  {
    name: "Tony McLaughlin",
    slug: "anthonymclaughlin1",
    ig: "fat_tony2",
    squat: 240, bench: 152.5, deadlift: 300, total: 680, dots: 411.38,
    legacy: true,
  },
  {
    name: "Dr. Samriddha Ranjan",
    slug: "samriddharanjan",
    ig: "riddhiculous.strength",
    squat: 220, bench: 127.5, deadlift: 242.5, total: 582.5, dots: 408.87,
    legacy: true,
  },
  {
    name: "Annie Burns",
    slug: "anneburns",
    ig: "anneinthegym",
    squat: 170.5, bench: 100.5, deadlift: 190.5, total: 461.5, dots: 502.99,
    legacy: true,
  },
  {
    name: "Max Guo",
    slug: "maxguo",
    ig: "maxguo83kg",
    squat: 255, bench: 177.5, deadlift: 287.5, total: 720, dots: 488.39,
    legacy: true,
  },
  {
    name: "Vic Hart",
    slug: "victoriahart",
    ig: "vicsquats_",
    squat: 175, bench: 102.5, deadlift: 172.5, total: 450, dots: 488.26,
    legacy: true,
  },
  {
    name: "Josh Hinchcliffe",
    slug: "joshhinchcliffe",
    ig: "josh_hinchcliffe_pl",
    squat: 232.5, bench: 160, deadlift: 280, total: 670, dots: 456.45,
    legacy: true,
  },

];
