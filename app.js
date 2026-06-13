// Implexus Powerlifting — Leaderboard Renderer

(function () {
  // ── State ────────────────────────────────────────────────────
  let showLegacy = false;
  let sortKey = "dots"; // dots | squat | bench | deadlift

  // ── Helpers ──────────────────────────────────────────────────
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

  function statItem(label, value, extraClass, isSort) {
    const activeClass = isSort ? " stat-active" : "";
    return `<div class="stat-item${activeClass}">
      <span class="stat-label">${label}</span>
      <span class="stat-value${extraClass ? " " + extraClass : ""}">${value}</span>
    </div>`;
  }

  // ── Sorted + filtered list ────────────────────────────────────
  function getList() {
    let list = showLegacy ? [...LIFTERS] : LIFTERS.filter(l => !l.legacy);
    list.sort((a, b) => b[sortKey] - a[sortKey]);
    return list;
  }

  // ── Bar width for background glow ────────────────────────────
  function barWidth(val, min, max) {
    const pct = (val - min) / (max - min || 1);
    return 30 + pct * 70;
  }

  // ── Render a single row ───────────────────────────────────────
  function renderRow(lifter, rank, min, max) {
    const isTop3 = rank <= 3;
    const rankClass = rank === 1 ? "rank-gold" : rank === 2 ? "rank-silver" : rank === 3 ? "rank-bronze" : "";
    const rowClass = [
      rank === 1 ? "row-first" : "",
      lifter.legacy ? "row-legacy" : "",
    ].filter(Boolean).join(" ");
    const width = barWidth(lifter[sortKey], min, max);
    const dotsHL = isTop3 ? "dots-highlight" : "";
    const legacyBadge = lifter.legacy
      ? `<span class="legacy-badge" title="Former member">Legacy</span>`
      : "";

    // Which column is active for desktop highlight
    const sq   = sortKey === "squat";
    const bp   = sortKey === "bench";
    const dl   = sortKey === "deadlift";
    const tot  = sortKey === "total";
    const dots = sortKey === "dots";

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
        <span class="col-lift desktop-only${sq ? " col-active" : ""}">${fmt(lifter.squat)}</span>
        <span class="col-lift desktop-only${bp ? " col-active" : ""}">${fmt(lifter.bench)}</span>
        <span class="col-lift desktop-only${dl ? " col-active" : ""}">${fmt(lifter.deadlift)}</span>
        <span class="col-total desktop-only${tot ? " col-active" : ""}">${fmt(lifter.total)}</span>
        <span class="col-dots desktop-only ${dotsHL}${dots ? " col-active" : ""}">${fmtDots(lifter.dots)}</span>
        <div class="stats-mobile mobile-only">
          ${statItem("SQ",    fmt(lifter.squat),        "",            sq)}
          <div class="sep"></div>
          ${statItem("BP",    fmt(lifter.bench),        "",            bp)}
          <div class="sep"></div>
          ${statItem("DL",    fmt(lifter.deadlift),     "",            dl)}
          <div class="sep"></div>
          ${statItem("Total", fmt(lifter.total),        "",            tot)}
          <div class="sep"></div>
          ${statItem("DOTS",  fmtDots(lifter.dots),     "dots-val " + dotsHL, dots)}
        </div>
      </div>
    </article>`;
  }

  // ── Render full leaderboard ───────────────────────────────────
  function render() {
    const container = document.getElementById("leaderboard");
    if (!container) return;

    const list = getList();
    const vals = list.map(l => l[sortKey]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);

    container.innerHTML = list.map((l, i) => renderRow(l, i + 1, min, max)).join("");

    // Stagger animation
    container.querySelectorAll(".lb-row").forEach((row, i) => {
      row.style.animationDelay = `${i * 35}ms`;
    });

    // Sync sort button states
    document.querySelectorAll(".sort-btn").forEach(btn => {
      btn.classList.toggle("sort-active", btn.dataset.sort === sortKey);
    });

    // Highlight active desktop header cell
    document.querySelectorAll(".th-sort").forEach(th => {
      th.classList.toggle("th-active", th.dataset.sort === sortKey);
    });
  }

  // ── Theme toggle ─────────────────────────────────────────────
  function initTheme() {
    const root = document.documentElement;
    const btn  = document.getElementById("theme-toggle");
    if (!btn) return;

    // Resolve saved preference or system default
    const saved = localStorage.getItem("implexus-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;

    root.dataset.theme = isDark ? "dark" : "light";
    btn.textContent = isDark ? "Light" : "Dark";

    btn.addEventListener("click", () => {
      const nowDark = root.dataset.theme === "dark";
      root.dataset.theme = nowDark ? "light" : "dark";
      btn.textContent = nowDark ? "Dark" : "Light";
      localStorage.setItem("implexus-theme", nowDark ? "light" : "dark");
    });
  }

  // ── Legacy toggle ─────────────────────────────────────────────
  function initLegacyToggle() {
    const btn = document.getElementById("legacy-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      showLegacy = !showLegacy;
      btn.classList.toggle("legacy-active", showLegacy);
      btn.textContent = showLegacy ? "Hide Legacy" : "Show Legacy";
      render();
    });
  }

  // ── Sort buttons ──────────────────────────────────────────────
  function initSort() {
    document.querySelectorAll("[data-sort]").forEach(el => {
      el.addEventListener("click", () => {
        sortKey = el.dataset.sort;
        render();
      });
    });
  }

  // ── Boot ─────────────────────────────────────────────────────
  function init() {
    initTheme();
    initLegacyToggle();
    initSort();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
