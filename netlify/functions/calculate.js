// ==========================================================
// 🔒 আসল স্টেক ফর্মুলা — এই ফাইলটাই একমাত্র জায়গা যেখানে হিসাব
// হয়। ব্রাউজার থেকে View Source/Inspect করলেও এই কোড দেখা যাবে
// না, কারণ এটা সার্ভারে (Netlify Function) চলে, ক্লায়েন্টে না।
//
// ফর্মুলা (লিনিয়ার-রিকভারি masaniello):
//   Net Multiplier (m)   = payout ^ legs − 1
//   Target Final Capital = initialCapital × (1 + targetProfitPct)
//   Wins Still Needed    = requiredWins − winsSoFar
//   Stake                = (targetCapital − currentCapital) ÷ (winsStillNeeded × m)
//
// এটা বাকি সব প্রয়োজনীয় জয়ের মধ্যে সমান ভাগে প্রফিট বণ্টন করে,
// তাই স্টেক হঠাৎ অস্বাভাবিকভাবে বেড়ে যায় না।
// ==========================================================

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "শুধু POST রিকোয়েস্ট গ্রহণযোগ্য।" })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "রিকোয়েস্ট ফরম্যাট ঠিক নেই।" }) };
  }

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
  } = body;

  // ---------- ইনপুট যাচাই ----------
  const nums = { capital, totalEvents, requiredWins, payout, targetProfitPct, initialCapital, eventsCompleted, winsSoFar, legs };
  for (const [k, v] of Object.entries(nums)) {
    if (typeof v !== "number" || Number.isNaN(v)) {
      return { statusCode: 400, body: JSON.stringify({ error: `ইনপুট "${k}" সঠিক নয়।` }) };
    }
  }
  if (payout <= 1) {
    return { statusCode: 400, body: JSON.stringify({ error: "পে-আউট অবশ্যই ১ এর বেশি হতে হবে।" }) };
  }
  if (![1, 2, 3].includes(legs)) {
    return { statusCode: 400, body: JSON.stringify({ error: "legs শুধু 1, 2 বা 3 হতে পারে।" }) };
  }
  if (totalEvents < 1 || requiredWins < 1 || requiredWins > totalEvents) {
    return { statusCode: 400, body: JSON.stringify({ error: "Total Events / Required Wins সঠিক নয়।" }) };
  }

  // ---------- মূল হিসাব ----------
  const netMultiplier = Math.pow(payout, legs) - 1;
  const targetCapital = initialCapital * (1 + targetProfitPct);
  const winsStillNeeded = requiredWins - winsSoFar;
  const eventsRemaining = totalEvents - eventsCompleted;

  let status = "IN_PROGRESS";
  let feasible = true;
  let stake = 0;

  if (capital <= 0) {
    status = "UNREACHABLE";
    feasible = false;
  } else if (winsStillNeeded <= 0 || capital >= targetCapital) {
    status = "TARGET_ACHIEVED";
    feasible = true;
  } else if (winsStillNeeded > eventsRemaining) {
    // বাকি ইভেন্টের চেয়ে বেশি জয় দরকার — সম্ভব না
    status = "UNREACHABLE";
    feasible = false;
  } else if (netMultiplier <= 0) {
    // পে-আউট এমন কম যে জিতলেও লাভ হয় না
    status = "IN_PROGRESS";
    feasible = false;
  } else {
    stake = (targetCapital - capital) / (winsStillNeeded * netMultiplier);
    if (stake <= 0) {
      status = "TARGET_ACHIEVED";
      feasible = true;
      stake = 0;
    } else if (stake > capital) {
      // পুরো ক্যাপিটাল দিয়েও টার্গেটে পৌঁছানো টাইট/অসম্ভব — সতর্ক করা হচ্ছে
      feasible = false;
      stake = Math.min(stake, capital);
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      feasible,
      stake: Number(stake.toFixed(2)),
      targetCapital: Number(targetCapital.toFixed(2)),
      winsStillNeeded: Math.max(winsStillNeeded, 0),
      netMultiplier: Number(netMultiplier.toFixed(4))
    })
  };
};

