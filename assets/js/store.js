// Local-first data store. Everything is saved on this device; if the person signs in,
// cloud.js mirrors it to their account.
import { MEASURES, ALTERATION_KEYS, PROGRAM_LENGTH, CONDITIONS } from "./content.js";

const KEY = "observer.v1";
const listeners = new Set();

const DEFAULT_SETTINGS = {
  duration: 30,
  guidance: "guided",
  voice: "warm",
  showTimer: false,
  countNoticing: false,
  haptics: true,
  voiceVolume: 0.9,
  chimeVolume: 0.6,
  reminderTime: "07:00",
  seenIntro: false,
  updatedAt: 0,
};

function blank() {
  return { sessions: [], settings: { ...DEFAULT_SETTINGS }, cycle: { id: 1, startedAt: Date.now() }, draft: null };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const s = JSON.parse(raw);
    return { ...blank(), ...s, settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) } };
  } catch {
    return blank();
  }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn("Could not save", e); }
  listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } });
}

export const store = {
  get: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  settings: () => state.settings,

  setSettings(patch) {
    state.settings = { ...state.settings, ...patch, updatedAt: Date.now() };
    persist();
    hooks.onSettings?.(state.settings);
  },

  sessions({ includeDeleted = false } = {}) {
    return state.sessions
      .filter((s) => includeDeleted || !s.deleted)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  cycleSessions(cycleId = state.cycle.id) {
    return this.sessions().filter((s) => s.cycle === cycleId);
  },

  getSession(id) { return state.sessions.find((s) => s.id === id); },

  saveSession(sess) {
    sess.updatedAt = Date.now();
    const i = state.sessions.findIndex((s) => s.id === sess.id);
    if (i >= 0) state.sessions[i] = sess; else state.sessions.push(sess);
    persist();
    hooks.onSession?.(sess);
    return sess;
  },

  deleteSession(id) {
    const s = this.getSession(id);
    if (!s) return;
    s.deleted = true; s.updatedAt = Date.now();
    persist();
    hooks.onSession?.(s);
  },

  setDraft(d) { state.draft = d; persist(); },

  newCycle() {
    state.cycle = { id: (state.cycle?.id || 1) + 1, startedAt: Date.now() };
    persist();
    hooks.onSettings?.(state.settings);
  },

  /** Merge sessions from elsewhere (cloud or a backup file). Newest updatedAt wins. */
  mergeSessions(incoming = []) {
    let changed = 0;
    for (const r of incoming) {
      if (!r || !r.id) continue;
      const i = state.sessions.findIndex((s) => s.id === r.id);
      if (i < 0) { state.sessions.push(r); changed++; }
      else if ((r.updatedAt || 0) > (state.sessions[i].updatedAt || 0)) { state.sessions[i] = r; changed++; }
    }
    if (changed) persist();
    return changed;
  },

  mergeSettings(remote, cycle) {
    if (remote && (remote.updatedAt || 0) > (state.settings.updatedAt || 0)) {
      state.settings = { ...DEFAULT_SETTINGS, ...remote };
    }
    if (cycle && cycle.id > (state.cycle?.id || 0)) state.cycle = cycle;
    persist();
  },

  exportData() {
    return { app: "observer", version: 1, exportedAt: new Date().toISOString(), cycle: state.cycle, settings: state.settings, sessions: state.sessions };
  },

  importData(obj) {
    if (!obj || !Array.isArray(obj.sessions)) throw new Error("This file doesn't look like an Observer backup.");
    const n = this.mergeSessions(obj.sessions);
    if (obj.cycle && obj.cycle.id > state.cycle.id) { state.cycle = obj.cycle; persist(); }
    obj.sessions.forEach((s) => hooks.onSession?.(s));
    return n;
  },

  clearAll() {
    state = blank();
    state.settings.seenIntro = true;
    persist();
  },
};

// cloud.js fills these in when someone signs in
export const hooks = { onSession: null, onSettings: null };

// ---------- helpers ----------
export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function localDateKey(d = new Date()) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function alterationIndex(r) {
  if (!r) return null;
  const v = ALTERATION_KEYS.map((k) => r[k]).filter((x) => typeof x === "number");
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

export function sessionNumber(sess) {
  const list = store.cycleSessions(sess.cycle);
  return list.findIndex((s) => s.id === sess.id) + 1;
}

export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** The plain-text report in the exact shape the protocol asks for. */
export function reportText(sess, n) {
  const lines = [];
  const mins = Math.round((sess.durationActual || sess.durationPlanned * 60) / 60);
  const date = new Date(sess.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  lines.push(`Day ${n ?? sessionNumber(sess)} — ${mins} min  (${date})`);
  for (const m of MEASURES) {
    const v = sess.ratings?.[m.key];
    lines.push(`${m.short}: ${typeof v === "number" ? v : "–"}`);
  }
  if (typeof sess.noticeCount === "number" && sess.noticeCount > 0) lines.push(`Noticed wandering (taps, phase 1): ${sess.noticeCount}`);
  const marks = (sess.markers || []).filter(Boolean);
  if (marks.length) {
    lines.push(`Marked moments: ` + marks.map((mk) => `~${Math.max(1, Math.round(mk.t / 60))} min${mk.note ? ` — ${mk.note}` : ""}`).join("; "));
  }
  if (sess.notes?.trim()) lines.push(`Notable event: ${sess.notes.trim()}`);
  if (sess.interpretation?.trim()) lines.push(`(Interpretation, held lightly: ${sess.interpretation.trim()})`);
  const cond = [];
  if (!sess.withApp) cond.push("done without the app");
  else cond.push(`${sess.guidance} guidance`);
  if (sess.endedEarly) cond.push(`ended early at ${mins} of ${sess.durationPlanned} min`);
  if (sess.conditions) {
    const label = (k) => CONDITIONS.find((c) => c.key === k)?.short || k;
    const met = Object.entries(sess.conditions).filter(([, v]) => v === true).map(([k]) => label(k));
    if (met.length) cond.push(met.join(", "));
    else cond.push("no conditions ticked");
  }
  lines.push(`Conditions: ${cond.join("; ")}`);
  return lines.join("\n");
}

export function allReportsText(cycleId) {
  const list = cycleId ? store.cycleSessions(cycleId) : store.sessions();
  const byCycle = {};
  list.forEach((s) => { (byCycle[s.cycle] ||= []).push(s); });
  const out = [];
  for (const [c, arr] of Object.entries(byCycle)) {
    if (Object.keys(byCycle).length > 1) out.push(`=== Cycle ${c} ===`);
    arr.forEach((s, i) => out.push(reportText(s, i + 1)));
  }
  return out.join("\n\n");
}

export { PROGRAM_LENGTH };
