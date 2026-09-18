// ==========================================================
// এই ফাইলে কোনো ফর্মুলা নেই। শুধু সেশন স্টেট রাখা হয় (কয়টা
// ইভেন্ট হয়েছে, কয়টা জিতেছে) আর প্রতি ইভেন্টে সার্ভারকে
// জিজ্ঞেস করে পরবর্তী স্টেক আনা হয়।
// একই ইঞ্জিন তিনটা মোডেই ব্যবহার হয় — legs: 1/2/3
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

// প্রতিটা মোডের জন্য আলাদা সেশন স্টেট
const sessions = {
  classic: null,
  double: null,
  triple: null
};
const legsByMode = { classic: 1, double: 2, triple: 3 };
const labelByMode = {
  classic: "Classic Masaniello",
  double: "Double Chance Masaniello",
  triple: "Triple Chance Masaniello"
};

function el(mode, name) {
  return document.getElementById(`${mode}-${name}`);
}

// ইনপুট বক্স থেকে সেটিংস পড়ে + যাচাই করে; সমস্যা থাকলে null রিটার্ন করে
function readSettings(mode) {
  const capital = parseFloat(el(mode, "capital").value);
  const totalEvents = parseInt(el(mode, "events").value, 10);
  const requiredWins = parseInt(el(mode, "wins").value, 10);
  const payout = parseFloat(el(mode, "payout").value);
  const targetPct = parseFloat(el(mode, "target").value) / 100;

  if (!capital || capital <= 0) { alert("সঠিক ক্যাপিটাল দিন।"); return null; }
  if (!totalEvents || totalEvents < 1) { alert("মোট ইভেন্ট সংখ্যা দিন।"); return null; }
  if (!requiredWins || requiredWins < 1 || requiredWins > totalEvents) {
    alert("জয়ের সংখ্যা মোট ইভেন্টের সমান বা কম হতে হবে।"); return null;
  }
  if (!payout || payout <= 1) { alert("সঠিক পে-আউট দিন (১ এর বেশি)।"); return null; }
  if (isNaN(targetPct) || targetPct <= 0) { alert("সঠিক টার্গেট প্রফিট % দিন।"); return null; }

  return { capital, totalEvents, requiredWins, payout, targetPct };
}

// সেশন শুরুর আগে প্রিভিউ (Calculated Targets + Auto Stake) দেখায়
async function previewCalc(mode) {
  const settings = readSettings(mode);
  if (!settings) return;

  const previewBox = el(mode, "preview");
  el(mode, "calc-warning").innerHTML = "";
  previewBox.classList.remove("hidden");
  el(mode, "calc-multiplier").textContent = "হিসাব হচ্ছে...";

  try {
    const result = await callCalcApi({
      mode: "masaniello",
      capital: settings.capital,
      totalEvents: settings.totalEvents,
      requiredWins: settings.requiredWins,
      payout: settings.payout,
      targetProfitPct: settings.targetPct,
      initialCapital: settings.capital,
      eventsCompleted: 0,
      winsSoFar: 0,
      legs: legsByMode[mode]
    });

    el(mode, "calc-multiplier").textContent = result.netMultiplier.toFixed(4);
    el(mode, "calc-target").textContent = "৳" + result.targetCapital.toFixed(2);

    const feasBox = el(mode, "calc-feasibility");
    feasBox.textContent = result.feasible ? "FEASIBLE ✓" : "NOT FEASIBLE ✗";
    feasBox.className = result.feasible ? "feasible-yes" : "feasible-no";

    el(mode, "calc-stake").textContent = "৳" + result.stake.toFixed(2);

    if (!result.feasible) {
      el(mode, "calc-warning").innerHTML =
        `<div class="warn-box">⚠️ এই সেটিংসে টার্গেট গ্যারান্টি করা সম্ভব না। Total Events / Wins / Payout বাড়ান অথবা Target % কমান।</div>`;
    }
  } catch (e) {
    el(mode, "calc-multiplier").textContent = "-";
    el(mode, "calc-warning").innerHTML = `<div class="warn-box">এরর: ${e.message}</div>`;
  }
}

async function startSession(mode) {
  const settings = readSettings(mode);
  if (!settings) return;
  const { capital, totalEvents, requiredWins, payout, targetPct } = settings;

  sessions[mode] = {
    initialCapital: capital,
    capital,
    totalEvents,
    requiredWins,
    payout,
    targetPct,
    eventsCompleted: 0,
    winsSoFar: 0
  };

  el(mode, "setup").classList.add("hidden");
  el(mode, "play").classList.remove("hidden");
  await refreshStake(mode);
}

async function refreshStake(mode) {
  const s = sessions[mode];
  const statusBox = el(mode, "status");
  statusBox.innerHTML = "হিসাব করা হচ্ছে...";

  try {
    const result = await callCalcApi({
      mode: "masaniello",
      capital: s.capital,
      totalEvents: s.totalEvents,
      requiredWins: s.requiredWins,
      payout: s.payout,
      targetProfitPct: s.targetPct,
      initialCapital: s.initialCapital,
      eventsCompleted: s.eventsCompleted,
      winsSoFar: s.winsSoFar,
      legs: legsByMode[mode]
    });

    s._pendingStake = result.stake;

    if (!result.feasible) {
      statusBox.innerHTML = `⚠️ এই সেটিংসে টার্গেট গ্যারান্টি করা সম্ভব না (Total Events / Wins / Payout বাড়ান বা Target % কমান)।`;
    }

    if (result.status === "TARGET_ACHIEVED") {
      statusBox.innerHTML += `<br>🎉 টার্গেট অর্জিত হয়ে গেছে! আর স্টেক দরকার নেই। বর্তমান ক্যাপিটাল: <b>৳${s.capital.toFixed(2)}</b>`;
      el(mode, "event-controls").classList.add("hidden");
      return;
    }
    if (result.status === "UNREACHABLE") {
      statusBox.innerHTML += `<br>❌ বাকি ইভেন্টে টার্গেট পূরণ আর সম্ভব না। বর্তমান ক্যাপিটাল: <b>৳${s.capital.toFixed(2)}</b>`;
      el(mode, "event-controls").classList.add("hidden");
      return;
    }

    el(mode, "event-controls").classList.remove("hidden");
    statusBox.innerHTML = `
      ইভেন্ট: <b>${s.eventsCompleted + 1} / ${s.totalEvents}</b> |
      বাকি জয় দরকার: <b>${result.winsStillNeeded}</b> |
      বর্তমান ক্যাপিটাল: <b>৳${s.capital.toFixed(2)}</b><br>
      টার্গেট ক্যাপিটাল: <b>৳${result.targetCapital.toFixed(2)}</b><br>
      <span style="font-size:1.1rem;">এই ইভেন্টে স্টেক দিন: <b>৳${result.stake.toFixed(2)}</b></span>
    `;
  } catch (e) {
    statusBox.innerHTML = `<span style="color:#ef4444">এরর: ${e.message}</span>`;
  }
}

async function recordResult(mode, won) {
  const s = sessions[mode];
  const stake = s._pendingStake || 0;

  if (won) {
    const m = Math.pow(s.payout, legsByMode[mode]) - 1;
    s.capital = s.capital - stake + stake * (1 + m);
    s.winsSoFar += 1;
  } else {
    s.capital = s.capital - stake;
  }
  s.eventsCompleted += 1;

  if (s.eventsCompleted >= s.totalEvents || s.capital <= 0) {
    el(mode, "status").innerHTML = `সেশন শেষ। ফাইনাল ক্যাপিটাল: <b>৳${s.capital.toFixed(2)}</b>`;
    el(mode, "event-controls").classList.add("hidden");
    return;
  }
  await refreshStake(mode);
}

function resetSession(mode) {
  sessions[mode] = null;
  el(mode, "setup").classList.remove("hidden");
  el(mode, "preview").classList.add("hidden");
  el(mode, "calc-warning").innerHTML = "";
  el(mode, "play").classList.add("hidden");
  el(mode, "event-controls").classList.remove("hidden");
}

// ---------------- ট্যাব সুইচিং ----------------
function switchMode(mode) {
  ["classic", "double", "triple"].forEach((m) => {
    document.getElementById(`panel-${m}`).classList.toggle("hidden", m !== mode);
    document.getElementById(`tab-${m}`).classList.toggle("active", m === mode);
  });
}
