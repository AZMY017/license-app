// ==========================================================
// 🔒 আসল Masaniello ইঞ্জিন — সম্পূর্ণ গোপন, সার্ভারে থাকে।
//
// দুইটা আলাদা পদ্ধতি আছে (দুই রকম আসল Excel ফাইল থেকে হুবহু
// ঘর-ধরে-ঘর মিলিয়ে বানানো)ঃ
//
// 1) "classic"    → RS_X_101_MM.xlsx এর আসল পদ্ধতি। এখানে কোনো
//                    Target% ইনপুট লাগে না — N, K, Quota থেকে
//                    টার্গেট নিজে থেকেই বের হয়।
// 2) "masaniello" → Double/Triple Chance Excel ফাইলের পদ্ধতি।
//                    এখানে ইউজার নিজে Target Profit % ইনপুট দেয়।
// ==========================================================

// ---------- (১) Classic RS_X_101 ইঞ্জিন ----------
function buildClassicTable(N, K, quota) {
  const V = [];
  for (let m = N; m >= 0; m--) {
    V[m] = [];
    for (let h = K; h >= 0; h--) {
      if (h === K) {
        V[m][h] = 1;
      } else if (K - h === N - m) {
        V[m][h] = Math.pow(quota, N - m);
      } else if (m === N) {
        V[m][h] = 0; // অসম্ভব অবস্থা (কোনো ইভেন্ট বাকি নেই কিন্তু জয় দরকার)
      } else {
        const a = V[m + 1][h];
        const b = V[m + 1][h + 1];
        V[m][h] = (quota * a * b) / (a + (quota - 1) * b);
      }
    }
  }
  return V;
}

function calcClassic(params) {
  const { capital, initialCapital, totalEvents, requiredWins, payout, eventsCompleted, winsSoFar } = params;
  const V = buildClassicTable(totalEvents, requiredWins, payout);

  const targetMultiplier = V[0][0];
  const targetCapital = initialCapital * targetMultiplier;

  const m = eventsCompleted + 1;
  const h = winsSoFar;

  let stake = 0;
  let status = "ON_TRACK";

  if (h >= requiredWins) {
    stake = 0;
    status = "TARGET_ACHIEVED";
  } else if (totalEvents - eventsCompleted < requiredWins - h) {
    stake = 0;
    status = "UNREACHABLE";
  } else if (totalEvents - eventsCompleted === requiredWins - h) {
    stake = capital;
    status = "ALL_IN";
  } else {
    const denom = V[m][h] + (payout - 1) * V[m][h + 1];
    const frac = 1 - (payout * V[m][h + 1]) / denom;
    stake = frac * capital;
  }

  return {
    stake: Math.max(0, stake),
    targetCapital,
    resaPercent: (targetMultiplier - 1) * 100,
    remainingEvents: totalEvents - eventsCompleted,
    winsStillNeeded: requiredWins - winsSoFar,
    status
  };
}

// ---------- (২) Double/Triple Chance ইঞ্জিন (আগের মতোই) ----------
function buildYTable(N, K, m) {
  const Y = [];
  for (let r = 0; r <= N; r++) {
    Y[r] = [];
    for (let k = 0; k <= K; k++) {
      if (k === 0) Y[r][k] = 1;
      else if (r < k) Y[r][k] = 0;
      else {
        const prevDiag = Y[r - 1][k - 1];
        const prevSame = r - 1 < k ? 0 : Y[r - 1][k];
        Y[r][k] = (prevDiag + m * prevSame) / (1 + m);
      }
    }
  }
  return Y;
}

function calcMasaniello(params) {
  const {
    capital, totalEvents, requiredWins, payout,
    targetProfitPct, initialCapital, eventsCompleted, winsSoFar, legs
  } = params;

  const m = Math.pow(payout, legs) - 1;
  const targetCapital = initialCapital * (1 + targetProfitPct);

  const Y = buildYTable(totalEvents, requiredWins, m);
  const requiredRatio = Y[totalEvents][requiredWins];
  const feasible = requiredRatio <= 1 / (1 + targetProfitPct);

  const r = totalEvents - eventsCompleted;
  const k = requiredWins - winsSoFar;

  let stake = 0;
  let status = "ON_TRACK";

  if (k <= 0) {
    stake = 0;
    status = "TARGET_ACHIEVED";
  } else if (r < k) {
    stake = 0;
    status = "UNREACHABLE";
  } else if (r === k) {
    stake = capital;
    status = "ALL_IN";
  } else {
    const f = 1 - Y[r - 1][k] / Y[r][k];
    stake = f * capital;
  }

  return {
    stake: Math.max(0, stake),
    targetCapital,
    requiredRatio,
    feasible,
    remainingEvents: r,
    winsStillNeeded: k,
    status,
    netMultiplier: m
  };
}

// ---------- HTTP হ্যান্ডলার ----------
exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request" }) };
  }

  try {
    if (body.mode === "classic") {
      const { capital, initialCapital, totalEvents, requiredWins, payout, eventsCompleted, winsSoFar } = body;
      if (!capital || !initialCapital || !totalEvents || !requiredWins || !payout || eventsCompleted === undefined || winsSoFar === undefined) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing fields" }) };
      }
      if (totalEvents > 150 || requiredWins > 150) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "N/K খুব বড়, ১৫০ এর মধ্যে দিন" }) };
      }
      const result = calcClassic({ capital, initialCapital, totalEvents, requiredWins, payout, eventsCompleted, winsSoFar });
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    if (body.mode === "masaniello") {
      const {
        capital, totalEvents, requiredWins, payout,
        targetProfitPct, initialCapital, eventsCompleted, winsSoFar, legs
      } = body;

      if (
        !capital || !totalEvents || !requiredWins || !payout ||
        targetProfitPct === undefined || !initialCapital ||
        eventsCompleted === undefined || winsSoFar === undefined || !legs
      ) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing fields" }) };
      }
      if (totalEvents > 200 || requiredWins > 200) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "N/K খুব বড়, ২০০ এর মধ্যে দিন" }) };
      }

      const result = calcMasaniello({
        capital, totalEvents, requiredWins, payout,
        targetProfitPct, initialCapital, eventsCompleted, winsSoFar, legs
      });

      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown mode" }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
