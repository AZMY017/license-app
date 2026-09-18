// ==========================================================
// ক্যালকুলেটর লজিক — Masaniello এবং Triple/Double Chance
// স্টেক ফর্মুলা এখন ক্লায়েন্টে নেই, Netlify Function থেকে হিসাব হয়ে আসে
// ==========================================================

const CALC_ENDPOINT = "/.netlify/functions/calculate-stake";

// ---------------- ট্যাব সুইচিং ----------------
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      document.getElementById("masaniello-tab").classList.toggle("hidden", tab !== "masaniello");
      document.getElementById("triple-tab").classList.toggle("hidden", tab !== "triple");
    });
  });

  const savedKey = localStorage.getItem("active_license");
  if (savedKey) {
    document.getElementById("lock-screen").classList.add("hidden");
    document.getElementById("app-screen").classList.remove("hidden");
  }
});

// ---------------- ইউনিক ডিভাইস আইডি ----------------
function getDeviceId() {
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = "DEV-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    localStorage.setItem("device_id", deviceId);
  }
  return deviceId;
}

// ---------------- লাইসেন্স ভ্যালিডেশন (transaction-safe) ----------------
async function verifyLicense() {
  const key = document.getElementById("license-input").value.trim();
  const msg = document.getElementById("license-msg");
  const currentDeviceId = getDeviceId();

  if (!key) {
    msg.className = "error-msg";
    msg.innerText = "অনুগ্রহ করে লাইসেন্স কী টাইপ করুন!";
    return;
  }

  msg.className = "";
  msg.innerText = "যাচাই করা হচ্ছে...";

  const docRef = db.collection("licenses").doc(key);

  try {
    // runTransaction ব্যবহার করা হয়েছে যাতে দুইজন একই মুহূর্তে একই কী দিয়ে
    // চেষ্টা করলেও race condition না হয় (get + update আলাদাভাবে করলে যে ঝুঁকি ছিল)
    await db.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      if (!doc.exists) throw new Error("NOT_FOUND");

      const data = doc.data();
      if (data.status === "unused") {
        t.update(docRef, { status: "used", device_id: currentDeviceId });
      } else if (data.status === "used" && data.device_id === currentDeviceId) {
        // এই ডিভাইসেই আগে অ্যাক্টিভ হয়েছিল, সমস্যা নেই
      } else {
        throw new Error("DEVICE_MISMATCH");
      }
    });

    localStorage.setItem("active_license", key);
    msg.className = "success-msg";
    msg.innerText = "লাইসেন্স সফলভাবে অ্যাক্টিভ হয়েছে!";
    setTimeout(() => {
      document.getElementById("lock-screen").classList.add("hidden");
      document.getElementById("app-screen").classList.remove("hidden");
    }, 800);

  } catch (err) {
    msg.className = "error-msg";
    if (err.message === "NOT_FOUND") {
      msg.innerText = "ভুল লাইসেন্স কী!";
    } else if (err.message === "DEVICE_MISMATCH") {
      msg.innerText = "এই লাইসেন্স কী-টি অন্য ডিভাইসে ব্যবহৃত হচ্ছে!";
    } else {
      console.error(err);
      msg.innerText = "ত্রুটি ঘটেছে! ইন্টারনেট চেক করুন বা সিকিউরিটি রুলস যাচাই করুন।";
    }
  }
}

// ---------------- Masaniello State ----------------
let mState = null; // { capital, target, betsLeft, winsLeft, initialCapital }

function masanielloStart() {
  const capital = parseFloat(document.getElementById("m-capital").value);
  const multiplier = parseFloat(document.getElementById("m-multiplier").value);
  const totalBets = parseInt(document.getElementById("m-bets").value, 10);
  const winsNeeded = parseInt(document.getElementById("m-wins").value, 10);

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

  document.getElementById("m-setup").classList.add("hidden");
  document.getElementById("m-play").classList.remove("hidden");
  renderMasanielloStatus();
}

function renderMasanielloStatus() {
  document.getElementById("m-status").innerHTML = `
    বর্তমান ক্যাপিটাল: <b>${mState.capital.toFixed(2)}</b> |
    টার্গেট: <b>${mState.target.toFixed(2)}</b> |
    বাকি বেট: <b>${mState.betsLeft}</b> |
    বাকি জয় দরকার: <b>${mState.winsLeft}</b>
  `;
  document.getElementById("m-stake-result").innerHTML = "";
}

async function masanielloCalcStake() {
  const odds = parseFloat(document.getElementById("m-odds").value);
  if (!odds || odds <= 1) return alert("সঠিক অডস দিন (১ এর বেশি)।");
  if (!mState || mState.winsLeft <= 0 || mState.betsLeft <= 0) return;

  const resultElem = document.getElementById("m-stake-result");
  resultElem.innerHTML = "হিসাব করা হচ্ছে...";

  try {
    const res = await fetch(CALC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "classic",
        capital: mState.capital,
        targetCapital: mState.target,
        winsLeft: mState.winsLeft,
        odds
      })
    });
    if (!res.ok) throw new Error("server error");
    const data = await res.json();

    mState._pendingStake = data.stake;
    mState._pendingOdds = odds;

    resultElem.innerHTML = `
      এই বেটে দিতে হবে: <b>${data.stake.toFixed(2)}</b> (অডস ${odds})<br>
      জিতলে ক্যাপিটাল হবে প্রায়: <b>${(mState.capital - data.stake + data.stake * odds).toFixed(2)}</b>
    `;
  } catch (err) {
    console.error(err);
    resultElem.innerHTML = "স্টেক হিসাব করা যায়নি। ইন্টারনেট/সার্ভার চেক করুন।";
  }
}

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
  document.getElementById("m-odds").value = "";

  if (mState.winsLeft <= 0) {
    document.getElementById("m-status").innerHTML = `🎉 টার্গেট সম্পন্ন! ফাইনাল ক্যাপিটাল: <b>${mState.capital.toFixed(2)}</b>`;
    document.getElementById("m-stake-result").innerHTML = "";
    return;
  }
  if (mState.betsLeft <= 0) {
    document.getElementById("m-status").innerHTML = `❌ বেট শেষ, টার্গেট পূরণ হয়নি। ফাইনাল ক্যাপিটাল: <b>${mState.capital.toFixed(2)}</b>`;
    document.getElementById("m-stake-result").innerHTML = "";
    return;
  }
  renderMasanielloStatus();
}

function masanielloReset() {
  mState = null;
  document.getElementById("m-setup").classList.remove("hidden");
  document.getElementById("m-play").classList.add("hidden");
}

// ---------------- Triple / Double Chance ----------------
async function tripleChanceCalc() {
  const capital = parseFloat(document.getElementById("t-capital").value);
  const multiplier = parseFloat(document.getElementById("t-multiplier").value);
  const o1 = parseFloat(document.getElementById("t-odds1").value);
  const o2 = parseFloat(document.getElementById("t-odds2").value);
  const o3raw = document.getElementById("t-odds3").value;
  const o3 = o3raw ? parseFloat(o3raw) : null;

  if (!capital || capital <= 0) return alert("সঠিক ক্যাপিটাল দিন।");
  if (!multiplier || multiplier <= 1) return alert("টার্গেট মাল্টিপ্লায়ার ১ এর বেশি হতে হবে।");
  if (!o1 || o1 <= 1 || !o2 || o2 <= 1) return alert("কমপক্ষে দুটি সঠিক অডস দিন।");

  const odds = [o1, o2];
  if (o3 && o3 > 1) odds.push(o3);

  const resultElem = document.getElementById("t-result");
  resultElem.innerHTML = "হিসাব করা হচ্ছে...";

  try {
    const res = await fetch(CALC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "multi",
        capital,
        targetCapital: capital * multiplier,
        odds
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (errData.error === "NO_EDGE") {
        resultElem.innerHTML = `⚠️ এই অডস কম্বিনেশনে লাভের সুযোগ নেই। অন্তত একটা অডস বাড়িয়ে আবার চেষ্টা করুন।`;
        return;
      }
      throw new Error(errData.error || "server error");
    }
    const data = await res.json();

    let rows = "";
    odds.forEach((q, i) => {
      rows += `<tr><td>সিলেকশন ${i + 1} (অডস ${q})</td><td>${data.stakes[i].toFixed(2)}</td><td>${data.resultIfWin[i].toFixed(2)}</td></tr>`;
    });

    resultElem.innerHTML = `
      মোট স্টেক: <b>${data.totalStake.toFixed(2)}</b> (ক্যাপিটালের ${((data.totalStake / capital) * 100).toFixed(1)}%)<br>
      <table class="t-table">
        <tr><th>সিলেকশন</th><th>স্টেক</th><th>জিতলে ফলাফল</th></tr>
        ${rows}
      </table>
      <p class="t-note">যেকোনো একটি সিলেকশন জিতলে ক্যাপিটাল প্রায় সমানভাবে বাড়বে। সবগুলো হারলে ক্যাপিটাল কমবে মোট স্টেক পরিমাণ।</p>
    `;
  } catch (err) {
    console.error(err);
    resultElem.innerHTML = "স্টেক হিসাব করা যায়নি। ইন্টারনেট/সার্ভার চেক করুন।";
  }
}
