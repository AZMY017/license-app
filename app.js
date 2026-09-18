// ==========================================================
// এই ফাইলে কোনো ফর্মুলা নেই। শুধু সেশন স্টেট রাখা হয় আর
// সার্ভারকে জিজ্ঞেস করে পরবর্তী স্টেক আনা হয়।
//
// Classic মোড RS_X_101 এর আসল পদ্ধতি ব্যবহার করে (Target%
// ইনপুট লাগে না, N/K/Quota থেকে অটো-হিসাব)।
// Double ও Triple Chance মোড ব্যবহারকারীর দেওয়া Target% থেকে
// হিসাব করে (তাদের নিজস্ব Excel ফাইল অনুযায়ী)।
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

const sessions = { classic: null, double: null, triple: null };
const legsByMode = { double: 2, triple: 3 };

function el(mode, name) {
  return document.getElementById(`${mode}-${name}`);
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
    winsSoFar: 0
  };

  if (mode !== "classic") {
    const targetPct = parseFloat(el(mode, "target").value) / 100;
    if (isNaN(targetPct) || targetPct <= 0) return alert("সঠিক টার্গেট প্রফিট % দিন।");
    session.targetPct = targetPct;
  }

  sessions[mode] = session;

  el(mode, "setup").classList.add("hidden");
  el(mode, "play").classList.remove("hidden");
  await refreshStake(mode);
}

// ---------------- সার্ভার থেকে পরবর্তী স্টেক আনা ----------------
async function refreshStake(mode) {
  const s = sessions[mode];
  const statusBox = el(mode, "status");
  statusBox.innerHTML = "হিসাব করা হচ্ছে...";

  try {
    let payload;
    if (mode === "classic") {
      payload = {
        mode: "classic",
        capital: s.capital,
        initialCapital: s.initialCapital,
        totalEvents: s.totalEvents,
        requiredWins: s.requiredWins,
        payout: s.payout,
        eventsCompleted: s.eventsCompleted,
        winsSoFar: s.winsSoFar
      };
    } else {
      payload = {
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
      };
    }

    const result = await callCalcApi(payload);
    s._pendingStake = result.stake;

    if (result.feasible === false) {
      statusBox.innerHTML = `⚠️ এই সেটিংসে টার্গেট গ্যারান্টি করা সম্ভব না (Total Events / Wins / Payout বাড়ান বা Target % কমান)।`;
    }

    if (result.status === "TARGET_ACHIEVED") {
      statusBox.innerHTML += `<br>🎉 টার্গেট অর্জিত হয়ে গেছে! বর্তমান ক্যাপিটাল: <b>${s.capital.toFixed(2)}</b>`;
      el(mode, "event-controls").classList.add("hidden");
      return;
    }
    if (result.status === "UNREACHABLE") {
      statusBox.innerHTML += `<br>❌ বাকি ইভেন্টে টার্গেট পূরণ আর সম্ভব না। বর্তমান ক্যাপিটাল: <b>${s.capital.toFixed(2)}</b>`;
      el(mode, "event-controls").classList.add("hidden");
      return;
    }

    el(mode, "event-controls").classList.remove("hidden");

    const resaLine =
      mode === "classic"
        ? `প্রত্যাশিত রিটার্ন (Resa): <b>${result.resaPercent.toFixed(2)}%</b><br>`
        : "";

    statusBox.innerHTML = `
      ইভেন্ট: <b>${s.eventsCompleted + 1} / ${s.totalEvents}</b> |
      বাকি জয় দরকার: <b>${result.winsStillNeeded}</b> |
      বর্তমান ক্যাপিটাল: <b>${s.capital.toFixed(2)}</b><br>
      টার্গেট ক্যাপিটাল: <b>${result.targetCapital.toFixed(2)}</b><br>
      ${resaLine}
      <span style="font-size:1.1rem;">এই ইভেন্টে স্টেক দিন: <b>${result.stake.toFixed(2)}</b></span>
    `;
  } catch (e) {
    statusBox.innerHTML = `<span style="color:#ef4444">এরর: ${e.message}</span>`;
  }
}

// ---------------- ফলাফল রেকর্ড ----------------
async function recordResult(mode, won) {
  const s = sessions[mode];
  const stake = s._pendingStake || 0;

  if (won) {
    const effectivePayout = mode === "classic" ? s.payout : Math.pow(s.payout, legsByMode[mode]);
    s.capital = s.capital - stake + stake * effectivePayout;
    s.winsSoFar += 1;
  } else {
    s.capital = s.capital - stake;
  }
  s.eventsCompleted += 1;

  if (s.eventsCompleted >= s.totalEvents || s.capital <= 0) {
    el(mode, "status").innerHTML = `সেশন শেষ। ফাইনাল ক্যাপিটাল: <b>${s.capital.toFixed(2)}</b>`;
    el(mode, "event-controls").classList.add("hidden");
    return;
  }
  await refreshStake(mode);
}

function resetSession(mode) {
  sessions[mode] = null;
  el(mode, "setup").classList.remove("hidden");
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
