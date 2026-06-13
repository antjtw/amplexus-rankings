// Implexus Powerlifting — Leaderboard Renderer

(function () {
  let showLegacy = false;

  function fmt(val) {
    return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
  }
  function fmtDots(val) {
    return val.toFixed(2);
  }

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

  function getList() {
    const list = showLegacy ? [...LIFTERS] : LIFTERS.filter(l => !l.legacy);
    return list.sort((a, b) => b.dots - a.dots);
  }

  function barWidth(dots, min, max) {
    const pct = (dots - min) / (max - min || 1);
    return 30 + pct * 70;
  }

  function renderRow(lifter, rank, min, max) {
    const isTop3 = rank <= 3;
    const rankClass = rank === 1 ? "rank-gold" : rank === 2 ? "rank-silver" : rank === 3 ? "rank-bronze" : "";
    const rowClass = [rank === 1 ? "row-first" : "", lifter.legacy ? "row-legacy" : ""].filter(Boolean).join(" ");
    const width = barWidth(lifter.dots, min, max);
    const dotsHL = isTop3 ? "dots-highlight" : "";
    const legacyBadge = lifter.legacy ? `<span class="legacy-badge">Legacy</span>` : "";

    return `
    <article class="lb-row ${rowClass}" data-rank="${rank}">
      <div class="bar-bg" style="width:${width}%"></div>
      <div class="row-inner">
        <span class="col-rank ${rankClass}">${rank}</span>
        <div class="col-name-wrap">
          <div class="name-line">
            <a class="athlete-name" href="https://www.openpowerlifting.org/u/${lifter.slug}" target="_blank" rel="noopener">${lifter.name}</a>
            ${legacyBadge}
            ${igLink(lifter.ig)}
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

  // ── Theme ─────────────────────────────────────────────────────
  function initTheme() {
    const root = document.documentElement;
    const btn  = document.getElementById("theme-toggle");
    if (!btn) return;

    const saved = localStorage.getItem("implexus-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;

    root.dataset.theme = isDark ? "dark" : "light";
    btn.setAttribute("aria-checked", isDark ? "true" : "false");

    btn.addEventListener("click", () => {
      const nowDark = root.dataset.theme === "dark";
      const next = nowDark ? "light" : "dark";
      root.dataset.theme = next;
      btn.setAttribute("aria-checked", nowDark ? "false" : "true");
      localStorage.setItem("implexus-theme", next);
    });
  }

  // ── Legacy ────────────────────────────────────────────────────
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

  function init() {
    initTheme();
    initLegacy();
    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
