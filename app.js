// Implexus Powerlifting — Leaderboard Renderer

(function () {
  const MAX_DOTS = Math.max(...LIFTERS.map((l) => l.dots));
  const MIN_DOTS = Math.min(...LIFTERS.map((l) => l.dots));

  function fmt(val) {
    return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
  }

  function fmtDots(val) {
    return val.toFixed(2);
  }

  function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00Z");
    return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }

  function barWidth(dots) {
    const pct = (dots - MIN_DOTS) / (MAX_DOTS - MIN_DOTS);
    return 30 + pct * 70;
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

  function isMobile() {
    return window.innerWidth < 580;
  }

  function statItem(label, value, extraClass) {
    return `<div class="stat-item">
      <span class="stat-label">${label}</span>
      <span class="stat-value${extraClass ? " " + extraClass : ""}">${value}</span>
    </div>`;
  }

  function renderRow(lifter, rank) {
    const isTop3 = rank <= 3;
    const rankClass =
      rank === 1 ? "rank-gold" : rank === 2 ? "rank-silver" : rank === 3 ? "rank-bronze" : "";
    const rowClass = rank === 1 ? "row-first" : "";
    const width = barWidth(lifter.dots);
    const dotsHL = isTop3 ? "dots-highlight" : "";

    const desktopStats = `
      <span class="col-lift">${fmt(lifter.squat)}</span>
      <span class="col-lift">${fmt(lifter.bench)}</span>
      <span class="col-lift">${fmt(lifter.deadlift)}</span>
      <span class="col-total">${fmt(lifter.total)}</span>
      <span class="col-dots ${dotsHL}">${fmtDots(lifter.dots)}</span>
    `;

    const mobileStats = `
      <div class="stats-mobile">
        ${statItem("SQ", fmt(lifter.squat))}
        <div class="sep"></div>
        ${statItem("BP", fmt(lifter.bench))}
        <div class="sep"></div>
        ${statItem("DL", fmt(lifter.deadlift))}
        <div class="sep"></div>
        ${statItem("Total", fmt(lifter.total))}
        <div class="sep"></div>
        ${statItem("DOTS", fmtDots(lifter.dots), "dots-val " + dotsHL)}
      </div>
    `;

    return `
    <article class="lb-row ${rowClass}" data-rank="${rank}">
      <div class="bar-bg" style="width: ${width}%"></div>
      <div class="row-inner">
        <span class="col-rank ${rankClass}">${rank}</span>
        <div class="col-name-wrap">
          <div class="name-line">
            <a class="athlete-name" href="https://www.openpowerlifting.org/u/${lifter.slug}" target="_blank" rel="noopener">${lifter.name}</a>
            ${igLink(lifter.ig)}
          </div>
          <div class="comp-line">
            <span class="comp-name">${lifter.comp}</span>
            <span class="comp-date">${fmtDate(lifter.date)}</span>
          </div>
        </div>
        <span class="col-lift desktop-only">${fmt(lifter.squat)}</span>
        <span class="col-lift desktop-only">${fmt(lifter.bench)}</span>
        <span class="col-lift desktop-only">${fmt(lifter.deadlift)}</span>
        <span class="col-total desktop-only">${fmt(lifter.total)}</span>
        <span class="col-dots desktop-only ${dotsHL}">${fmtDots(lifter.dots)}</span>
        <div class="stats-mobile mobile-only">
          ${statItem("SQ", fmt(lifter.squat))}
          <div class="sep"></div>
          ${statItem("BP", fmt(lifter.bench))}
          <div class="sep"></div>
          ${statItem("DL", fmt(lifter.deadlift))}
          <div class="sep"></div>
          ${statItem("Total", fmt(lifter.total))}
          <div class="sep"></div>
          ${statItem("DOTS", fmtDots(lifter.dots), "dots-val " + dotsHL)}
        </div>
      </div>
    </article>`;
  }

  function init() {
    const container = document.getElementById("leaderboard");
    if (!container) return;
    container.innerHTML = LIFTERS.map((lifter, i) => renderRow(lifter, i + 1)).join("");

    // Stagger animation
    const rows = container.querySelectorAll(".lb-row");
    rows.forEach((row, i) => {
      row.style.animationDelay = `${i * 40}ms`;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
