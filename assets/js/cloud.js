// Optional sign-in (Google / Apple) and cloud sync via Firebase.
// Loaded only when FIREBASE_CONFIG is filled in config.js.
import { FIREBASE_CONFIG, SIGN_IN_WITH, SAME_DOMAIN_SIGN_IN } from "./config.js";
import { store, hooks } from "./store.js";

const FLAG = "observer.signedIn";
let fb = null, app = null, auth = null, db = null;
let user = null;
let status = "signed-out"; // signed-out | connecting | syncing | synced | error
let lastError = "";
const listeners = new Set();

export const cloudAvailable = () => !!FIREBASE_CONFIG;
export const providers = () => SIGN_IN_WITH;
export const currentUser = () => user;
export const syncStatus = () => ({ status, error: lastError });
export function onCloud(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach((f) => { try { f({ user, status, error: lastError }); } catch {} });
const setStatus = (s, err = "") => { status = s; lastError = err; emit(); };

const clean = (o) => JSON.parse(JSON.stringify(o)); // Firestore rejects undefined

let initPromise = null;
let sameDomain = false; // true when this website forwards /__/auth/ to Firebase (Cloudflare function, Vercel rewrite)

function init() {
  if (auth) return Promise.resolve();
  if (!initPromise) initPromise = doInit().catch((e) => { initPromise = null; throw e; });
  return initPromise;
}

/** Does this website have the sign-in helper (Cloudflare function / Vercel rewrite)? GitHub Pages doesn't. */
async function hasSignInHelper() {
  try {
    const r = await fetch("/__/auth/handler", { cache: "no-store" });
    if (!r.ok) return false;
    const t = await r.text();
    return !t.includes('id="view"'); // not just our own app page served as a fallback
  } catch { return false; }
}

async function doInit() {
  if (!FIREBASE_CONFIG) throw new Error("Sign-in isn't set up yet.");
  const local = /^(localhost|127\.|192\.168\.)/.test(location.hostname);
  const [mod, helper] = await Promise.all([import("../vendor/firebase.js"), SAME_DOMAIN_SIGN_IN && !local ? hasSignInHelper() : false]);
  fb = mod;
  sameDomain = helper;
  const cfg = { ...FIREBASE_CONFIG };
  if (sameDomain) cfg.authDomain = location.host;
  app = fb.initializeApp(cfg);
  auth = fb.getAuth(app);
  db = fb.getFirestore(app);
  await fb.setPersistence(auth, fb.browserLocalPersistence).catch(() => {});
  fb.getRedirectResult(auth).catch((e) => setStatus("error", friendly(e)));
  fb.onAuthStateChanged(auth, async (u) => {
    user = u;
    if (u) {
      localStorage.setItem(FLAG, "1");
      await syncNow();
    } else {
      localStorage.removeItem(FLAG);
      hooks.onSession = null; hooks.onSettings = null;
      setStatus("signed-out");
    }
  });
}

/** Restore a previous sign-in quietly on app start. */
export async function restore() {
  if (!FIREBASE_CONFIG || !localStorage.getItem(FLAG)) return;
  setStatus("connecting");
  try { await init(); } catch (e) { setStatus("error", friendly(e)); }
}

const isStandaloneIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && (navigator.standalone || matchMedia("(display-mode: standalone)").matches);

/** Load the sign-in code in the background so the button can open its popup instantly. */
export function prepare() {
  if (!FIREBASE_CONFIG || auth) return;
  init().catch((e) => console.warn(e));
}

export async function signIn(which) {
  // Note: browsers only allow a popup if it opens straight from the tap, so nothing may be awaited first.
  const ready = !!auth;
  setStatus("connecting");
  try {
    if (!ready) await init();
    let provider;
    if (which === "apple") {
      provider = new fb.OAuthProvider("apple.com");
      provider.addScope("email"); provider.addScope("name");
    } else {
      provider = new fb.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
    }
    // Redirect sign-in is only reliable on iPhone when the helper runs on this same website.
    if (!ready || (isStandaloneIOS() && sameDomain)) return await fb.signInWithRedirect(auth, provider);
    try {
      await fb.signInWithPopup(auth, provider);
    } catch (e) {
      if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/web-storage-unsupported"].includes(e.code)) {
        return await fb.signInWithRedirect(auth, provider);
      }
      throw e;
    }
  } catch (e) {
    if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") { setStatus(user ? "synced" : "signed-out"); return; }
    setStatus("error", friendly(e));
  }
}

export async function signOutNow() {
  if (!auth) return;
  await fb.signOut(auth);
}

export async function syncNow() {
  if (!user) return;
  setStatus("syncing");
  try {
    const uref = fb.doc(db, "users", user.uid);
    const [udoc, snap] = await Promise.all([fb.getDoc(uref), fb.getDocs(fb.collection(db, "users", user.uid, "sessions"))]);
    const remote = [];
    snap.forEach((d) => remote.push(d.data()));
    const remoteById = new Map(remote.map((r) => [r.id, r]));
    store.mergeSessions(remote);
    if (udoc.exists()) {
      const u = udoc.data();
      store.mergeSettings(u.settings, u.cycle);
    }
    // push anything the cloud doesn't have (or has older)
    const toPush = store.sessions({ includeDeleted: true }).filter((s) => {
      const r = remoteById.get(s.id);
      return !r || (s.updatedAt || 0) > (r.updatedAt || 0);
    });
    for (let i = 0; i < toPush.length; i += 400) {
      const b = fb.writeBatch(db);
      toPush.slice(i, i + 400).forEach((s) => b.set(fb.doc(db, "users", user.uid, "sessions", s.id), clean(s)));
      await b.commit();
    }
    await fb.setDoc(uref, clean({ settings: store.settings(), cycle: store.get().cycle, updatedAt: Date.now() }), { merge: true });

    hooks.onSession = (s) => {
      if (!user) return;
      setStatus("syncing");
      fb.setDoc(fb.doc(db, "users", user.uid, "sessions", s.id), clean(s))
        .then(() => setStatus("synced"))
        .catch((e) => setStatus("error", friendly(e)));
    };
    hooks.onSettings = () => {
      if (!user) return;
      fb.setDoc(fb.doc(db, "users", user.uid), clean({ settings: store.settings(), cycle: store.get().cycle, updatedAt: Date.now() }), { merge: true })
        .catch((e) => setStatus("error", friendly(e)));
    };
    setStatus("synced");
  } catch (e) {
    console.error(e);
    setStatus("error", friendly(e));
  }
}

/** Remove everything stored in the cloud for this account (keeps this device's copy). */
export async function deleteCloudData() {
  if (!user) return;
  const snap = await fb.getDocs(fb.collection(db, "users", user.uid, "sessions"));
  const ids = []; snap.forEach((d) => ids.push(d.id));
  for (let i = 0; i < ids.length; i += 400) {
    const b = fb.writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => b.delete(fb.doc(db, "users", user.uid, "sessions", id)));
    await b.commit();
  }
  await fb.deleteDoc(fb.doc(db, "users", user.uid));
  await signOutNow();
}

function friendly(e) {
  const c = e?.code || "";
  if (c.includes("network")) return "No connection. Your data is safe on this device and will sync later.";
  if (c.includes("unauthorized-domain")) return "This web address isn't authorised in Firebase yet (see SETUP, Part 3).";
  if (c.includes("operation-not-allowed")) return "This sign-in method isn't switched on in Firebase yet.";
  if (c.includes("internal-error") || c.includes("invalid-api-key") || c.includes("api-key-not-valid")) return "Sign-in couldn't start. Check your internet connection, then the Firebase settings in config.js (SETUP, Part 3).";
  if (c.includes("popup-blocked")) return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
  if (c.includes("permission-denied")) return "Cloud storage refused access. Check the Firestore rules (SETUP, Part 3).";
  return e?.message || "Something went wrong with sign-in.";
}
