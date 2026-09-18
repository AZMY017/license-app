// ==========================================================
// Masaniello bilingual UI strings
// ==========================================================

const APP_TRANSLATIONS = {
  bn: {
    languageTitle: "ভাষা নির্বাচন করুন",
    languageSubtitle: "আপনার পছন্দের ভাষা বেছে নিন",
    bengali: "বাংলা",
    english: "English",
    licenseChecking: "লাইসেন্স যাচাই হচ্ছে...",
    pleaseWait: "অনুগ্রহ করে অপেক্ষা করুন",
    licenseRequired: "লাইসেন্স কী দিন",
    licenseRequiredSubtitle: "এই অ্যাপটি ব্যবহার করতে আপনার লাইসেন্স কী প্রয়োজন",
    licenseKey: "লাইসেন্স কী",
    activate: "অ্যাক্টিভেট করুন",
    checking: "যাচাই করা হচ্ছে...",
    activated: "সফলভাবে অ্যাক্টিভেট হয়েছে!",
    menuTitle: "Masaniello Money Management",
    menuSubtitle: "আপনার পছন্দের মানি ম্যানেজমেন্ট সিস্টেম বেছে নিন",
    classicTitle: "Classic Masaniello",
    classicDesc: "একটা সিলেকশন প্রতি ইভেন্টে — টার্গেট অটো-হিসাব",
    doubleTitle: "Double Chance",
    doubleDesc: "২টা লেগ-ই জিতলে তবেই জয়",
    tripleTitle: "Triple Chance",
    tripleDesc: "৩টা লেগ-ই জিতলে তবেই জয়",
    logout: "এই ডিভাইস থেকে লগআউট",
    licensed: "Licensed software — unauthorized sharing is prohibited",
    back: "← মেনু",
    settings: "SETTINGS — শুধু হলুদ ঘরগুলো এডিট করুন",
    initialCapital: "Initial Capital",
    totalEvents: "Total Events (N)",
    requiredWins: "Required Successful Events (K)",
    payout: "Payout / Quota (per leg, decimal odds)",
    targetProfit: "Target Profit % (of Initial Capital)",
    targetAuto: "এই মোডে টার্গেট নিজে থেকেই হিসাব হয় (N, K, Quota থেকে)।",
    calculate: "সেশন শুরু করুন / Calculate",
    calculating: "হিসাব করা হচ্ছে...",
    calculatedTargets: "CALCULATED TARGETS",
    multiplier: "Net Multiplier per Successful Event",
    targetCapital: "Target Final Capital",
    ratio: "Required Capital Ratio",
    feasibility: "Feasibility Check",
    finalCapital: "Capitale Finale (Target Final Capital)",
    resa: "Resa (Expected Return %)",
    autoStake: "AUTO STAKE",
    firstStake: "Auto First Event Stake",
    nextStake: "Next Event Stake",
    sequence: "SEQUENZA",
    wins: "ট্রেড জিতেছি",
    losses: "ট্রেড হেরেছি",
    event: "Event",
    eventResult: "Event Result",
    eventStake: "Event Stake",
    netPL: "Event Net Profit/Loss",
    capitalAfter: "Main Capital After Event",
    won: "জিতেছি",
    lost: "হেরেছি",
    undo: "Undo / আগের ফলাফল ঠিক করুন",
    reset: "রিসেট / নতুন সেশন",
    placeholderCapital: "যেমনঃ 10000",
    placeholderEvents: "যেমনঃ 30",
    placeholderWins: "যেমনঃ 5",
    placeholderPayout: "যেমনঃ 1.90",
    placeholderTarget: "যেমনঃ 1",
    invalidCapital: "সঠিক ক্যাপিটাল দিন।",
    invalidEvents: "মোট ইভেন্ট সংখ্যা দিন।",
    invalidWins: "জয়ের সংখ্যা মোট ইভেন্টের সমান বা কম হতে হবে।",
    invalidPayout: "সঠিক পে-আউট দিন (১ এর বেশি)।",
    invalidTarget: "সঠিক টার্গেট প্রফিট % দিন।",
    sessionEnded: "সেশন শেষ। ফাইনাল ক্যাপিটাল:",
    targetAchieved: "টার্গেট অর্জিত হয়ে গেছে! বর্তমান ক্যাপিটাল:",
    unreachable: "বাকি ইভেন্টে টার্গেট পূরণ আর সম্ভব না। বর্তমান ক্যাপিটাল:",
    feasible: "FEASIBLE ✓",
    notFeasible: "NOT FEASIBLE ✕",
    errorPrefix: "এরর: ",
    keyPlaceholder: "যেমনঃ ABCD-1234-EFGH"
  },
  en: {
    languageTitle: "Select Language",
    languageSubtitle: "Choose your preferred language",
    bengali: "বাংলা",
    english: "English",
    licenseChecking: "Checking license...",
    pleaseWait: "Please wait",
    licenseRequired: "Enter License Key",
    licenseRequiredSubtitle: "A license key is required to use this app",
    licenseKey: "License Key",
    activate: "Activate",
    checking: "Checking...",
    activated: "Activated successfully!",
    menuTitle: "Masaniello Money Management",
    menuSubtitle: "Choose your preferred money management system",
    classicTitle: "Classic Masaniello",
    classicDesc: "One selection per event — target calculated automatically",
    doubleTitle: "Double Chance",
    doubleDesc: "Win only when both legs win",
    tripleTitle: "Triple Chance",
    tripleDesc: "Win only when all three legs win",
    logout: "Log out from this device",
    licensed: "Licensed software — unauthorized sharing is prohibited",
    back: "← Menu",
    settings: "SETTINGS — Edit yellow cells only",
    initialCapital: "Initial Capital",
    totalEvents: "Total Events (N)",
    requiredWins: "Required Successful Events (K)",
    payout: "Payout / Quota (per leg, decimal odds)",
    targetProfit: "Target Profit % (of Initial Capital)",
    targetAuto: "Target is calculated automatically from N, K and Quota in this mode.",
    calculate: "Start Session / Calculate",
    calculating: "Calculating...",
    calculatedTargets: "CALCULATED TARGETS",
    multiplier: "Net Multiplier per Successful Event",
    targetCapital: "Target Final Capital",
    ratio: "Required Capital Ratio",
    feasibility: "Feasibility Check",
    finalCapital: "Final Capital (Target Final Capital)",
    resa: "Return (Expected Return %)",
    autoStake: "AUTO STAKE",
    firstStake: "Auto First Event Stake",
    nextStake: "Next Event Stake",
    sequence: "SEQUENCE",
    wins: "Trades Won",
    losses: "Trades Lost",
    event: "Event",
    eventResult: "Event Result",
    eventStake: "Event Stake",
    netPL: "Event Net Profit/Loss",
    capitalAfter: "Main Capital After Event",
    won: "Trade Won",
    lost: "Trade Lost",
    undo: "Undo / Correct Previous Result",
    reset: "Reset / New Session",
    placeholderCapital: "e.g. 10000",
    placeholderEvents: "e.g. 30",
    placeholderWins: "e.g. 5",
    placeholderPayout: "e.g. 1.90",
    placeholderTarget: "e.g. 1",
    invalidCapital: "Enter a valid capital amount.",
    invalidEvents: "Enter the total number of events.",
    invalidWins: "Required wins must be less than or equal to total events.",
    invalidPayout: "Enter a valid payout greater than 1.",
    invalidTarget: "Enter a valid target profit percentage.",
    sessionEnded: "Session ended. Final capital:",
    targetAchieved: "Target achieved! Current capital:",
    unreachable: "The target is no longer reachable. Current capital:",
    feasible: "FEASIBLE ✓",
    notFeasible: "NOT FEASIBLE ✕",
    errorPrefix: "Error: ",
    keyPlaceholder: "e.g. ABCD-1234-EFGH"
  }
};

let currentLanguage = "bn";

function t(key) {
  return (APP_TRANSLATIONS[currentLanguage] && APP_TRANSLATIONS[currentLanguage][key]) || APP_TRANSLATIONS.en[key] || key;
}

function getLanguage() {
  return currentLanguage;
}

function setLanguage(lang) {
  currentLanguage = lang === "en" ? "en" : "bn";
  localStorage.setItem("masaniello_language", currentLanguage);
  if (typeof applyStaticLanguage === "function") applyStaticLanguage();
}

function applyStaticLanguage() {
  document.documentElement.lang = currentLanguage === "bn" ? "bn" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
}
