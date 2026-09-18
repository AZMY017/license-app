// ==========================================================
// Netlify Function — স্টেক ফর্মুলা এখানে সার্ভার-সাইডে রাখা হয়েছে,
// যাতে ব্রাউজারে Inspect / View Source করে ফর্মুলা দেখা না যায়।
// ==========================================================

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "METHOD_NOT_ALLOWED" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "BAD_JSON" }) };
  }

  const { mode } = body;

  try {
    if (mode === "classic") {
      const { capital, targetCapital, winsLeft, odds } = body;

      if (!isPositive(capital) || !isPositive(targetCapital) || !isPositive(winsLeft) || !isPositiveGt1(odds)) {
        return badInput();
      }

      // মূল Masaniello ফর্মুলা:
      // r = এই ধাপে ক্যাপিটাল যতগুণ বাড়াতে হবে (জ্যামিতিক গড় হারে)
      const r = Math.pow(targetCapital / capital, 1 / winsLeft);
      let stake = (capital * (r - 1)) / (odds - 1);

      if (stake > capital) stake = capital;
      if (stake < 0) stake = 0;

      return ok({ stake });
    }

    if (mode === "multi") {
      const { capital, targetCapital, odds } = body;

      if (!isPositive(capital) || !isPositive(targetCapital) || !Array.isArray(odds) || odds.length < 2) {
        return badInput();
      }
      if (!odds.every(isPositiveGt1)) return badInput();

      const S = odds.reduce((sum, q) => sum + 1 / q, 0);
      if (S >= 1) {
        return { statusCode: 422, body: JSON.stringify({ error: "NO_EDGE" }) };
      }

      const r = targetCapital / capital; // এই রাউন্ডে ক্যাপিটাল যতগুণ বাড়ানোর টার্গেট
      const totalStake = (capital * (r - 1) * S) / (1 - S);
      const stakes = odds.map((q) => (capital * (r - 1) + totalStake) / q);
      const resultIfWin = odds.map((q, i) => capital - totalStake + stakes[i] * q);

      return ok({ stakes, totalStake, resultIfWin });
    }

    return badInput();
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "SERVER_ERROR" }) };
  }
};

function isPositive(n) {
  return typeof n === "number" && isFinite(n) && n > 0;
}
function isPositiveGt1(n) {
  return typeof n === "number" && isFinite(n) && n > 1;
}
function badInput() {
  return { statusCode: 400, body: JSON.stringify({ error: "BAD_INPUT" }) };
}
function ok(data) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  };
}
