// Implexus Powerlifting — Leaderboard Renderer

(function () {

  // ── Config ────────────────────────────────────────────────────
  const CONFIG = {
    rivalry_count:      12,      // size of the eligible pool to sample from
    rivalries_per_break:6,       // how many rivalries shown between each list page-pass
    per_page:           8,       // lifters shown per leaderboard page
    page_hold_ms:       8000,    // total time each page is shown (incl. cascade)
    page_fade_ms:       400,     // fade-out of the previous page
    cascade_stagger_ms: 60,      // delay between each row cascading in
    rivalry_hold_ms:    9000,    // how long each rivalry card holds
    joke_chance_each:   0.00175, // 0.175% chance per joke rivalry, per check
  };

  // ── State ─────────────────────────────────────────────────────
  let showLegacy = false;
  let dynamicActive = false;
  let dynamicPlaylist = [];   // [{type:'scroll'} | {type:'rivalry', a, b, gap}]
  let playlistIndex = 0;
  let scrollRAF = null;
  let holdTimeout = null;
  let overlay = null;

  // ── Formatters ───────────────────────────────────────────────
  function fmt(val) {
    return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
  }
  function fmtDots(val) { return val.toFixed(2); }

  // ── Lookup a real lifter by slug ──────────────────────────────
  function bySlug(slug) {
    return LIFTERS.find(l => l.slug === slug) || null;
  }

  // Build a fighter object from a real lifter, or a fake one.
  // Fakes carry their own name/dots/meta and a `fake: true` flag.
  function realFighter(slug, overrides = {}) {
    const l = bySlug(slug);
    if (!l) return null;
    return { ...l, ...overrides };
  }

  // ── Joke rivalries ────────────────────────────────────────────
  // These rotate in at random with a tiny per-item chance, in any mode.
  // Each: { build() -> {a, b, caption} } so real stats are resolved live.
  const JOKE_RIVALRIES = [
    {
      id: "will-nat-patience",
      build: () => ({
        a: realFighter("williamwebb1"),
        b: { name: "Nat's Patience", dots: 0, fed: "COACH", equip: "Thin", bodyweight: "0", fake: true },
        caption: "Nat Robinson has coached Will for years. Nat's patience: not pictured, presumed depleted.",
      }),
    },
    {
      id: "joe-refs",
      build: () => ({
        a: realFighter("joecurzon"),
        b: { name: "WRPF Referees", dots: 999.99, fed: "Panel", equip: "Eagle-Eyed", bodyweight: "∞", fake: true },
        caption: "Joe has never missed depth. The three red lights are a conspiracy. Especially her.",
      }),
    },
    {
      id: "mike-tendons",
      build: () => ({
        a: realFighter("mikejones1"),
        b: { name: "Two Working Knee Tendons", dots: 0, fed: "Intact", equip: "A Distant Memory", bodyweight: "—", fake: true },
        caption: "Mike had two. He now runs a leaner operation.",
      }),
    },
    {
      id: "matt-sam",
      build: () => ({
        a: realFighter("matthewanderson2"),
        b: realFighter("samlusher"),
        caption: "They don't talk. The DOTS are 3.22 apart. Neither will let it go.",
      }),
    },
    {
      id: "gen-asteroid",
      build: () => ({
        a: realFighter("genevievecollins"),
        b: { name: "The Chicxulub Impactor", dots: 66, fed: "Asteroid", equip: "10km Wide", bodyweight: "A Lot", fake: true },
        caption: "It ended the dinosaurs. Gen is still here. Advantage: Gen.",
      }),
    },
    {
      id: "wylie-julien",
      build: () => ({
        a: realFighter("wyliesung"),
        b: { name: "Julien Borg", dots: 571.83, fed: "GPU", equip: "Wraps", bodyweight: "92.2", fake: true },
        caption: "The European yardstick. 9.30 in it. Wylie's coming for it.",
      }),
    },
    {
      id: "mike-brett",
      build: () => ({
        a: realFighter("mikejones1"),
        b: { name: "Brett Brooks", dots: 534.69, fed: "BPU", equip: "Wraps", bodyweight: "109.4", fake: true },
        caption: "Brett's right there. 0.94 back. Mike can hear the footsteps.",
      }),
    },
    {
      id: "joe-alopecia",
      build: () => ({
        a: realFighter("joecurzon"),
        b: { name: "Androgenic Alopecia", dots: 378.88, fed: "Genetic", equip: "Receding", bodyweight: "—", fake: true },
        caption: "Undefeated. Undeterred. Gaining ground at the temples. 0.01 ahead.",
      }),
    },
    {
      id: "toby-matt-destiny",
      build: () => {
        const toby = realFighter("tobysolomon");
        const matt = realFighter("matthewanderson2");
        if (!toby || !matt) return { a: null, b: null };
        return {
          a: { name: "Toby & Matt", dots: (toby.dots + matt.dots), fed: "Implexus", equip: "Inseparable", bodyweight: "—", team: true },
          b: { name: "Their Destiny", dots: Infinity, fed: "Written", equip: "In The Stars", bodyweight: "—", fake: true },
          caption: "Some bonds transcend the platform. Toby and Matt are not fighting destiny. They're holding hands with it.",
        };
      },
    },
    {
      id: "laura-rack",
      build: () => ({
        a: realFighter("laurajones6"),
        b: { name: "The Barbell Rack", dots: 0, fed: "Equipment", equip: "Treacherous", bodyweight: "Heavy", fake: true },
        caption: "It tipped the loaded bar onto her and broke her hand. Laura came back. The rack is still just standing there.",
      }),
    },
    {
      id: "chris-image",
      build: () => ({
        a: realFighter("chrisjennings"),
        b: { name: "That Final Deadlift", dots: 0, fed: "British Champs", equip: "1st & A Record", bodyweight: "66kg Class", fake: true,
             image: "img/chris-deadlift.jpeg" },
        caption: "One rep from 1st place and a 66kg-class deadlift record. It got away. Chris has not forgotten.",
      }),
    },
    {
      id: "ben-dempsey",
      build: () => ({
        a: realFighter("benthornes"),
        b: { name: "Dempsey", dots: 462.29, fed: "EPF", equip: "Single", bodyweight: "103.6", fake: true },
        caption: "The measuring stick. 8.37 in it. Ben's chasing.",
      }),
    },
    {
      id: "adam-excuses",
      build: () => ({
        a: { name: "Adam Harrison", dots: 0, fed: "DNS", equip: "Someday", bodyweight: "TBC", fake: true },
        b: { name: "A List Of Excuses", dots: 999.99, fed: "Endless", equip: "Well-Rehearsed", bodyweight: "∞", fake: true },
        caption: "Adam wants to compete. Adam also has a slightly tweaked back, a busy month, the wrong singlet, and a feeling it's not quite the right meet.",
      }),
    },
    {
      id: "everyone-curse240",
      build: () => ({
        a: { name: "Everyone", dots: 0, fed: "Implexus", equip: "All Of Us", bodyweight: "—", fake: true },
        b: { name: "The Curse of 240", dots: 240, fed: "Unexplained", equip: "Squat", bodyweight: "240kg", fake: true },
        caption: "They can squat more. The bar reads 240. It does not matter. The bar always wins.",
      }),
    },
  ];

  // Roll for a joke rivalry. Returns a built joke or null.
  function rollJokeRivalry() {
    const candidates = [];
    for (const j of JOKE_RIVALRIES) {
      if (Math.random() < CONFIG.joke_chance_each) candidates.push(j);
    }
    if (!candidates.length) return null;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const built = pick.build();
    if (!built.a || !built.b) return null; // a real lifter was missing
    return built;
  }

  // ── Data helpers ─────────────────────────────────────────────
  function getList() {
    return (showLegacy ? [...LIFTERS] : LIFTERS.filter(l => !l.legacy))
      .sort((a, b) => b.dots - a.dots);
  }

  function getRivalries(list) {
    // Find ALL pairs within the DOTS threshold of each other (not just adjacent ranks)
    const pairs = [];
    for (let i = 0; i < list.length - 1; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const gap = list[i].dots - list[j].dots;
        if (gap <= 10) pairs.push({ a: list[i], b: list[j], gap });
      }
    }
    // Randomly sample from the full eligible pool so the selection differs each run,
    // rather than always surfacing the same closest/highest-ranked pairs.
    const shuffled = shuffle(pairs);
    return shuffled.slice(0, CONFIG.rivalry_count);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildPlaylist(list) {
    // One clean cycle: all leaderboard pages (8 per page) cascade through once,
    // then exactly N randomised rivalries. nextSlide() rebuilds a fresh cycle
    // each loop so rivalries stay varied.
    const pl = [];
    const per = CONFIG.per_page;
    const pageCount = Math.ceil(list.length / per);
    for (let p = 0; p < pageCount; p++) {
      pl.push({ type: 'page', pageIndex: p, pageCount });
    }
    const rivalries = shuffle(getRivalries(list)).slice(0, CONFIG.rivalries_per_break);
    for (const r of rivalries) pl.push({ type: 'rivalry', ...r });
    return pl;
  }

  // ── Normal leaderboard render ─────────────────────────────────
  function igLink(handle) {
    if (!handle) return "";
    return `<a class="ig-link" href="https://instagram.com/${handle}/" target="_blank" rel="noopener" aria-label="@${handle}">
      <svg class="ig-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>
      </svg>
    </a>`;
  }

  function statItem(label, value, extraClass) {
    return `<div class="stat-item">
      <span class="stat-label">${label}</span>
      <span class="stat-value${extraClass ? " " + extraClass : ""}">${value}</span>
    </div>`;
  }

  function barWidth(dots, min, max) {
    return 30 + ((dots - min) / (max - min || 1)) * 70;
  }

  function renderRow(lifter, rank, min, max) {
    const isTop3 = rank <= 3;
    const rankClass = rank === 1 ? "rank-gold" : rank === 2 ? "rank-silver" : rank === 3 ? "rank-bronze" : "";
    const rowClass = [rank === 1 ? "row-first" : "", lifter.legacy ? "row-legacy" : ""].filter(Boolean).join(" ");
    const dotsHL = isTop3 ? "dots-highlight" : "";
    const legacyBadge = lifter.legacy ? `<span class="legacy-badge">Legacy</span>` : "";

    return `
    <article class="lb-row ${rowClass}" data-rank="${rank}">
      <div class="bar-bg" style="width:${barWidth(lifter.dots,min,max)}%"></div>
      <div class="row-inner">
        <span class="col-rank ${rankClass}">${rank}</span>
        <div class="col-name-wrap">
          <div class="name-line">
            <a class="athlete-name" href="https://www.openpowerlifting.org/u/${lifter.slug}" target="_blank" rel="noopener">${lifter.name}</a>
            ${legacyBadge}${igLink(lifter.ig)}
          </div>
        </div>
        <span class="col-lift desktop-only">${fmt(lifter.squat)}</span>
        <span class="col-lift desktop-only">${fmt(lifter.bench)}</span>
        <span class="col-lift desktop-only">${fmt(lifter.deadlift)}</span>
        <span class="col-total desktop-only">${fmt(lifter.total)}</span>
        <span class="col-dots desktop-only ${dotsHL}">${fmtDots(lifter.dots)}</span>
        <div class="stats-mobile mobile-only">
          ${statItem("SQ",    fmt(lifter.squat))}
          <div class="sep"></div>
          ${statItem("BP",    fmt(lifter.bench))}
          <div class="sep"></div>
          ${statItem("DL",    fmt(lifter.deadlift))}
          <div class="sep"></div>
          ${statItem("Total", fmt(lifter.total))}
          <div class="sep"></div>
          ${statItem("DOTS",  fmtDots(lifter.dots), "dots-val " + dotsHL)}
        </div>
      </div>
    </article>`;
  }

  function render() {
    const container = document.getElementById("leaderboard");
    if (!container) return;
    const list = getList();
    const dots = list.map(l => l.dots);
    const min = Math.min(...dots), max = Math.max(...dots);
    container.innerHTML = list.map((l, i) => renderRow(l, i + 1, min, max)).join("");
    container.querySelectorAll(".lb-row").forEach((row, i) => {
      row.style.animationDelay = `${i * 35}ms`;
    });
  }

  // ── Dynamic mode ──────────────────────────────────────────────

  function createOverlay() {
    const el = document.createElement("div");
    el.id = "dynamic-overlay";
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", "Click to exit dynamic mode");
    document.body.appendChild(el);
    el.addEventListener("click", exitDynamic);
    return el;
  }

  function clearDynamic() {
    cancelAnimationFrame(scrollRAF);
    clearTimeout(holdTimeout);
    scrollRAF = null;
    holdTimeout = null;
  }

  function renderSlide() {
    // Roll for a rare joke rivalry interruption before each slide
    const joke = rollJokeRivalry();
    if (joke) {
      const gap = Math.abs(joke.a.dots - joke.b.dots);
      showRivalrySlide({ ...joke, gap, joke: true });
      return;
    }

    // When we've run through the current cycle, build a fresh randomised one
    if (playlistIndex >= dynamicPlaylist.length) {
      dynamicPlaylist = buildPlaylist(getList());
      playlistIndex = 0;
    }

    const slide = dynamicPlaylist[playlistIndex];
    playlistIndex++;
    if (slide.type === 'page') {
      showPageSlide(slide);
    } else {
      showRivalrySlide(slide);
    }
  }

  function nextSlide() {
    clearDynamic();
    if (!overlay) return;

    // Fade the current content out, then render the next slide
    const hasContent = overlay.children.length > 0;
    if (hasContent) {
      overlay.classList.add("dyn-fading");
      holdTimeout = setTimeout(() => {
        overlay.classList.remove("dyn-fading");
        renderSlide();
      }, CONFIG.page_fade_ms);
    } else {
      renderSlide();
    }
  }

  // ── Page slide ────────────────────────────────────────────────
  function showPageSlide({ pageIndex, pageCount }) {
    const list = getList();
    const dots = list.map(l => l.dots);
    const min = Math.min(...dots), max = Math.max(...dots);

    const per = CONFIG.per_page;
    const start = pageIndex * per;
    const pageItems = list.slice(start, start + per);

    // Build rows with their absolute (continuous) rank
    const rowsHTML = pageItems
      .map((l, i) => renderDynRow(l, start + i + 1, min, max))
      .join("");

    overlay.innerHTML = `
      <div class="dyn-page-header">
        <img src="logo.svg" alt="Implexus" class="dyn-logo" />
        <div class="dyn-page-indicator">${pageIndex + 1} / ${pageCount}</div>
      </div>
      <div class="dyn-page-wrap">
        <div class="dyn-list dyn-page-list" id="dyn-page-list">
          ${rowsHTML}
        </div>
      </div>
      <div class="dyn-exit-hint">tap to exit</div>
    `;

    // Cascade each row in from the side
    const rows = overlay.querySelectorAll(".dyn-row");
    rows.forEach((row, i) => {
      row.style.animationDelay = `${i * CONFIG.cascade_stagger_ms}ms`;
      row.classList.add("dyn-row-cascade");
    });

    // Hold, then advance
    holdTimeout = setTimeout(nextSlide, CONFIG.page_hold_ms);
  }

  function renderDynRow(lifter, rank, min, max) {
    const rankClass = rank === 1 ? "rank-gold" : rank === 2 ? "rank-silver" : rank === 3 ? "rank-bronze" : "";
    const isTop3 = rank <= 3;
    const dotsHL = isTop3 ? "dots-highlight" : "";
    const legacyTag = lifter.legacy ? `<span class="dyn-legacy-tag">Legacy</span>` : "";
    const width = barWidth(lifter.dots, min, max);

    const stat = (label, value) => `
      <span class="dyn-stat">
        <span class="dyn-stat-label">${label}</span>
        <span class="dyn-stat-value">${fmt(value)}</span>
      </span>`;

    return `
    <div class="dyn-row" data-rank="${rank}">
      <div class="dyn-bar" style="width:${width}%"></div>
      <span class="dyn-rank ${rankClass}">${rank}</span>
      <span class="dyn-name">${lifter.name}${legacyTag}</span>
      <span class="dyn-stats">
        ${stat("SQ", lifter.squat)}
        ${stat("BP", lifter.bench)}
        ${stat("DL", lifter.deadlift)}
        ${stat("Total", lifter.total)}
      </span>
      <span class="dyn-dots ${dotsHL}">${fmtDots(lifter.dots)}</span>
    </div>`;
  }

  // ── Rivalry slide ─────────────────────────────────────────────
  function showRivalrySlide({ a, b, gap, caption, joke }) {
    const metaLine = (l) => {
      const bw = l.bodyweight && /^[\d.]+$/.test(l.bodyweight) ? `${l.bodyweight}kg` : l.bodyweight;
      const parts = [l.fed, l.equip, bw].filter(Boolean);
      return parts.join(" • ");
    };

    // Show a DOTS figure only when it's a real, finite, non-sentinel score.
    // Conceptual/fake opponents (destiny, excuses, the rack) shouldn't show a number.
    const dotsDisplay = (l) => {
      if (!l.fake) return `<div class="dyn-fighter-dots">${fmtDots(l.dots)}</div>`;
      if (l.dots && isFinite(l.dots) && l.dots !== 999.99 && l.dots !== 0 && l.dots !== 240) {
        // a real-but-external person (Julien, Brett, Dempsey) — keep their score
        return `<div class="dyn-fighter-dots">${fmtDots(l.dots)}</div>`;
      }
      // conceptual opponent — show a dash instead of a number
      return `<div class="dyn-fighter-dots dyn-dots-concept">—</div>`;
    };

    const fighterHTML = (l, side) => {
      const fakeClass = l.fake ? 'dyn-fighter-fake' : '';
      const teamClass = l.team ? 'dyn-fighter-team' : '';
      const imageHTML = l.image
        ? `<div class="dyn-fighter-img-wrap"><img class="dyn-fighter-img" src="${l.image}" alt="${l.name}" /></div>`
        : '';
      return `
        <div class="dyn-fighter dyn-fighter-${side} ${fakeClass} ${teamClass}">
          ${imageHTML}
          <div class="dyn-fighter-name">${l.name}</div>
          ${dotsDisplay(l)}
          <div class="dyn-fighter-meta">${metaLine(l)}</div>
        </div>`;
    };

    const label = joke ? "Grudge Match" : "Rivalry";

    overlay.innerHTML = `
      <div class="dyn-rivalry ${joke ? 'dyn-rivalry-joke' : ''}">
        <div class="dyn-rivalry-label ${joke ? 'dyn-label-joke' : ''}">${label}</div>
        <div class="dyn-rivalry-fighters">
          ${fighterHTML(a, 'a')}
          <div class="dyn-vs">
            <div class="dyn-vs-text">VS</div>
            ${joke ? '' : `<div class="dyn-gap-label">${gap.toFixed(2)} apart</div>`}
          </div>
          ${fighterHTML(b, 'b')}
        </div>
        ${joke && caption ? `<div class="dyn-caption">${caption}</div>` : `
        <div class="dyn-gap-bar-wrap">
          <div class="dyn-gap-bar-track">
            <div class="dyn-gap-bar-fill"></div>
          </div>
        </div>`}
      </div>
      <div class="dyn-exit-hint">tap to exit</div>
    `;

    // Animate gap bar in
    requestAnimationFrame(() => {
      const fill = overlay.querySelector(".dyn-gap-bar-fill");
      if (fill) fill.style.width = "100%";
    });

    holdTimeout = setTimeout(nextSlide, CONFIG.rivalry_hold_ms);
  }

  // ── Static-mode joke rivalry (any mode) ───────────────────────
  // While browsing the normal leaderboard, give joke rivalries a
  // rare chance to pop up as a dismissible card.
  function showStaticJoke(joke) {
    if (dynamicActive || overlay) return; // never clash with dynamic mode
    const gap = Math.abs(joke.a.dots - joke.b.dots);
    overlay = createOverlay();
    // Reuse the dynamic rivalry renderer
    const saved = dynamicActive;
    showRivalrySlide({ ...joke, gap, joke: true });
    // No auto-advance; clearing the hold timeout the renderer set
    clearTimeout(holdTimeout);
    holdTimeout = null;
    // Auto-dismiss after a while if not clicked
    holdTimeout = setTimeout(() => {
      if (overlay && !dynamicActive) { overlay.remove(); overlay = null; }
    }, CONFIG.rivalry_hold_ms + 4000);
  }

  function startStaticJokeRoller() {
    // Roll shortly after load, then periodically
    setTimeout(() => {
      const j = rollJokeRivalry();
      if (j) showStaticJoke(j);
    }, 8000);
    setInterval(() => {
      if (dynamicActive || overlay) return;
      const j = rollJokeRivalry();
      if (j) showStaticJoke(j);
    }, 20000);
  }

  // ── Enter / exit dynamic ──────────────────────────────────────
  function enterDynamic() {
    dynamicActive = true;
    const list = getList();
    dynamicPlaylist = buildPlaylist(list);
    playlistIndex = 0;

    overlay = createOverlay();
    overlay.style.setProperty("--dyn-fade", `${CONFIG.page_fade_ms}ms`);

    // Attempt fullscreen
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();

    nextSlide();
  }

  function exitDynamic() {
    dynamicActive = false;
    clearDynamic();

    if (overlay) { overlay.remove(); overlay = null; }

    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (document.webkitFullscreenElement) document.webkitExitFullscreen();
  }

  // ── Inits ─────────────────────────────────────────────────────
  function initTheme() {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    root.dataset.theme = mq.matches ? "dark" : "light";
    mq.addEventListener("change", e => {
      root.dataset.theme = e.matches ? "dark" : "light";
    });
  }

  function initLegacy() {
    const btn = document.getElementById("legacy-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      showLegacy = !showLegacy;
      btn.classList.toggle("legacy-active", showLegacy);
      btn.textContent = showLegacy ? "Hide Legacy" : "Show Legacy";
      render();
    });
  }

  function initDynamic() {
    const btn = document.getElementById("dynamic-toggle");
    if (!btn) return;
    btn.addEventListener("click", enterDynamic);
  }

  function init() {
    initTheme();
    initLegacy();
    initDynamic();
    render();
    startStaticJokeRoller();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
