// Observer — main app: home, settings, and starting a session.
import { APP_NAME, PHASES, DURATIONS, GUIDANCE, DEFAULTS, PREP } from "./content.js";
import { runSession } from "./session.js";
import * as audio from "./audio.js";

const view = document.getElementById("view");
const overlay = document.getElementById("overlay");
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let active = null; // running session handle

// ---------------------------------------------------------------- preferences (this device only)
const KEY = "observer.prefs";
function prefs() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch {}
  const out = { ...DEFAULTS, ...p };
  if (!DURATIONS.includes(out.minutes)) out.minutes = DEFAULTS.minutes;
  if (!GUIDANCE[out.guidance]) out.guidance = DEFAULTS.guidance;
  return out;
}
function savePrefs(patch) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...prefs(), ...patch })); } catch {}
}

// ---------------------------------------------------------------- router
const routes = { "": home, home, settings };
function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
function render() {
  if (active) return;
  const name = location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
  const fn = routes[name] || home;
  document.body.dataset.view = fn.name;
  view.innerHTML = "";
  fn();
  view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", render);

// ---------------------------------------------------------------- HOME
function home() {
  const p = prefs();
  const hr = new Date().getHours();
  const hello = hr < 5 ? "Late night" : hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  const prep = PREP.map(([t, d]) => (t === "Volume low" && p.guidance === "silent") ? [t, "You'll hear soft bells only."] : [t, d]);

  view.innerHTML = `
    <header class="top">
      <span class="wordmark">${APP_NAME}</span>
      <a class="icon-btn" href="#/settings" aria-label="Settings">${icon("gear")}</a>
    </header>

    <section class="hero">
      <div class="hero-orb" aria-hidden="true"><div class="orb"></div><div class="halo"></div></div>
      <p class="eyebrow">${hello}</p>
      <h1 class="display">Sit, settle,<br><em>and look.</em></h1>
      <p class="muted small">${p.minutes} minutes · ${GUIDANCE[p.guidance].name}</p>
    </section>

    <section class="prep" aria-label="Before you begin">
      <p class="lbl">Before you begin</p>
      <ol>${prep.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join("")}</ol>
    </section>

    <div class="begin-bar"><button class="btn primary big" data-a="begin">Begin</button></div>

    <details class="about">
      <summary>How it works</summary>
      <p>The session has three equal parts. ${p.guidance === "silent" ? "Two bells mark each change." : "The voice guides you into each one, then leaves you in silence."}</p>
      <ol class="phases">${PHASES.map((ph) => `<li><span class="pn">${ph.n}</span><div><b>${ph.name}</b><small>${ph.line}</small></div></li>`).join("")}</ol>
      <p>Don't try to make anything happen. If nothing happens, that's fine. If something unusual happens, let it come and go without deciding what it means.</p>
      <p class="muted small">This is an attention practice, not a treatment. If you notice lasting unreality, anxiety, trouble sleeping or confusion outside your sessions, stop and take a break.</p>
    </details>
  `;
  $("[data-a=begin]").onclick = () => start(p);
}

// ---------------------------------------------------------------- SETTINGS
function settings() {
  const p = prefs();
  view.innerHTML = `
    <header class="top"><a class="back" href="#/">${icon("back")} Back</a><span></span></header>
    <section class="settings">
      <h1 class="display">Settings</h1>

      <div class="set">
        <p class="lbl">Length</p>
        <div class="seg" role="radiogroup" aria-label="Length">${DURATIONS.map((d) => `<button type="button" role="radio" aria-checked="${p.minutes === d}" class="${p.minutes === d ? "on" : ""}" data-min="${d}">${d} min</button>`).join("")}</div>
        <p class="hint">Three equal parts of ${p.minutes / 3} minutes each.</p>
      </div>

      <div class="set">
        <p class="lbl">Guidance</p>
        <div class="seg" role="radiogroup" aria-label="Guidance">${Object.entries(GUIDANCE).map(([k, g]) => `<button type="button" role="radio" aria-checked="${p.guidance === k}" class="${p.guidance === k ? "on" : ""}" data-g="${k}">${g.name}</button>`).join("")}</div>
        <p class="hint">${GUIDANCE[p.guidance].desc}</p>
      </div>

      <div class="set">
        <p class="lbl">Sound check</p>
        <button class="btn ghost" data-a="test">${icon("play")} Play a bell and the voice</button>
        <p class="hint">Use it to set your volume before you sit.</p>
      </div>

      <p class="foot muted small">${APP_NAME} · v2.0 · Settings are saved on this device.</p>
    </section>`;

  $$("[data-min]").forEach((b) => (b.onclick = () => { savePrefs({ minutes: +b.dataset.min }); settings(); }));
  $$("[data-g]").forEach((b) => (b.onclick = () => { savePrefs({ guidance: b.dataset.g }); settings(); }));
  $("[data-a=test]").onclick = () => {
    audio.unlock();
    audio.stopVoice(0.3);
    audio.chime(1);
    setTimeout(() => audio.playVoice("m_p1_start"), 3500);
  };
}

// ---------------------------------------------------------------- SESSION
function start(p) {
  overlay.hidden = false;
  document.body.classList.add("in-session");
  try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch {}
  active = runSession(overlay, { minutes: p.minutes, guidance: p.guidance }, () => {
    active = null;
    overlay.hidden = true; overlay.innerHTML = "";
    document.body.classList.remove("in-session");
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
    go("#/");
  });
}

// ---------------------------------------------------------------- icons
function icon(n) {
  const p = {
    back: '<path d="M15 5l-7 7 7 7"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  }[n] || "";
  return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
}

// ---------------------------------------------------------------- boot
render();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
