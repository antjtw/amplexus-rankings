// Implexus Powerlifting — Leaderboard Renderer

(function () {

  // ── Config ────────────────────────────────────────────────────
  const CONFIG = {
    rivalry_count:      5,      // number of rivalry pairs to surface
    scroll_duration_ms: 34000,  // how long the scroll phase lasts
    rivalry_hold_ms:    9000,   // how long each rivalry card holds
    scroll_px_per_sec:  45,     // scroll speed during list phase
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

  // ── Data helpers ─────────────────────────────────────────────
  function getList() {
    return (showLegacy ? [...LIFTERS] : LIFTERS.filter(l => !l.legacy))
      .sort((a, b) => b.dots - a.dots);
  }

  function getRivalries(list) {
    // Find all pairs within 10 DOTS of each other, prefer higher-ranked pairs
    const pairs = [];
    for (let i = 0; i < list.length - 1; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const gap = list[i].dots - list[j].dots;
        if (gap <= 10) pairs.push({ a: list[i], b: list[j], gap });
      }
    }
    // Sort by rank proximity (prefer pairs closest to top) then by gap
    pairs.sort((x, y) => (x.a.dots + x.b.dots) > (y.a.dots + y.b.dots) ? -1 : 1);
    return pairs.slice(0, CONFIG.rivalry_count);
  }

  function buildPlaylist(list) {
    const rivalries = getRivalries(list);
    // Interleave: scroll, rivalry, scroll, rivalry ...
    const pl = [];
    const scrollCount = rivalries.length + 1;
    for (let i = 0; i < scrollCount; i++) {
      pl.push({ type: 'scroll' });
      if (rivalries[i]) pl.push({ type: 'rivalry', ...rivalries[i] });
    }
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

  function nextSlide() {
    clearDynamic();
    const slide = dynamicPlaylist[playlistIndex % dynamicPlaylist.length];
    playlistIndex++;
    if (slide.type === 'scroll') {
      showScrollSlide();
    } else {
      showRivalrySlide(slide);
    }
  }

  // ── Scroll slide ──────────────────────────────────────────────
  function showScrollSlide() {
    const list = getList();
    const dots = list.map(l => l.dots);
    const min = Math.min(...dots), max = Math.max(...dots);

    overlay.innerHTML = `
      <div class="dyn-scroll-wrap">
        <div class="dyn-list" id="dyn-list">
          ${list.map((l, i) => renderDynRow(l, i + 1, min, max)).join("")}
        </div>
      </div>
      <div class="dyn-exit-hint">tap to exit</div>
    `;

    const listEl = overlay.querySelector("#dyn-list");
    const wrapEl = overlay.querySelector(".dyn-scroll-wrap");

    // Wait one frame for layout, then measure and scroll
    let startTime = null;

    requestAnimationFrame(() => {
      // scrollHeight includes padding — this gets us all the way to the last row
      const totalScrollable = wrapEl.scrollHeight - wrapEl.clientHeight;
      const duration = CONFIG.scroll_duration_ms;

      function step(ts) {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Smooth in/out, clamped 0..1 so it never overshoots the bottom
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        const clamped = Math.max(0, Math.min(1, eased));
        wrapEl.scrollTop = clamped * totalScrollable;

        if (progress < 1) {
          scrollRAF = requestAnimationFrame(step);
        } else {
          wrapEl.scrollTop = totalScrollable; // settle exactly at bottom
          holdTimeout = setTimeout(nextSlide, 1500);
        }
      }

      scrollRAF = requestAnimationFrame(step);
    });
  }

  function renderDynRow(lifter, rank, min, max) {
    const rankClass = rank === 1 ? "rank-gold" : rank === 2 ? "rank-silver" : rank === 3 ? "rank-bronze" : "";
    const isTop3 = rank <= 3;
    const dotsHL = isTop3 ? "dots-highlight" : "";
    const legacyTag = lifter.legacy ? `<span class="dyn-legacy-tag">Legacy</span>` : "";
    const width = barWidth(lifter.dots, min, max);

    return `
    <div class="dyn-row" data-rank="${rank}">
      <div class="dyn-bar" style="width:${width}%"></div>
      <span class="dyn-rank ${rankClass}">${rank}</span>
      <span class="dyn-name">${lifter.name}${legacyTag}</span>
      <span class="dyn-dots ${dotsHL}">${fmtDots(lifter.dots)}</span>
    </div>`;
  }

  // ── Rivalry slide ─────────────────────────────────────────────
  function showRivalrySlide({ a, b, gap }) {
    overlay.innerHTML = `
      <div class="dyn-rivalry">
        <div class="dyn-rivalry-label">Rivalry</div>
        <div class="dyn-rivalry-fighters">
          <div class="dyn-fighter dyn-fighter-a">
            <div class="dyn-fighter-name">${a.name}</div>
            <div class="dyn-fighter-dots">${fmtDots(a.dots)}</div>
          </div>
          <div class="dyn-vs">
            <div class="dyn-vs-text">VS</div>
            <div class="dyn-gap-label">${gap.toFixed(2)} apart</div>
          </div>
          <div class="dyn-fighter dyn-fighter-b">
            <div class="dyn-fighter-name">${b.name}</div>
            <div class="dyn-fighter-dots">${fmtDots(b.dots)}</div>
          </div>
        </div>
        <div class="dyn-gap-bar-wrap">
          <div class="dyn-gap-bar-track">
            <div class="dyn-gap-bar-fill"></div>
          </div>
        </div>
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

  // ── Enter / exit dynamic ──────────────────────────────────────
  function enterDynamic() {
    dynamicActive = true;
    const list = getList();
    dynamicPlaylist = buildPlaylist(list);
    playlistIndex = 0;

    overlay = createOverlay();

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
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
