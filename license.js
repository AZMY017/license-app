// ==========================================================
// লাইসেন্স + ডিভাইস লক সিস্টেম
// এই ফাইলে হাত দেওয়ার দরকার নেই — এটা এমনিতেই কাজ করবে,
// যদি firebase-config.js ঠিকভাবে পূরণ করা থাকে।
// ==========================================================

const LS_DEVICE_TOKEN_KEY = "masaniello_device_token_v1";
const LS_ACTIVE_LICENSE_KEY = "masaniello_active_license_v1";

// প্রতিটা ডিভাইসের জন্য একবারই তৈরি হবে এমন র‍্যান্ডম টোকেন
function getOrCreateDeviceToken() {
  let token = localStorage.getItem(LS_DEVICE_TOKEN_KEY);
  if (!token) {
    token =
      "dev_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 12);
    localStorage.setItem(LS_DEVICE_TOKEN_KEY, token);
  }
  return token;
}

// ডিভাইস সম্পর্কে একটু তথ্য (অ্যাডমিন প্যানেলে দেখানোর জন্য, শুধু তথ্যের জন্য)
function getDeviceInfo() {
  return {
    ua: navigator.userAgent,
    lang: navigator.language,
    screen: `${screen.width}x${screen.height}`,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown"
  };
}

// পেজ লোড হওয়ার সাথে সাথেই চেক করবে — এই ডিভাইসে আগে থেকেই
// কোনো সক্রিয় লাইসেন্স সেভ করা আছে কিনা
async function checkExistingActivation() {
  const savedKey = localStorage.getItem(LS_ACTIVE_LICENSE_KEY);
  if (!savedKey) return { active: false };

  try {
    const doc = await db.collection("licenses").doc(savedKey).get();
    if (!doc.exists) return { active: false };
    const data = doc.data();
    const myDevice = getOrCreateDeviceToken();
    if (data.status === "active" && data.deviceId === myDevice) {
      return { active: true, key: savedKey };
    }
    // key ব্লক হয়ে থাকলে বা অন্য ডিভাইসে চলে গেলে লোকাল সেভ মুছে ফেলা
    localStorage.removeItem(LS_ACTIVE_LICENSE_KEY);
    return { active: false };
  } catch (e) {
    console.error("Activation check error:", e);
    return { active: false, error: true };
  }
}

// ইউজার নতুন key ইনপুট দিলে এটা চলবে
async function activateLicense(inputKey) {
  const key = (inputKey || "").trim().toUpperCase();
  if (!key) return { ok: false, message: "একটি লাইসেন্স কী লিখুন।" };

  const myDevice = getOrCreateDeviceToken();
  const ref = db.collection("licenses").doc(key);

  try {
    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) {
        throw new Error("এই লাইসেন্স কী সঠিক নয়।");
      }
      const data = doc.data();

      if (data.status === "blocked") {
        throw new Error("এই লাইসেন্স কী ব্লক করা হয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।");
      }

      if (data.status === "active") {
        if (data.deviceId === myDevice) {
          // এই ডিভাইসেই আগে থেকে একটিভ — সমস্যা নেই
          return { alreadyThisDevice: true };
        }
        throw new Error("এই লাইসেন্স কী ইতিমধ্যে অন্য একটি ডিভাইসে ব্যবহৃত হচ্ছে।");
      }

      // status === "unused" → এখন এই ডিভাইসের সাথে লক করে দেওয়া হবে
      tx.update(ref, {
        status: "active",
        deviceId: myDevice,
        deviceInfo: getDeviceInfo(),
        activatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { justActivated: true };
    });

    localStorage.setItem(LS_ACTIVE_LICENSE_KEY, key);
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, message: e.message || "কিছু একটা সমস্যা হয়েছে।" };
  }
}

function logoutDevice() {
  localStorage.removeItem(LS_ACTIVE_LICENSE_KEY);
  location.reload();
}
