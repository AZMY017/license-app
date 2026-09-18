// ==========================================================
// Masaniello UI, bilingual labels, counters and undo support
// ==========================================================

async function callCalcApi(payload) {
  const res = await fetch("/api/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Server error");
  return data;
}

const MODE_META = {
  classic: { theme: "theme-classic", title: "CLASSIC MASANIELLO — DASHBOARD", hasTarget: false },
  double: { theme: "theme-navy", title: "DOUBLE CHANCE MASANIELLO — DASHBOARD", hasTarget: true },
  triple: { theme: "theme-navy", title: "TRIPLE CHANCE MASANIELLO — DASHBOARD", hasTarget: true }
};
const legsByMode = { double: 2, triple: 3 };
const sessions = { classic: null, double: null, triple: null };

function el(mode, name) {
  return document.getElementById(`${mode}-${name}`);
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return "-";
  return numberFormatter.format(n);
}

function buildDashboard(mode) {
  const meta = MODE_META[mode];
  const targetRow = meta.hasTarget
    ? `<tr><td class="excel-row-label" data-i18n="targetProfit">${t("targetProfit")}</td><td><input class="amber-cell" type="number" step="0.1" id="${mode}-target" placeholder="${t("placeholderTarget")}" /></td></tr>`
    : `<tr><td colspan="2" class="auto-target-note" data-i18n="targetAuto">${t("targetAuto")}</td></tr>`;
  const resultsRows = meta.hasTarget
    ? `<tr><td class="excel-row-label" data-i18n="multiplier">${t("multiplier")}</td><td class="excel-row-value" id="${mode}-r-mult">-</td></tr>
       <tr><td class="excel-row-label" data-i18n="targetCapital">${t("targetCapital")}</td><td class="excel-row-value" id="${mode}-r-target">-</td></tr>
       <tr><td class="excel-row-label" data-i18n="ratio">${t("ratio")}</td><td class="excel-row-value" id="${mode}-r-ratio">-</td></tr>
       <tr><td class="excel-row-label" data-i18n="feasibility">${t("feasibility")}</td><td class="excel-row-value" id="${mode}-r-feasible">-</td></tr>`
    : `<tr><td class="excel-row-label" data-i18n="finalCapital">${t("finalCapital")}</td><td class="excel-row-value" id="${mode}-r-target">-</td></tr>
       <tr><td class="excel-row-label" data-i18n="resa">${t("resa")}</td><td class="excel-row-value" id="${mode}-r-mult">-</td></tr>`;
  const stakePanel = meta.hasTarget
    ? `<div class="panel p-stake hidden" id="${mode}-stake-panel"><div class="panel-title pt-stake" data-i18n="autoStake">${t("autoStake")}</div><table class="excel-table">
       <tr><td class="excel-row-label" data-i18n="firstStake">${t("firstStake")}</td><td class="excel-row-value stat-box win" id="${mode}-r-firststake">-</td></tr>
       <tr><td class="excel-row-label" data-i18n="nextStake">${t("nextStake")}</td><td class="excel-row-value stat-box win" id="${mode}-r-nextstake">-</td></tr></table></div>`
    : `<div class="panel p-stake hidden" id="${mode}-stake-panel"><div class="panel-title pt-sequence" data-i18n="sequence">${t("sequence")}</div><table class="excel-table">
       <tr><td class="excel-row-label" data-i18n="wins">${t("wins")}</td><td class="excel-row-value stat-box win" id="${mode}-r-wins">0</td></tr>
       <tr><td class="excel-row-label" data-i18n="losses">${t("losses")}</td><td class="excel-row-value stat-box lose" id="${mode}-r-losses">0</td></tr></table></div>`;

  return `<div id="dashboard-${mode}" class="dashboard ${meta.theme} hidden">
    <div class="dash-topbar"><button class="back-btn" onclick="backToMenu('${mode}')">${t("back")}</button></div>
    <div class="dash-title">${meta.title}</div>
    <div class="panel p-settings"><div class="panel-title pt-settings" data-i18n="settings">${t("settings")}</div>
      <table class="excel-table">
        <tr><td class="excel-row-label" data-i18n="initialCapital">${t("initialCapital")}</td><td><input class="amber-cell" type="number" id="${mode}-capital" placeholder="${t("placeholderCapital")}" /></td></tr>
        <tr><td class="excel-row-label" data-i18n="totalEvents">${t("totalEvents")}</td><td><input class="amber-cell" type="number" id="${mode}-events" placeholder="${t("placeholderEvents")}" /></td></tr>
        <tr><td class="excel-row-label" data-i18n="requiredWins">${t("requiredWins")}</td><td><input class="amber-cell" type="number" id="${mode}-wins" placeholder="${t("placeholderWins")}" /></td></tr>
        <tr><td class="excel-row-label" data-i18n="payout">${t("payout")}</td><td><input class="amber-cell" type="number" step="0.01" id="${mode}-payout" placeholder="${t("placeholderPayout")}" /></td></tr>
        ${targetRow}
      </table><div class="dash-actions"><button class="btn-primary" id="${mode}-start-btn" onclick="startSession('${mode}')" data-i18n="calculate">${t("calculate")}</button></div>
    </div>
    <div class="panel p-results hidden" id="${mode}-results-panel"><div class="panel-title pt-results" data-i18n="calculatedTargets">${t("calculatedTargets")}</div><table class="excel-table">${resultsRows}</table></div>
    ${stakePanel}
    <div id="${mode}-end-banner"></div>
    <div class="event-table-wrap hidden" id="${mode}-table-wrap"><table class="event-table"><thead><tr>
      <th data-i18n="event">${t("event")}</th><th data-i18n="eventResult">${t("eventResult")}</th><th data-i18n="eventStake">${t("eventStake")}</th><th data-i18n="netPL">${t("netPL")}</th><th data-i18n="capitalAfter">${t("capitalAfter")}</th>
    </tr></thead><tbody id="${mode}-tbody"></tbody></table></div>
    <div class="win-loss-row hidden" id="${mode}-winloss-row">
      <button class="btn-win result-action" id="${mode}-win-btn" onclick="recordResult('${mode}', true)" data-i18n="won">${t("won")}</button>
      <button class="btn-lose result-action" id="${mode}-lose-btn" onclick="recordResult('${mode}', false)" data-i18n="lost">${t("lost")}</button>
      <button class="btn-undo hidden" id="${mode}-undo-btn" onclick="undoLastResult('${mode}')" data-i18n="undo">${t("undo")}</button>
    </div>
    <div class="dash-actions" style="padding-top:0;"><button class="btn-secondary" onclick="resetSession('${mode}')" data-i18n="reset">${t("reset")}</button></div>
  </div>`;
}

function rebuildDashboards() {
  const container = document.getElementById("dashboards-container");
  if (!container) return;
  container.innerHTML = buildDashboard("classic") + buildDashboard("double") + buildDashboard("triple");
}

document.addEventListener("DOMContentLoaded", rebuildDashboards);

function openDashboard(mode) {
  document.getElementById("mode-menu").classList.add("hidden");
  document.getElementById(`dashboard-${mode}`).classList.remove("hidden");
}
function backToMenu(mode) {
  document.getElementById(`dashboard-${mode}`).classList.add("hidden");
  document.getElementById("mode-menu").classList.remove("hidden");
}

async function startSession(mode) {
  const capital = parseFloat(el(mode, "capital").value);
  const totalEvents = parseInt(el(mode, "events").value, 10);
  const requiredWins = parseInt(el(mode, "wins").value, 10);
  const payout = parseFloat(el(mode, "payout").value);
  if (!capital || capital <= 0) return alert(t("invalidCapital"));
  if (!totalEvents || totalEvents < 1) return alert(t("invalidEvents"));
  if (!requiredWins || requiredWins < 1 || requiredWins > totalEvents) return alert(t("invalidWins"));
  if (!payout || payout <= 1) return alert(t("invalidPayout"));

  const session = { initialCapital: capital, capital, totalEvents, requiredWins, payout, eventsCompleted: 0, winsSoFar: 0, rows: [], history: [], lastResult: null, refreshing: false };
  if (MODE_META[mode].hasTarget) {
    const targetPct = parseFloat(el(mode, "target").value) / 100;
    if (isNaN(targetPct) || targetPct <= 0) return alert(t("invalidTarget"));
    session.targetPct = targetPct;
  }
  sessions[mode] = session;
  const button = el(mode, "start-btn");
  button.disabled = true;
  button.textContent = t("calculating");
  try {
    await refreshAll(mode);
    document.getElementById(`${mode}-results-panel`).classList.remove("hidden");
    document.getElementById(`${mode}-stake-panel`).classList.remove("hidden");
    document.getElementById(`${mode}-table-wrap`).classList.remove("hidden");
  } catch (e) { alert(t("errorPrefix") + e.message); }
  finally { button.disabled = false; button.textContent = t("calculate"); }
}

function makeCalcPayload(mode, s) {
  if (mode === "classic") return { mode: "classic", capital: s.capital, initialCapital: s.initialCapital, totalEvents: s.totalEvents, requiredWins: s.requiredWins, payout: s.payout, eventsCompleted: s.eventsCompleted, winsSoFar: s.winsSoFar, batch: true };
  return { mode: "masaniello", capital: s.capital, totalEvents: s.totalEvents, requiredWins: s.requiredWins, payout: s.payout, targetProfitPct: s.targetPct, initialCapital: s.initialCapital, eventsCompleted: s.eventsCompleted, winsSoFar: s.winsSoFar, legs: legsByMode[mode], batch: true };
}

async function refreshAll(mode) {
  const s = sessions[mode];
  if (!s || s.refreshing) return;
  s.refreshing = true;
  try {
    const data = await callCalcApi(makeCalcPayload(mode, s));
    const completedRows = s.rows.slice(0, s.eventsCompleted);
    s.rows = completedRows.concat((data.rows || []).map((row) => ({ event: row.event, result: null, stake: row.stake, netPL: null, capitalAfter: s.capital, isPreview: true, _apiStatus: row.status })));
    s.lastResult = data;
    updateSummary(mode, data);
    renderTable(mode);
    updateWinLossVisibility(mode, data);
  } finally { s.refreshing = false; }
}

function updateSummary(mode, result) {
  const s = sessions[mode];
  if (MODE_META[mode].hasTarget) {
    el(mode, "r-mult").textContent = Number(result.netMultiplier).toFixed(4);
    el(mode, "r-target").textContent = fmt(result.targetCapital);
    el(mode, "r-ratio").textContent = Number(result.requiredRatio).toFixed(6);
    el(mode, "r-feasible").innerHTML = result.feasible ? `<span class="feasible-badge yes">${t("feasible")}</span>` : `<span class="feasible-badge no">${t("notFeasible")}</span>`;
    const firstPreview = s.rows.find((row) => row.isPreview);
    el(mode, "r-firststake").textContent = fmt(firstPreview ? firstPreview.stake : result.stake);
    el(mode, "r-nextstake").textContent = fmt(result.stake);
  } else {
    el(mode, "r-target").textContent = fmt(result.targetCapital);
    el(mode, "r-mult").textContent = Number(result.resaPercent).toFixed(2) + "%";
    el(mode, "r-wins").textContent = s.winsSoFar;
    el(mode, "r-losses").textContent = s.eventsCompleted - s.winsSoFar;
  }
}

function updateWinLossVisibility(mode, result) {
  const s = sessions[mode];
  const row = document.getElementById(`${mode}-winloss-row`);
  const undo = document.getElementById(`${mode}-undo-btn`);
  const win = document.getElementById(`${mode}-win-btn`);
  const lose = document.getElementById(`${mode}-lose-btn`);
  const banner = document.getElementById(`${mode}-end-banner`);
  banner.innerHTML = "";
  undo.classList.toggle("hidden", s.history.length === 0);
  const status = result ? result.status : null;
  const ended = s.eventsCompleted >= s.totalEvents || s.capital <= 0;
  if (ended) {
    win.classList.add("hidden"); lose.classList.add("hidden");
    row.classList.toggle("hidden", s.history.length === 0);
    banner.innerHTML = `<div class="end-banner ${s.winsSoFar >= s.requiredWins ? "achieved" : "failed"}">${t("sessionEnded")} ৳${fmt(s.capital)}</div>`;
    return;
  }
  if (status === "TARGET_ACHIEVED" || status === "UNREACHABLE") {
    win.classList.add("hidden"); lose.classList.add("hidden");
    row.classList.toggle("hidden", s.history.length === 0);
    const text = status === "TARGET_ACHIEVED" ? t("targetAchieved") : t("unreachable");
    banner.innerHTML = `<div class="end-banner ${status === "TARGET_ACHIEVED" ? "achieved" : "failed"}">${text} ৳${fmt(s.capital)}</div>`;
    return;
  }
  win.classList.remove("hidden"); lose.classList.remove("hidden"); row.classList.remove("hidden");
}

function renderTable(mode) {
  const s = sessions[mode];
  const rowsHtml = s.rows.map((r, idx) => {
    const current = idx === s.eventsCompleted && !r.result;
    const cls = r.result === "W" ? "row-win" : r.result === "L" ? "row-lose" : (current ? "row-current row-preview" : "row-preview");
    const resultText = r.result ? (r.result === "W" ? t("won") : t("lost")) : (current ? "…" : "");
    const net = r.netPL === null ? "-" : (r.netPL >= 0 ? "৳" + fmt(r.netPL) : "-৳" + fmt(Math.abs(r.netPL)));
    return `<tr class="${cls}"><td>${r.event}</td><td>${resultText}</td><td>৳${fmt(r.stake)}</td><td>${net}</td><td>৳${fmt(r.capitalAfter)}</td></tr>`;
  }).join("");
  el(mode, "tbody").innerHTML = rowsHtml;
}

async function recordResult(mode, won) {
  const s = sessions[mode];
  if (!s || s.refreshing) return;
  const idx = s.eventsCompleted;
  const row = s.rows[idx];
  if (!row) return;

  s.history.push({ capital: s.capital, eventsCompleted: s.eventsCompleted, winsSoFar: s.winsSoFar, rows: s.rows.map((item) => ({ ...item })), lastResult: s.lastResult });
  const stake = row.stake || 0;
  if (won) {
    const effectivePayout = mode === "classic" ? s.payout : Math.pow(s.payout, legsByMode[mode]);
    row.netPL = stake * effectivePayout - stake;
    s.capital = s.capital - stake + stake * effectivePayout;
    s.winsSoFar += 1;
  } else {
    row.netPL = -stake;
    s.capital -= stake;
  }
  row.result = won ? "W" : "L";
  row.capitalAfter = s.capital;
  row.isPreview = false;
  s.eventsCompleted += 1;

  if (s.eventsCompleted >= s.totalEvents || s.capital <= 0) {
    renderTable(mode);
    updateSummaryFromState(mode);
    updateWinLossVisibility(mode, null);
    return;
  }
  try { await refreshAll(mode); } catch (e) { alert(t("errorPrefix") + e.message); }
}

function updateSummaryFromState(mode) {
  const s = sessions[mode];
  if (s.lastResult) updateSummary(mode, s.lastResult);
  else {
    el(mode, "r-wins").textContent = s.winsSoFar;
    el(mode, "r-losses").textContent = s.eventsCompleted - s.winsSoFar;
  }
}

function undoLastResult(mode) {
  const s = sessions[mode];
  if (!s || !s.history.length || s.refreshing) return;
  const previous = s.history.pop();
  s.capital = previous.capital;
  s.eventsCompleted = previous.eventsCompleted;
  s.winsSoFar = previous.winsSoFar;
  s.rows = previous.rows;
  s.lastResult = previous.lastResult;
  renderTable(mode);
  updateSummaryFromState(mode);
  updateWinLossVisibility(mode, s.lastResult);
}

function resetSession(mode) {
  sessions[mode] = null;
  document.getElementById(`${mode}-results-panel`).classList.add("hidden");
  document.getElementById(`${mode}-stake-panel`).classList.add("hidden");
  document.getElementById(`${mode}-table-wrap`).classList.add("hidden");
  document.getElementById(`${mode}-winloss-row`).classList.add("hidden");
  document.getElementById(`${mode}-end-banner`).innerHTML = "";
  el(mode, "tbody").innerHTML = "";
  ["capital", "events", "wins", "payout"].forEach((name) => { el(mode, name).value = ""; });
  if (MODE_META[mode].hasTarget) el(mode, "target").value = "";
}

function refreshVisibleLanguage() {
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
}
