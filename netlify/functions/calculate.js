// ==========================================================
// Masaniello calculation engine
//
// Performance version:
// - The original recurrence formulas are preserved.
// - A batch request builds V/Y once and returns all preview rows
//   in a single Netlify Function response.
// - Single-result requests remain supported for compatibility.
// ==========================================================

// ---------- (1) Classic RS_X_101 engine ----------
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
        V[m][h] = 0;
      } else {
        const a = V[m + 1][h];
        const b = V[m + 1][h + 1];
        V[m][h] = (quota * a * b) / (a + (quota - 1) * b);
      }
    }
  }
  return V;
}

function calcClassicWithTable(params, V) {
  const {
    capital,
    initialCapital,
    totalEvents,
    requiredWins,
    payout,
    eventsCompleted,
    winsSoFar
  } = params;

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

function calcClassic(params) {
  const V = buildClassicTable(
    params.totalEvents,
    params.requiredWins,
    params.payout
  );
  return calcClassicWithTable(params, V);
}

// ---------- (2) Double/Triple Chance engine ----------
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

function calcMasanielloWithTable(params, Y) {
  const {
    capital,
    totalEvents,
    requiredWins,
    payout,
    targetProfitPct,
    initialCapital,
    eventsCompleted,
    winsSoFar,
    legs
  } = params;

  const m = Math.pow(payout, legs) - 1;
  const targetCapital = initialCapital * (1 + targetProfitPct);
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

function calcMasaniello(params) {
  const multiplier = Math.pow(params.payout, params.legs) - 1;
  const Y = buildYTable(
    params.totalEvents,
    params.requiredWins,
    multiplier
  );
  return calcMasanielloWithTable(params, Y);
}

function buildBatchRows(params, table) {
  const rows = [];
  for (let eventIndex = params.eventsCompleted; eventIndex < params.totalEvents; eventIndex++) {
    const result = params.mode === "classic"
      ? calcClassicWithTable({ ...params, eventsCompleted: eventIndex }, table)
      : calcMasanielloWithTable({ ...params, eventsCompleted: eventIndex }, table);

    rows.push({
      event: eventIndex + 1,
      stake: result.stake,
      status: result.status
    });
  }
  return rows;
}

function json(statusCode, headers, payload) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(payload)
  };
}

// ---------- HTTP handler ----------
exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store"
  };

  if (event.httpMethod === "OPTIONS") return json(200, headers, {});
  if (event.httpMethod !== "POST") {
    return json(405, headers, { error: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, headers, { error: "Invalid request" });
  }

  try {
    if (body.mode === "classic") {
      const params = {
        mode: "classic",
        capital: body.capital,
        initialCapital: body.initialCapital,
        totalEvents: body.totalEvents,
        requiredWins: body.requiredWins,
        payout: body.payout,
        eventsCompleted: body.eventsCompleted,
        winsSoFar: body.winsSoFar
      };

      if (
        !params.capital || !params.initialCapital || !params.totalEvents ||
        !params.requiredWins || !params.payout ||
        params.eventsCompleted === undefined || params.winsSoFar === undefined
      ) {
        return json(400, headers, { error: "Missing fields" });
      }
      if (params.totalEvents > 150 || params.requiredWins > 150) {
        return json(400, headers, { error: "N/K খুব বড়, ১৫০ এর মধ্যে দিন" });
      }

      const table = buildClassicTable(
        params.totalEvents,
        params.requiredWins,
        params.payout
      );
      const firstResult = calcClassicWithTable(params, table);

      if (body.batch) {
        return json(200, headers, {
          ...firstResult,
          rows: buildBatchRows(params, table)
        });
      }
      return json(200, headers, firstResult);
    }

    if (body.mode === "masaniello") {
      const params = {
        mode: "masaniello",
        capital: body.capital,
        totalEvents: body.totalEvents,
        requiredWins: body.requiredWins,
        payout: body.payout,
        targetProfitPct: body.targetProfitPct,
        initialCapital: body.initialCapital,
        eventsCompleted: body.eventsCompleted,
        winsSoFar: body.winsSoFar,
        legs: body.legs
      };

      if (
        !params.capital || !params.totalEvents || !params.requiredWins ||
        !params.payout || params.targetProfitPct === undefined ||
        !params.initialCapital || params.eventsCompleted === undefined ||
        params.winsSoFar === undefined || !params.legs
      ) {
        return json(400, headers, { error: "Missing fields" });
      }
      if (params.totalEvents > 200 || params.requiredWins > 200) {
        return json(400, headers, { error: "N/K খুব বড়, ২০০ এর মধ্যে দিন" });
      }

      const multiplier = Math.pow(params.payout, params.legs) - 1;
      const table = buildYTable(
        params.totalEvents,
        params.requiredWins,
        multiplier
      );
      const firstResult = calcMasanielloWithTable(params, table);

      if (body.batch) {
        return json(200, headers, {
          ...firstResult,
          rows: buildBatchRows(params, table)
        });
      }
      return json(200, headers, firstResult);
    }

    return json(400, headers, { error: "Unknown mode" });
  } catch (e) {
    return json(500, headers, { error: e.message });
  }
};
