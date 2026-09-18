// ==========================================================
// এই ফাইলে কোনো ফর্মুলা নেই — শুধু UI, সেশন স্টেট, আর সার্ভার
// (/api/calculate) থেকে স্টেক আনার লজিক। আসল ম্যাথ সবসময়
// netlify/functions/calculate.js এ থাকে, এখানে হাত দেওয়া হয়নি।
//
// প্রতিটা মোডের জন্য একটা Excel-স্টাইল ড্যাশবোর্ড তৈরি হয়:
//  - Classic         → লাল/কমলা থিম (theme-classic)
//  - Double / Triple  → নেভি ব্লু থিম (theme-navy), দুইটার ডিজাইন
//                       সম্পূর্ণ একই
//
// প্রিভিউ টেবিল কীভাবে বানানো হয়:
//   এখনো পর্যন্ত সম্পন্ন হওয়া ইভেন্টগুলার জন্য আসল ফলাফল দেখানো
//   হয়। বাকি (এখনো না-খেলা) ইভেন্টগুলার স্টেক দেখানো হয় বর্তমান
//   আসল ক্যাপিটাল ও winsSoFar স্থির রেখে শুধু ইভেন্ট-ইনডেক্স (m)
//   পরিবর্তন করে সার্ভারের একই ফর্মুলা কল করে — এটাই এক্সেল শীটের
//   "future rows" প্যাটার্নের সাথে যাচাই করে মিলিয়ে নেওয়া হয়েছে।
// ==========================================================

async function callCalcApi(payload) {
  const res = await fetch("/api/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "সার্ভার এরর হয়েছে");
  return data;
}

const MODE_META = {
  classic: { theme: "theme-classic", title: "CLASSIC MASANIELLO — DASHBOARD", hasTarget: false },
  double:  { theme: "theme-navy",    title: "DOUBLE CHANCE MASANIELLO — DASHBOARD", hasTarget: true },
  triple:  { theme: "theme-navy",    title: "TRIPLE CHANCE MASANIELLO — DASHBOARD", hasTarget: true }
};
const legsByMode = { double: 2, triple: 3 };

const sessions = { classic: null, double: null, triple: null };

function el(mode, name) {
  return document.getElementById(`${mode}-${name}`);
}

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return "-";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------- ড্যাশবোর্ড HTML তৈরি (একবারই, mode অনুযায়ী) ----------------
function buildDashboard(mode) {
  const meta = MODE_META[mode];
  const targetRow = meta.hasTarget
    ? `<tr>
         <td class="excel-row-label">Target Profit % (of Initial Capital)</td>
         <td><input class="amber-cell" type="number" step="0.1" id="${mode}-target" placeholder="যেমনঃ 1" /></td>
       </tr>`
    : `<tr><td colspan="2" style="font-size:0.75rem;color:#555;padding-top:2px;">এই মোডে টার্গেট নিজে থেকেই হিসাব হয় (N, K, Quota থেকে)।</td></tr>`;

  const resultsRows = meta.hasTarget
    ? `
      <tr><td class="excel-row-label">Net Multiplier per Successful Event</td><td class="excel-row-value" id="${mode}-r-mult">-</td></tr>
      <tr><td class="excel-row-label">Target Final Capital</td><td class="excel-row-value" id="${mode}-r-target">-</td></tr>
      <tr><td class="excel-row-label">Required Capital Ratio</td><td class="excel-row-value" id="${mode}-r-ratio">-</td></tr>
      <tr><td class="excel-row-label">Feasibility Check</td><td class="excel-row-value" id="${mode}-r-feasible">-</td></tr>
    `
    : `
      <tr><td class="excel-row-label">Capitale Finale (Target Final Capital)</td><td class="excel-row-value" id="${mode}-r-target">-</td></tr>
      <tr><td class="excel-row-label">Resa (Expected Return %)</td><td class="excel-row-value" id="${mode}-r-mult">-</td></tr>
    `;

  const stakePanel = meta.hasTarget
    ? `
      <div class="panel p-stake hidden" id="${mode}-stake-panel">
        <div class="panel-title pt-stake">🎯 AUTO STAKE</div>
        <table class="excel-table">
          <tr><td class="excel-row-label">Auto First Event Stake</td><td class="excel-row-value stat-box win" id="${mode}-r-firststake">-</td></tr>
          <tr><td class="excel-row-label">Next Event Stake</td><td class="excel-row-value stat-box win" id="${mode}-r-nextstake">-</td></tr>
        </table>
      </div>`
    : `
      <div class="panel p-stake hidden" id="${mode}-stake-panel">
        <div class="panel-title pt-sequence">🔁 SEQUENZA</div>
        <table class="excel-table">
          <tr><td class="excel-row-label">Eventi Vinti</td><td class="excel-row-value stat-box win" id="${mode}-r-wins">0</td></tr>
          <tr><td class="excel-row-label">Eventi Persi</td><td class="excel-row-value stat-box lose" id="${mode}-r-losses">0</td></tr>
        </table>
      </div>`;

  return `
  <div id="dashboard-${mode}" class="dashboard ${meta.theme} hidden">
    <div class="dash-topbar">
      <button class="back-btn" onclick="backToMenu('${mode}')">← মেনু</button>
    </div>

    <div class="dash-title">${meta.title}</div>

    <div class="panel p-settings">
      <div class="panel-title pt-settings">⚙ SETTINGS — শুধু হলুদ ঘরগুলো এডিট করুন</div>
      <table class="excel-table">
        <tr>
          <td class="excel-row-label">Initial Capital</td>
          <td><input class="amber-cell" type="number" id="${mode}-capital" placeholder="যেমনঃ 10000" /></td>
        </tr>
        <tr>
          <td class="excel-row-label">Total Events (N)</td>
          <td><input class="amber-cell" type="number" id="${mode}-events" placeholder="যেমনঃ 30" /></td>
        </tr>
        <tr>
          <td class="excel-row-label">Required Successful Events (K)</td>
          <td><input class="amber-cell" type="number" id="${mode}-wins" placeholder="যেমনঃ 5" /></td>
        </tr>
        <tr>
          <td class="excel-row-label">Payout / Quota (per leg, decimal odds)</td>
          <td><input class="amber-cell" type="number" step="0.01" id="${mode}-payout" placeholder="যেমনঃ 1.90" /></td>
        </tr>
        ${targetRow}
      </table>
      <div class="dash-actions">
        <button class="btn-primary" id="${mode}-start-btn" onclick="startSession('${mode}')">সেশন শুরু করুন / Calculate</button>
      </div>
    </div>

    <div class="panel p-results hidden" id="${mode}-results-panel">
      <div class="panel-title pt-results">⚠ CALCULATED TARGETS</div>
      <table class="excel-table">
        ${resultsRows}
      </table>
    </div>

    ${stakePanel}

    <div id="${mode}-end-banner"></div>

    <div class="event-table-wrap hidden" id="${mode}-table-wrap">
      <table class="event-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Event Result</th>
            <th>Event Stake</th>
            <th>Event Net Profit/Loss</th>
            <th>Main Capital After Event</th>
          </tr>
        </thead>
        <tbody id="${mode}-tbody"></tbody>
      </table>
    </div>

    <div class="win-loss-row hidden" id="${mode}-winloss-row">
      <button class="btn-win" onclick="recordResult('${mode}', true)">✅ জিতেছি</button>
      <button class="btn-lose" onclick="recordResult('${mode}', false)">❌ হেরেছি</button>
    </div>

    <div class="dash-actions" style="padding-top:0;">
      <button class="btn-secondary" onclick="resetSession('${mode}')">রিসেট / নতুন সেশন</button>
    </div>
  </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("dashboards-container");
  if (container) {
    container.innerHTML =
      buildDashboard("classic") + buildDashboard("double") + buildDashboard("triple");
  }
});

// ---------------- মেনু <-> ড্যাশবোর্ড নেভিগেশন ----------------
function openDashboard(mode) {
  document.getElementById("mode-menu").classList.add("hidden");
  document.getElementById(`dashboard-${mode}`).classList.remove("hidden");
}

function backToMenu(mode) {
  document.getElementById(`dashboard-${mode}`).classList.add("hidden");
  document.getElementById("mode-menu").classList.remove("hidden");
}

// ---------------- সেশন শুরু ----------------
async function startSession(mode) {
  const capital = parseFloat(el(mode, "capital").value);
  const totalEvents = parseInt(el(mode, "events").value, 10);
  const requiredWins = parseInt(el(mode, "wins").value, 10);
  const payout = parseFloat(el(mode, "payout").value);

  if (!capital || capital <= 0) return alert("সঠিক ক্যাপিটাল দিন।");
  if (!totalEvents || totalEvents < 1) return alert("মোট ইভেন্ট সংখ্যা দিন।");
  if (!requiredWins || requiredWins < 1 || requiredWins > totalEvents)
    return alert("জয়ের সংখ্যা মোট ইভেন্টের সমান বা কম হতে হবে।");
  if (!payout || payout <= 1) return alert("সঠিক পে-আউট দিন (১ এর বেশি)।");

  const session = {
    initialCapital: capital,
    capital,
    totalEvents,
    requiredWins,
    payout,
    eventsCompleted: 0,
    winsSoFar: 0,
    rows: [] // { event, result, stake, netPL, capitalAfter, isPreview }
  };

  if (MODE_META[mode].hasTarget) {
    const targetPct = parseFloat(el(mode, "target").value) / 100;
    if (isNaN(targetPct) || targetPct <= 0) return alert("সঠিক টার্গেট প্রফিট % দিন।");
    session.targetPct = targetPct;
  }

  sessions[mode] = session;

  el(mode, "start-btn").disabled = true;
  el(mode, "start-btn").textContent = "হিসাব করা হচ্ছে...";

  try {
    await refreshAll(mode);
    document.getElementById(`${mode}-results-panel`).classList.remove("hidden");
    document.getElementById(`${mode}-stake-panel`).classList.remove("hidden");
    document.getElementById(`${mode}-table-wrap`).classList.remove("hidden");
  } catch (e) {
    alert("এরর: " + e.message);
  } finally {
    el(mode, "start-btn").disabled = false;
    el(mode, "start-btn").textContent = "সেশন শুরু করুন / Calculate";
  }
}

// ---------------- একটা নির্দিষ্ট m (eventsCompleted) এর জন্য সার্ভার কল ----------------
async function calcForIndex(mode, s, eventsCompletedIdx) {
  if (mode === "classic") {
    return callCalcApi({
      mode: "classic",
      capital: s.capital,
      initialCapital: s.initialCapital,
      totalEvents: s.totalEvents,
      requiredWins: s.requiredWins,
      payout: s.payout,
      eventsCompleted: eventsCompletedIdx,
      winsSoFar: s.winsSoFar
    });
  }
  return callCalcApi({
    mode: "masaniello",
    capital: s.capital,
    totalEvents: s.totalEvents,
    requiredWins: s.requiredWins,
    payout: s.payout,
    targetProfitPct: s.targetPct,
    initialCapital: s.initialCapital,
    eventsCompleted: eventsCompletedIdx,
    winsSoFar: s.winsSoFar,
    legs: legsByMode[mode]
  });
}

// ---------------- টার্গেট প্যানেল + প্রিভিউ টেবিল রিফ্রেশ ----------------
async function refreshAll(mode) {
  const s = sessions[mode];
  if (!s) return;

  // eventsCompleted পর্যন্ত rows[] এ যা আছে (আসল ফলাফল) রাখা হবে,
  // তার পরের রো-গুলা নতুন করে প্রিভিউ হিসেবে বানানো হবে।
  s.rows = s.rows.slice(0, s.eventsCompleted);

  let firstResult = null;

  for (let m = s.eventsCompleted; m < s.totalEvents; m++) {
    const result = await calcForIndex(mode, s, m);
    if (m === s.eventsCompleted) firstResult = result;
    s.rows.push({
      event: m + 1,
      result: null,
      stake: result.stake,
      netPL: null,
      capitalAfter: s.capital,
      isPreview: true,
      _apiStatus: result.status
    });
  }

  if (firstResult) {
    // ---- টার্গেট প্যানেল আপডেট ----
    if (MODE_META[mode].hasTarget) {
      el(mode, "r-mult").textContent = firstResult.netMultiplier.toFixed(4);
      el(mode, "r-target").textContent = fmt(firstResult.targetCapital);
      el(mode, "r-ratio").textContent = firstResult.requiredRatio.toFixed(6);
      el(mode, "r-feasible").innerHTML = firstResult.feasible
        ? `<span class="feasible-badge yes">FEASIBLE ✓</span>`
        : `<span class="feasible-badge no">NOT FEASIBLE ✕</span>`;
      el(mode, "r-firststake").textContent = fmt(s.rows[0] ? s.rows[0].stake : firstResult.stake);
      el(mode, "r-nextstake").textContent = fmt(firstResult.stake);
    } else {
      el(mode, "r-target").textContent = fmt(firstResult.targetCapital);
      el(mode, "r-mult").textContent = firstResult.resaPercent.toFixed(2) + "%";
      el(mode, "r-wins").textContent = s.winsSoFar;
      el(mode, "r-losses").textContent = s.eventsCompleted - s.winsSoFar;
    }
  }

  renderTable(mode);
  updateWinLossVisibility(mode, firstResult);
}

function updateWinLossVisibility(mode, firstResult) {
  const s = sessions[mode];
  const winLossRow = document.getElementById(`${mode}-winloss-row`);
  const banner = document.getElementById(`${mode}-end-banner`);
  banner.innerHTML = "";

  const status = firstResult ? firstResult.status : null;

  if (s.eventsCompleted >= s.totalEvents || s.capital <= 0) {
    winLossRow.classList.add("hidden");
    banner.innerHTML = `<div class="end-banner ${s.winsSoFar >= s.requiredWins ? "achieved" : "failed"}">সেশন শেষ। ফাইনাল ক্যাপিটাল: ৳${fmt(s.capital)}</div>`;
    return;
  }
  if (status === "TARGET_ACHIEVED") {
    winLossRow.classList.add("hidden");
    banner.innerHTML = `<div class="end-banner achieved">🎉 টার্গেট অর্জিত হয়ে গেছে! বর্তমান ক্যাপিটাল: ৳${fmt(s.capital)}</div>`;
    return;
  }
  if (status === "UNREACHABLE") {
    winLossRow.classList.add("hidden");
    banner.innerHTML = `<div class="end-banner failed">❌ বাকি ইভেন্টে টার্গেট পূরণ আর সম্ভব না। বর্তমান ক্যাপিটাল: ৳${fmt(s.capital)}</div>`;
    return;
  }
  winLossRow.classList.remove("hidden");
}

// ---------------- টেবিল রেন্ডার ----------------
function renderTable(mode) {
  const s = sessions[mode];
  const tbody = el(mode, "tbody");
  const rowsHtml = s.rows.map((r, idx) => {
    const isCurrent = idx === s.eventsCompleted && !r.result;
    const cls = r.result === "W" ? "row-win" : r.result === "L" ? "row-lose" : (isCurrent ? "row-current row-preview" : "row-preview");
    const resultTxt = r.result ? r.result : (isCurrent ? "…" : "");
    const netPLTxt = r.netPL === null ? "-" : (r.netPL >= 0 ? "৳" + fmt(r.netPL) : "-৳" + fmt(Math.abs(r.netPL)));
    return `
      <tr class="${cls}">
        <td>${r.event}</td>
        <td>${resultTxt}</td>
        <td>৳${fmt(r.stake)}</td>
        <td>${netPLTxt}</td>
        <td>৳${fmt(r.capitalAfter)}</td>
      </tr>
    `;
  }).join("");
  tbody.innerHTML = rowsHtml;
}

// ---------------- ফলাফল রেকর্ড (জিতেছি / হেরেছি) ----------------
async function recordResult(mode, won) {
  const s = sessions[mode];
  if (!s) return;
  const idx = s.eventsCompleted;
  const row = s.rows[idx];
  if (!row) return;
  const stake = row.stake || 0;

  let netPL;
  if (won) {
    const effectivePayout = mode === "classic" ? s.payout : Math.pow(s.payout, legsByMode[mode]);
    netPL = stake * effectivePayout - stake;
    s.capital = s.capital - stake + stake * effectivePayout;
    s.winsSoFar += 1;
  } else {
    netPL = -stake;
    s.capital = s.capital - stake;
  }

  row.result = won ? "W" : "L";
  row.netPL = netPL;
  row.capitalAfter = s.capital;
  row.isPreview = false;

  s.eventsCompleted += 1;

  if (s.eventsCompleted >= s.totalEvents || s.capital <= 0) {
    renderTable(mode);
    updateWinLossVisibility(mode, null);
    if (!MODE_META[mode].hasTarget) {
      el(mode, "r-wins").textContent = s.winsSoFar;
      el(mode, "r-losses").textContent = s.eventsCompleted - s.winsSoFar;
    }
    return;
  }

  try {
    await refreshAll(mode);
  } catch (e) {
    alert("এরর: " + e.message);
  }
}

function resetSession(mode) {
  sessions[mode] = null;
  document.getElementById(`${mode}-results-panel`).classList.add("hidden");
  document.getElementById(`${mode}-stake-panel`).classList.add("hidden");
  document.getElementById(`${mode}-table-wrap`).classList.add("hidden");
  document.getElementById(`${mode}-winloss-row`).classList.add("hidden");
  document.getElementById(`${mode}-end-banner`).innerHTML = "";
  el(mode, "tbody").innerHTML = "";
  el(mode, "capital").value = "";
  el(mode, "events").value = "";
  el(mode, "wins").value = "";
  el(mode, "payout").value = "";
  if (MODE_META[mode].hasTarget && el(mode, "target")) el(mode, "target").value = "";
}
