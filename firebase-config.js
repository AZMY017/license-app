// ==============================================
// 🔧 আপনার Firebase কনফিগ (১০০% কাজ করবে)
// ==============================================
const firebaseConfig = {
  apiKey: "AIzaSyBZzt-B9sYpRVkOvJJkscDXsqAJWMdoAVA",
  authDomain: "my-license-app-4de93.firebaseapp.com",
  projectId: "my-license-app-4de93",
  storageBucket: "my-license-app-4de93.firebasestorage.app",
  messagingSenderId: "591169598772",
  appId: "1:591169598772:web:62d9b8a9542ba90949e161"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
// অ্যাডমিন ইমেইল
const ADMIN_EMAIL = "azmyislam8@gmail.com";
