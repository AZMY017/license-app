// ==========================================================
// ক্যালকুলেটর লজিক — Masaniello এবং Triple Chance
// ==========================================================

// ---------------- Masaniello State ----------------
let mState = null; // { capital, target, betsLeft, winsLeft, initialCapital }

/**
 * Masaniello সেশন শুরু করার ফাংশন
 */
function masanielloStart() {
  const capitalElem = document.getElementById("m-capital");
  const multiplierElem = document.getElementById("m-multiplier");
  const betsElem = document.getElementById("m-bets");
  const winsElem = document.getElementById("m-wins");

  if (!capitalElem || !multiplierElem || !betsElem || !winsElem) {
    return alert("প্রয়োজনীয় ইনপুট ফিল্ড খুঁজে পাওয়া যায়নি!");
  }

  const capital = parseFloat(capitalElem.value);
  const multiplier = parseFloat(multiplierElem.value);
  const totalBets = parseInt(betsElem.value, 10);
  const winsNeeded = parseInt(winsElem.value, 10);

  if (!capital || capital <= 0) return alert("সঠিক ক্যাপিটাল দিন।");
  if (!multiplier || multiplier <= 1) return alert("টার্গেট মাল্টিপ্লায়ার ১ এর বেশি হতে হবে (যেমন ২)।");
  if (!totalBets || totalBets < 1) return alert("মোট বেট সংখ্যা দিন।");
  if (!winsNeeded || winsNeeded < 1 || winsNeeded > totalBets)
    return alert("জয়ের সংখ্যা মোট বেটের সমান বা কম হতে হবে।");

  mState = {
    initialCapital: capital,
    capital: capital,
    target: capital * multiplier,
    betsLeft: totalBets,
    winsLeft: winsNeeded
  };

  const setupElem = document.getElementById("m-setup");
  const playElem = document.getElementById("m-play");

  if (setupElem) setupElem.style.display = "none";
  if (playElem) playElem.style.display = "block";

  renderMasanielloStatus();
}

/**
 * স্ট্যাটাস আপডেট রিঅ্যান্ডারিং
 */
function renderMasanielloStatus() {
  const statusElem = document.getElementById("m-status");
  const resultElem = document.getElementById("m-stake-result");

  if (statusElem) {
    statusElem.innerHTML = `
      বর্তমান ক্যাপিটাল: <b>${mState.capital.toFixed(2)}</b> |
      টার্গেট: <b>${mState.target.toFixed(2)}</b> |
      বাকি বেট: <b>${mState.betsLeft}</b> |
      বাকি জয় দরকার: <b>${mState.winsLeft}</b>
    `;
  }
  if (resultElem) resultElem.innerHTML = "";
}

/**
 * স্টেক (Stake) হিসাব করার ফাংশন
 */
function masanielloCalcStake() {
  const oddsElem = document.getElementById("m-odds");
  if (!oddsElem) return;

  const odds = parseFloat(oddsElem.value);
  if (!odds || odds <= 1) return alert("সঠিক অডস দিন (১ এর বেশি)।");
  if (!mState || mState.winsLeft <= 0 || mState.betsLeft <= 0) return;

  // r = এই ধাপে ক্যাপিটাল যতগুণ বাড়াতে হবে
  const r = Math.pow(mState.target / mState.capital, 1 / mState.winsLeft);
  let stake = (mState.capital * (r - 1)) / (odds - 1);

  // স্টেক কখনো বর্তমান ক্যাপিটালের বেশি হতে পারবে না
  if (stake > mState.capital) stake = mState.capital;
  if (stake < 0) stake = 0;

  mState._pendingStake = stake;
  mState._pendingOdds = odds;

  const resultElem = document.getElementById("m-stake-result");
  if (resultElem) {
    resultElem.innerHTML = `
      এই বেটে দিতে হবে: <b>${stake.toFixed(2)}</b> (অডস ${odds})<br>
      জিতলে ক্যাপিটাল হবে প্রায়: <b>${(mState.capital - stake + stake * odds).toFixed(2)}</b>
    `;
  }
}

/**
 * বেটের ফলাফল (Win / Loss) প্রসেস করার ফাংশন
 */
function masanielloResult(won) {
  if (!mState || mState._pendingStake === undefined) return alert("আগে স্টেক ক্যালকুলেট করুন।");

  const stake = mState._pendingStake;
  const odds = mState._pendingOdds;

  if (won) {
    mState.capital = mState.capital - stake + stake * odds;
    mState.winsLeft -= 1;
  } else {
    mState.capital = mState.capital - stake;
  }

  mState.betsLeft -= 1;
  delete mState._pendingStake;
  delete mState._pendingOdds;

  const oddsElem = document.getElementById("m-odds");
  if (oddsElem) oddsElem.value = "";

  const statusElem = document.getElementById("m-status");
  const resultElem = document.getElementById("m-stake-result");

  if (mState.winsLeft <= 0) {
    if (statusElem) {
      statusElem.innerHTML = `🎉 টার্গেট সম্পন্ন! ফাইনাল ক্যাপিটাল: <b>${mState.capital.toFixed(2)}</b>`;
    }
    if (resultElem) resultElem.innerHTML = "";
    return;
  }

  if (mState.betsLeft <= 0) {
    if (statusElem) {
      statusElem.innerHTML = `❌ বেট শেষ, টার্গেট পূরণ হয়নি। ফাইনাল ক্যাপিটাল: <b>${mState.capital.toFixed(2)}</b>`;
    }
    if (resultElem) resultElem.innerHTML = "";
    return;
  }

  renderMasanielloStatus();
}

/**
 * রিসেট করার ফাংশন
 */
function masanielloReset() {
  mState = null;
  const setupElem = document.getElementById("m-setup");
  const playElem = document.getElementById("m-play");

  if (setupElem) setupElem.style.display = "block";
  if (playElem) playElem.style.display = "none";
}

// ---------------- Triple Chance ----------------
/**
 * Triple Chance হিসাবের ফাংশন
 */
function tripleChanceCalc() {
  const capElem = document.getElementById("t-capital");
  const multElem = document.getElementById("t-multiplier");
  const o1Elem = document.getElementById("t-odds1");
  const o2Elem = document.getElementById("t-odds2");
  const o3Elem = document.getElementById("t-odds3");

  if (!capElem || !multElem || !o1Elem || !o2Elem) return;

  const capital = parseFloat(capElem.value);
  const multiplier = parseFloat(multElem.value);
  const o1 = parseFloat(o1Elem.value);
  const o2 = parseFloat(o2Elem.value);
  const o3raw = o3Elem ? o3Elem.value : null;
  const o3 = o3raw ? parseFloat(o3raw) : null;

  if (!capital || capital <= 0) return alert("সঠিক ক্যাপিটাল দিন।");
  if (!multiplier || multiplier <= 1) return alert("টার্গেট মাল্টিপ্লায়ার ১ এর বেশি হতে হবে।");
  if (!o1 || o1 <= 1 || !o2 || o2 <= 1) return alert("কমপক্ষে দুটি সঠিক অডস দিন।");

  const odds = [o1, o2];
  if (o3 && o3 > 1) odds.push(o3);

  const S = odds.reduce((sum, q) => sum + 1 / q, 0);

  const resultElem = document.getElementById("t-result");

  if (S >= 1) {
    if (resultElem) {
      resultElem.innerHTML = `
        ⚠️ এই অডস কম্বিনেশনে লাভের সুযোগ নেই (কভারেজ ${(S * 100).toFixed(1)}%)।
        অন্তত একটা অডস বাড়িয়ে আবার চেষ্টা করুন।
      `;
    }
    return;
  }

  const r = multiplier; // এই একবারের ধাপে যতগুণ ক্যাপিটাল বাড়ানোর টার্গেট
  const totalStake = (capital * (r - 1) * S) / (1 - S);
  const stakes = odds.map((q) => (capital * (r - 1) + totalStake) / q);

  let rows = "";
  odds.forEach((q, i) => {
    const resultIfWin = capital - totalStake + stakes[i] * q;
    rows += `<tr><td>সিলেকশন ${i + 1} (অডস ${q})</td><td>${stakes[i].toFixed(2)}</td><td>${resultIfWin.toFixed(2)}</td></tr>`;
  });

  if (resultElem) {
    resultElem.innerHTML = `
      মোট স্টেক: <b>${totalStake.toFixed(2)}</b> (ক্যাপিটালের ${((totalStake / capital) * 100).toFixed(1)}%)<br>
      <table class="t-table">
        <tr><th>সিলেকশন</th><th>স্টেক</th><th>জিতলে ফলাফল</th></tr>
        ${rows}
      </table>
      <p class="t-note">যেকোনো একটি সিলেকশন জিতলে ক্যাপিটাল প্রায় সমানভাবে বাড়বে। সবগুলো হারলে ক্যাপিটাল কমবে মোট স্টেক পরিমাণ।</p>
    `;
  }
}
