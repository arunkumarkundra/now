// Observer — main app: navigation and screens.
import { APP_NAME, PHASES, MEASURES, CONDITIONS, DURATIONS, GUIDANCE, SAFETY_SIGNS, RULE, PROGRAM_LENGTH } from "./content.js";
import { VOICES } from "./cues-data.js";
import { store, uid, localDateKey, alterationIndex, reportText, allReportsText, fmtClock } from "./store.js";
import { runSession } from "./session.js";
import * as audio from "./audio.js";
import { lineChart, sparkline, scatter, correlation } from "./charts.js";
import * as cloud from "./cloud.js";

const view = document.getElementById("view");
const overlay = document.getElementById("overlay");
const nav = document.getElementById("nav");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let active = null; // running session handle
let installEvt = null;
let progressMeasure = "attention";

// ---------------------------------------------------------------- utilities
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2200);
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("Copied"); }
  catch {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("Copied"); } catch { toast("Couldn't copy"); }
    ta.remove();
  }
}

function download(name, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

const fmtDate = (iso, opts = { weekday: "short", day: "numeric", month: "short" }) => new Date(iso).toLocaleDateString(undefined, opts);
const fmtTime = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const cycleList = () => store.cycleSessions();
const doneToday = () => store.sessions().some((s) => localDateKey(new Date(s.date)) === localDateKey());

function streak() {
  const days = new Set(store.sessions().map((s) => localDateKey(new Date(s.date))));
  let n = 0; const d = new Date();
  if (!days.has(localDateKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(localDateKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function dots(count, total = PROGRAM_LENGTH) {
  let h = "";
  for (let i = 0; i < Math.max(total, count); i++) h += `<i class="${i < count ? "on" : ""}${i === count ? " next" : ""}"></i>`;
  return `<div class="dots" aria-label="${count} of ${total} sessions">${h}</div>`;
}

function scale(key, value) {
  let h = "";
  for (let i = 0; i <= 10; i++) h += `<button type="button" class="sc${value === i ? " on" : ""}" data-k="${key}" data-v="${i}" aria-label="${i}">${i}</button>`;
  return h;
}

// ---------------------------------------------------------------- router
const routes = {
  "": today, today, begin, log, journal, entry, progress, guide, me, welcome,
};

function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

function render() {
  if (active) return;
  const [path, q] = location.hash.replace(/^#\/?/, "").split("?");
  const [name, arg] = path.split("/");
  const params = new URLSearchParams(q || "");
  if (!store.settings().seenIntro && name !== "welcome" && name !== "guide") return go("#/welcome");
  const fn = routes[name] || today;
  $$("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.r === (name || "today") || (a.dataset.r === "journal" && name === "entry")));
  nav.hidden = ["welcome", "begin", "log"].includes(name);
  document.body.dataset.view = name || "today";
  view.innerHTML = "";
  fn(arg, params);
  view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);

// ---------------------------------------------------------------- WELCOME
function welcome() {
  let step = 0;
  const steps = [
    () => `
      <p class="eyebrow">A 14-day attention experiment</p>
      <h1 class="display xl">${APP_NAME}</h1>
      <p class="lede">Thirty minutes a day. Three phases. One question.<br>No beliefs required, and nothing to achieve.</p>
      <ol class="phase-row">${PHASES.map((p) => `<li><span class="pn">${p.n}</span><b>${p.short}</b><small>${p.name}</small></li>`).join("")}</ol>
      <p class="muted">You build steady attention, then gradually drop the habit of placing yourself as “the observer”, then look for where that observer actually is. Afterwards you rate what happened, and the app tracks it over time.</p>`,
    () => `
      <p class="eyebrow">The one rule</p>
      <h1 class="display">${RULE.title}</h1>
      <ul class="results">${RULE.results.map((r) => `<li><span>${r}</span><em>result.</em></li>`).join("")}</ul>
      <p class="lede">Write the experience down, but don't adopt its interpretation.</p>`,
    () => `
      <p class="eyebrow">Before you start</p>
      <h1 class="display">Look after yourself.</h1>
      <p>Stop the experiment if you notice any of these, lasting beyond your sessions:</p>
      <ul class="plain">${SAFETY_SIGNS.map((s) => `<li>${s}</li>`).join("")}</ul>
      <p>Don't combine it with sleep deprivation, extreme fasting, breath-holding or hyperventilation, or recreational drugs.</p>
      <p class="muted">This is an attention practice, not treatment. If you have a history of psychosis, dissociation or trauma-related conditions, talk to a professional before starting.</p>`,
  ];
  const draw = () => {
    view.innerHTML = `
      <section class="welcome">
        <div class="w-body">${steps[step]()}</div>
        <div class="w-foot">
          <div class="pager">${steps.map((_, i) => `<i class="${i === step ? "on" : ""}"></i>`).join("")}</div>
          <div class="row">
            ${step > 0 ? `<button class="btn ghost" data-a="back">Back</button>` : `<a class="btn ghost" href="#/guide">Read the full method</a>`}
            <button class="btn primary" data-a="next">${step < steps.length - 1 ? "Continue" : "I understand — start"}</button>
          </div>
        </div>
      </section>`;
    $("[data-a=next]").onclick = () => {
      if (step < steps.length - 1) { step++; draw(); }
      else { store.setSettings({ seenIntro: true }); go("#/today"); }
    };
    const b = $("[data-a=back]"); if (b) b.onclick = () => { step--; draw(); };
  };
  draw();
}

// ---------------------------------------------------------------- TODAY
function today() {
  const s = store.settings();
  const list = cycleList();
  const n = list.length;
  const last = store.sessions().at(-1);
  const draft = store.get().draft;
  const hr = new Date().getHours();
  const hello = hr < 5 ? "Late night." : hr < 12 ? "Good morning." : hr < 17 ? "Good afternoon." : "Good evening.";
  const done = doneToday();
  const lines = ["If nothing happens: that's a result.", "The measure isn't “no thoughts”. It's how quickly you notice.", "Write it down. Don't adopt the interpretation.", "Negative results are extremely valuable.", "Don't try to manufacture an experience.", "Look without constructing an answer."];
  const line = lines[(new Date().getDate() + n) % lines.length];
  const complete = n >= PROGRAM_LENGTH;

  view.innerHTML = `
    <header class="top">
      <span class="wordmark">${APP_NAME}</span>
      ${accountChip()}
    </header>
    <section class="hero">
      <div class="hero-orb" aria-hidden="true"><div class="orb"></div><div class="halo"></div></div>
      <p class="eyebrow">${hello}</p>
      <h1 class="display">${complete ? "Cycle complete." : done ? "Today's session<br><em>is logged.</em>" : n === 0 ? "Day one<br><em>of fourteen.</em>" : `Session ${n + 1}<br><em>of ${PROGRAM_LENGTH}.</em>`}</h1>
      ${dots(Math.min(n, PROGRAM_LENGTH))}
      <p class="muted small">${complete ? "Review what you found in Progress, then decide what to change." : done ? "Once a day is the protocol. See you tomorrow." : `${s.duration} min · ${GUIDANCE[s.guidance].name}${s.guidance !== "silent" ? ` · ${VOICES[s.voice].name} voice` : ""}`}</p>
    </section>

    ${draft ? `<a class="card notice" href="#/log"><b>You have an unrated session.</b><span>Record your ratings now, while it's fresh →</span></a>` : ""}

    <div class="cta">
      <a class="btn primary big" href="#/begin">${done ? "Sit again anyway" : "Begin session"}</a>
      <a class="link" href="#/log?manual=1">Sat without your phone? Log it</a>
    </div>

    ${complete ? `<a class="card notice" href="#/progress"><b>14 sessions logged.</b><span>See the 14-day review →</span></a>` : ""}

    <section class="card quote"><p>${line}</p></section>

    ${last ? `
      <section class="section">
        <div class="sec-head"><h2>Last session</h2><a class="link" href="#/journal">Journal</a></div>
        ${entryCard(last)}
      </section>` : `
      <section class="section">
        <div class="sec-head"><h2>How it works</h2><a class="link" href="#/guide">Full method</a></div>
        <ol class="steps">
          <li><b>Prepare</b> a dim, quiet room. Sit comfortably.</li>
          <li><b>Sit</b> for three phases. The app speaks rarely, then goes quiet.</li>
          <li><b>Rate</b> 12 dimensions immediately, before you think about what it meant.</li>
          <li><b>Repeat</b> daily for 14 days. Watch the patterns in Progress.</li>
        </ol>
      </section>`}
    ${installBanner()}
  `;
  wireInstall();
}

function accountChip() {
  if (!cloud.cloudAvailable()) return `<a class="chip-btn" href="#/me" aria-label="Settings">${icon("gear")}</a>`;
  const u = cloud.currentUser();
  if (u) return `<a class="avatar" href="#/me" aria-label="Account">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc((u.displayName || u.email || "?")[0])}</a>`;
  return `<a class="chip-btn text" href="#/me">Sign in</a>`;
}

function entryCard(s) {
  const n = store.cycleSessions(s.cycle).findIndex((x) => x.id === s.id) + 1;
  const a = alterationIndex(s.ratings);
  const mins = Math.round((s.durationActual || s.durationPlanned * 60) / 60);
  return `
    <a class="entry" href="#/entry/${s.id}">
      <div class="e-head"><span class="e-n mono">${String(n).padStart(2, "0")}</span><span>${fmtDate(s.date)} · ${mins} min${s.withApp ? "" : " · no app"}</span></div>
      <div class="e-stats">
        <span><small>Attention</small><b class="mono">${s.ratings?.attention ?? "–"}</b></span>
        <span><small>Peace</small><b class="mono">${s.ratings?.peace ?? "–"}</b></span>
        <span><small>Alteration</small><b class="mono">${a === null ? "–" : a.toFixed(1)}</b></span>
        <span><small>Certainty</small><b class="mono">${s.ratings?.confidence ?? "–"}</b></span>
      </div>
      ${s.notes ? `<p class="e-note">${esc(s.notes.slice(0, 140))}${s.notes.length > 140 ? "…" : ""}</p>` : ""}
    </a>`;
}

// ---------------------------------------------------------------- BEGIN (setup)
function begin() {
  const s = store.settings();
  const cfg = { minutes: s.duration, guidance: s.guidance, voice: s.voice };
  const conditions = {};
  const hasPrev = store.sessions().length > 0;
  let safety = hasPrev ? null : "n/a";

  const draw = () => {
    view.innerHTML = `
      <header class="top"><a class="back" href="#/today">${icon("back")} Back</a><span></span></header>
      <section class="setup">
        <p class="eyebrow">Prepare</p>
        <h1 class="display">Set up the room,<br><em>then the session.</em></h1>

        <div class="field-group">
          <label class="lbl">Length</label>
          <div class="seg">${DURATIONS.map((d) => `<button type="button" class="${cfg.minutes === d ? "on" : ""}" data-min="${d}">${d}<small>min</small></button>`).join("")}</div>
          <p class="hint">${cfg.minutes === 30 ? "The protocol's length: 10 minutes per phase." : `${cfg.minutes / 3} minutes per phase. The protocol uses 30.`}</p>
        </div>

        <div class="field-group">
          <label class="lbl">Guidance</label>
          <div class="seg">${Object.entries(GUIDANCE).map(([k, g]) => `<button type="button" class="${cfg.guidance === k ? "on" : ""}" data-g="${k}">${g.name}</button>`).join("")}</div>
          <p class="hint">${GUIDANCE[cfg.guidance].desc}</p>
        </div>

        ${cfg.guidance !== "silent" ? `
        <div class="field-group">
          <label class="lbl">Voice</label>
          <div class="voices">${Object.entries(VOICES).map(([k, v]) => `
            <button type="button" class="voice ${cfg.voice === k ? "on" : ""}" data-v="${k}">
              <span class="play" data-play="${k}" aria-label="Preview ${v.name}">${icon("play")}</span>
              <b>${v.name}</b><small>${v.desc}</small>
            </button>`).join("")}</div>
        </div>` : ""}

        <div class="field-group">
          <label class="lbl">Conditions <span class="muted">— tick what's true</span></label>
          <div class="checks">${CONDITIONS.map((c) => `<button type="button" class="check ${conditions[c.key] ? "on" : ""}" data-c="${c.key}">${icon("check")}${c.label}</button>`).join("")}</div>
          <p class="hint">The aim is to reduce uncontrolled inputs. No music, no incense, nothing to look at.</p>
        </div>

        ${hasPrev ? `
        <div class="field-group">
          <label class="lbl">Check-in</label>
          <p class="q">Since your last session, have you had any lasting unreality, significant anxiety, trouble sleeping, confusion, or difficulty functioning day to day?</p>
          <div class="seg two"><button type="button" data-s="no" class="${safety === "no" ? "on" : ""}">No</button><button type="button" data-s="yes" class="${safety === "yes" ? "on" : ""}">Yes</button></div>
          ${safety === "yes" ? `
            <div class="card warn">
              <b>The protocol says: stop here for now.</b>
              <p>Don't push through it. Take a break from the experiment, sleep, and spend time on ordinary grounding activity. If it doesn't settle within a few days, or it worries you, talk to a doctor or someone you trust.</p>
              <p class="small">India: Tele-MANAS <a href="tel:14416">14416</a> (free, 24/7). Elsewhere: <a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a></p>
              <div class="row"><a class="btn primary" href="#/today">Pause the experiment</a><button class="btn ghost small" data-a="anyway">Continue anyway</button></div>
            </div>` : ""}
        </div>` : ""}

        <div class="card tip">
          <p><b>During the session</b> the screen stays on but fades almost to black. Place the phone face-down or out of reach.</p>
          <p><b>Double-tap</b> anywhere to mark a notable moment. <b>Single-tap</b> to see time and controls.</p>
        </div>

        <button class="btn primary big" data-a="start" ${safety === null || safety === "yes" ? "disabled" : ""}>Start · ${cfg.minutes} min</button>
        ${safety === null ? `<p class="hint center">Answer the check-in to continue.</p>` : ""}
      </section>`;

    $$("[data-min]").forEach((b) => (b.onclick = () => { cfg.minutes = +b.dataset.min; draw(); }));
    $$("[data-g]").forEach((b) => (b.onclick = () => { cfg.guidance = b.dataset.g; draw(); }));
    $$("[data-v]").forEach((b) => (b.onclick = (e) => {
      cfg.voice = b.dataset.v;
      if (e.target.closest("[data-play]")) { audio.unlock(); audio.setVolumes({ voice: s.voiceVolume, chime: s.chimeVolume }); audio.playVoice(cfg.voice, "preview"); }
      $$(".voice").forEach((x) => x.classList.toggle("on", x.dataset.v === cfg.voice));
    }));
    $$("[data-c]").forEach((b) => (b.onclick = () => { conditions[b.dataset.c] = !conditions[b.dataset.c]; b.classList.toggle("on"); }));
    $$("[data-s]").forEach((b) => (b.onclick = () => { safety = b.dataset.s; draw(); }));
    const any = $("[data-a=anyway]"); if (any) any.onclick = () => { safety = "yes-continued"; draw(); };
    $("[data-a=start]").onclick = () => start(cfg, conditions, safety);
  };
  draw();
}

function start(cfg, conditions, safety) {
  const s = store.settings();
  store.setSettings({ duration: cfg.minutes, guidance: cfg.guidance, voice: cfg.voice });
  const cond = {}; CONDITIONS.forEach((c) => (cond[c.key] = !!conditions[c.key]));
  const startedAt = new Date().toISOString();
  overlay.hidden = false;
  document.body.classList.add("in-session");
  try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch {}
  active = runSession(overlay, {
    minutes: cfg.minutes, guidance: cfg.guidance, voice: cfg.voice,
    showTimer: s.showTimer, countNoticing: s.countNoticing, haptics: s.haptics,
    voiceVolume: s.voiceVolume, chimeVolume: s.chimeVolume,
  }, (res) => {
    active = null;
    overlay.hidden = true; overlay.innerHTML = "";
    document.body.classList.remove("in-session");
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
    store.setDraft({
      id: uid(), date: startedAt, cycle: store.get().cycle.id, withApp: true,
      durationPlanned: cfg.minutes, durationActual: res.durationActual, endedEarly: res.endedEarly, completed: res.completed,
      guidance: cfg.guidance, voice: cfg.guidance === "silent" ? null : cfg.voice,
      markers: res.markers, noticeCount: res.noticeCount, conditions: cond, safetyCheck: safety,
      ratings: {}, notes: "", interpretation: "",
    });
    go("#/log");
  });
}

// ---------------------------------------------------------------- LOG (ratings)
function log(_, params) {
  let d;
  const editId = params.get("id");
  if (editId) {
    const orig = store.getSession(editId);
    if (!orig) return go("#/journal");
    d = JSON.parse(JSON.stringify(orig));
  } else if (params.get("manual")) {
    const now = new Date(); now.setSeconds(0, 0);
    d = { id: uid(), date: now.toISOString(), cycle: store.get().cycle.id, withApp: false, durationPlanned: 30, durationActual: 1800, endedEarly: false, completed: true, guidance: "none", voice: null, markers: [], noticeCount: null, conditions: null, ratings: {}, notes: "", interpretation: "" };
  } else {
    d = store.get().draft;
    if (!d) return go("#/today");
  }
  const isDraft = !editId && !params.get("manual");
  const persistDraft = () => { if (isDraft) store.setDraft(d); };
  const localInput = (iso) => { const t = new Date(iso); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 16); };

  view.innerHTML = `
    <header class="top"><a class="back" href="${editId ? `#/entry/${editId}` : "#/today"}">${icon("back")} ${editId ? "Cancel" : "Later"}</a><span class="muted small">${editId ? "Editing" : ""}</span></header>
    <section class="log">
      <p class="eyebrow">${d.endedEarly ? `Ended early · ${fmtClock(d.durationActual)}` : "Immediately after"}</p>
      <h1 class="display">Rate first.<br><em>Interpret later, if at all.</em></h1>
      <p class="muted">Go with your first sense of each. 0 is ordinary; 10 is the extreme described on the right.</p>

      ${!d.withApp ? `
      <div class="field-group two-col">
        <label><span class="lbl">When</span><input type="datetime-local" id="when" value="${localInput(d.date)}"></label>
        <label><span class="lbl">Minutes</span><input type="number" id="mins" min="1" max="240" value="${Math.round(d.durationActual / 60)}"></label>
      </div>` : ""}

      <div class="ratings">
        ${MEASURES.map((m, i) => `
          <div class="rating ${m.key === "confidence" ? "key" : ""}" data-row="${m.key}">
            <div class="r-head"><span class="r-i mono">${String(i + 1).padStart(2, "0")}</span><b>${m.label}</b><span class="r-v mono">${d.ratings[m.key] ?? "–"}</span></div>
            <div class="scale" role="group" aria-label="${m.label}">${scale(m.key, d.ratings[m.key])}</div>
            <div class="anchors"><span>${m.lo}</span><span>${m.hi}</span></div>
            ${m.key === "confidence" ? `<p class="hint">How certain are you about what this experience <em>means</em>? This is the critical one: altered states can raise certainty without raising accuracy.</p>` : ""}
          </div>`).join("")}
      </div>

      <div class="field-group">
        <label class="lbl" for="notes">What happened</label>
        ${(d.markers || []).length ? `
          <div class="marks">${d.markers.map((mk, i) => `
            <label class="mark"><span class="mono">${fmtClock(mk.t)} · ${PHASES[(mk.phase || 1) - 1].short}</span>
            <input type="text" data-mk="${i}" value="${esc(mk.note)}" placeholder="What was happening at this moment?"></label>`).join("")}
          </div>` : ""}
        <textarea id="notes" rows="5" placeholder="Raw observations only. e.g. “At ~23 min, body seemed less localized; attention became unusually stable for ~30 seconds.”">${esc(d.notes)}</textarea>
        <p class="hint">Especially unexpected things. “Nothing happened” is a valid, valuable result.</p>
        ${typeof d.noticeCount === "number" ? `<p class="hint">You noticed wandering <b>${d.noticeCount}</b> time${d.noticeCount === 1 ? "" : "s"} in phase 1.</p>` : ""}
      </div>

      <details class="field-group interp" ${d.interpretation ? "open" : ""}>
        <summary><span class="lbl">Interpretation</span> <span class="muted">— optional, kept separate</span></summary>
        <p class="hint">If you have a theory about what it meant, park it here, apart from the observations. Hold it lightly.</p>
        <textarea id="interp" rows="3">${esc(d.interpretation)}</textarea>
      </details>

      <p class="hint center missing" hidden></p>
      <button class="btn primary big" data-a="save">Save entry</button>
      ${isDraft ? `<button class="btn ghost danger small" data-a="discard">Discard this session</button>` : ""}
    </section>`;

  const updateMissing = () => {
    const miss = MEASURES.filter((m) => typeof d.ratings[m.key] !== "number").length;
    const el = $(".missing"); el.hidden = miss === 0;
    el.textContent = `${miss} rating${miss === 1 ? "" : "s"} left. You can save anyway.`;
  };
  updateMissing();

  $(".ratings").addEventListener("click", (e) => {
    const b = e.target.closest(".sc"); if (!b) return;
    const k = b.dataset.k, v = +b.dataset.v;
    d.ratings[k] = v;
    const row = $(`[data-row=${k}]`);
    $$(".sc", row).forEach((x) => x.classList.toggle("on", +x.dataset.v === v));
    $(".r-v", row).textContent = v;
    row.classList.add("done");
    persistDraft(); updateMissing();
  });
  $$("[data-mk]").forEach((inp) => (inp.oninput = () => { d.markers[+inp.dataset.mk].note = inp.value; persistDraft(); }));
  $("#notes").oninput = (e) => { d.notes = e.target.value; persistDraft(); };
  $("#interp").oninput = (e) => { d.interpretation = e.target.value; persistDraft(); };
  const when = $("#when"); if (when) when.onchange = () => { if (when.value) d.date = new Date(when.value).toISOString(); };
  const mins = $("#mins"); if (mins) mins.onchange = () => { const m = Math.max(1, +mins.value || 30); d.durationActual = m * 60; d.durationPlanned = m; };

  $("[data-a=save]").onclick = () => {
    if (!d.createdAt) d.createdAt = Date.now();
    store.saveSession(d);
    if (isDraft) store.setDraft(null);
    toast(editId ? "Entry updated" : "Saved");
    go(`#/entry/${d.id}${editId ? "" : "?new=1"}`);
  };
  const disc = $("[data-a=discard]");
  if (disc) disc.onclick = () => {
    if (!disc.dataset.armed) { disc.dataset.armed = 1; disc.textContent = "Tap again to discard"; return; }
    store.setDraft(null); go("#/today");
  };
}

// ---------------------------------------------------------------- JOURNAL
function journal() {
  const all = store.sessions();
  const cycles = [...new Set(all.map((s) => s.cycle))].sort((a, b) => b - a);
  view.innerHTML = `
    <header class="top"><span class="wordmark">Journal</span>${accountChip()}</header>
    ${all.length === 0 ? empty("No entries yet", "Your sessions and ratings will appear here.") : cycles.map((c) => {
      const list = store.cycleSessions(c).slice().reverse();
      return `<section class="section"><div class="sec-head"><h2>Cycle ${c}</h2><span class="muted small">${list.length} of ${PROGRAM_LENGTH}</span></div>
        <div class="entries">${list.map(entryCard).join("")}</div></section>`;
    }).join("")}
    <div class="cta"><a class="link" href="#/log?manual=1">+ Log a session done without the app</a></div>`;
}

function empty(title, text) {
  return `<section class="empty"><div class="hero-orb small" aria-hidden="true"><div class="orb"></div><div class="halo"></div></div><h2 class="display">${title}</h2><p class="muted">${text}</p><a class="btn primary" href="#/begin">Begin a session</a></section>`;
}

// ---------------------------------------------------------------- ENTRY
function entry(id, params) {
  const s = store.getSession(id);
  if (!s || s.deleted) return go("#/journal");
  const n = store.cycleSessions(s.cycle).findIndex((x) => x.id === s.id) + 1;
  const txt = reportText(s, n);
  const isNew = params.get("new");
  const a = alterationIndex(s.ratings);
  view.innerHTML = `
    <header class="top"><a class="back" href="#/journal">${icon("back")} Journal</a><a class="link" href="#/log?id=${s.id}">Edit</a></header>
    <section class="entry-view">
      ${isNew ? `<div class="card notice static"><b>Saved. ${n >= PROGRAM_LENGTH ? "That's the full cycle." : `${PROGRAM_LENGTH - n} to go.`}</b><span>Resist deciding what it meant. The pattern shows up across sessions, not in one.</span></div>` : ""}
      <p class="eyebrow">Cycle ${s.cycle} · Session ${n}</p>
      <h1 class="display">${fmtDate(s.date, { weekday: "long", day: "numeric", month: "long" })}</h1>
      <p class="muted">${fmtTime(s.date)} · ${Math.round((s.durationActual || 0) / 60)} min${s.withApp ? ` · ${s.guidance}` : " · without the app"}${s.endedEarly ? " · ended early" : ""}</p>

      <div class="bars">
        ${MEASURES.map((m) => { const v = s.ratings?.[m.key]; return `
          <div class="bar-row"><span class="bl">${m.short}</span><span class="bt"><i style="width:${typeof v === "number" ? v * 10 : 0}%"></i></span><b class="mono">${v ?? "–"}</b></div>`; }).join("")}
        <div class="bar-row sum"><span class="bl">Alteration index</span><span class="bt"><i style="width:${a === null ? 0 : a * 10}%"></i></span><b class="mono">${a === null ? "–" : a.toFixed(1)}</b></div>
      </div>

      ${(s.markers || []).length ? `<div class="field-group"><span class="lbl">Marked moments</span><ul class="plain marks-view">${s.markers.map((mk) => `<li><span class="mono">${fmtClock(mk.t)}</span> ${PHASES[(mk.phase || 1) - 1].short}${mk.note ? ` — ${esc(mk.note)}` : ""}</li>`).join("")}</ul></div>` : ""}
      ${s.notes ? `<div class="field-group"><span class="lbl">What happened</span><p class="prose">${esc(s.notes).replace(/\n/g, "<br>")}</p></div>` : ""}
      ${s.interpretation ? `<div class="field-group"><span class="lbl">Interpretation <span class="muted">(held lightly)</span></span><p class="prose muted">${esc(s.interpretation).replace(/\n/g, "<br>")}</p></div>` : ""}

      <div class="field-group">
        <div class="sec-head"><span class="lbl">Report</span><button class="link" data-a="copy">${icon("copy")} Copy</button></div>
        <pre class="report mono">${esc(txt)}</pre>
        <p class="hint">In the protocol's format, ready to paste to whoever (or whatever AI) is helping you refine the method.</p>
      </div>

      <div class="row">
        <a class="btn ghost" href="#/today">Done</a>
        <button class="btn ghost danger" data-a="del">Delete</button>
      </div>
    </section>`;
  $("[data-a=copy]").onclick = () => copy(txt);
  const del = $("[data-a=del]");
  del.onclick = () => {
    if (!del.dataset.armed) { del.dataset.armed = 1; del.textContent = "Tap again to delete"; return; }
    store.deleteSession(s.id); toast("Deleted"); go("#/journal");
  };
}

// ---------------------------------------------------------------- PROGRESS
function progress() {
  const cycles = [...new Set(store.sessions().map((s) => s.cycle))].sort((a, b) => a - b);
  let cyc = store.get().cycle.id;
  if (!store.cycleSessions(cyc).length && cycles.length) cyc = cycles.at(-1);
  const draw = () => {
    const list = store.cycleSessions(cyc);
    const all = store.sessions();
    if (!all.length) {
      view.innerHTML = `<header class="top"><span class="wordmark">Progress</span>${accountChip()}</header>${empty("Nothing to chart yet", "After your first session, your ratings appear here as trends.")}`;
      return;
    }
    const minutes = Math.round(list.reduce((t, s) => t + (s.durationActual || 0), 0) / 60);
    const marks = list.reduce((t, s) => t + (s.markers?.length || 0), 0);
    const m = MEASURES.find((x) => x.key === progressMeasure);
    const pts = list.map((s, i) => ({ x: i + 1, y: s.ratings?.[m.key], label: fmtDate(s.date, { day: "numeric", month: "short" }) }));
    const scat = list.map((s, i) => ({ x: alterationIndex(s.ratings), y: s.ratings?.confidence, n: i + 1 })).filter((p) => p.x !== null && typeof p.y === "number");
    const r = correlation(scat.map((p) => [p.x, p.y]));
    const complete = list.length >= PROGRAM_LENGTH;

    const avg = (arr) => { const v = arr.filter((x) => typeof x === "number"); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const first = list.slice(0, 3), lastN = list.slice(-3);

    view.innerHTML = `
      <header class="top"><span class="wordmark">Progress</span>${accountChip()}</header>
      ${cycles.length > 1 ? `<div class="seg small cycles">${cycles.map((c) => `<button type="button" class="${c === cyc ? "on" : ""}" data-cyc="${c}">Cycle ${c}</button>`).join("")}</div>` : ""}
      <section class="stats">
        <div class="stat"><b class="mono">${list.length}<small>/${PROGRAM_LENGTH}</small></b><span>sessions</span></div>
        <div class="stat"><b class="mono">${minutes}</b><span>minutes</span></div>
        <div class="stat"><b class="mono">${streak()}</b><span>day streak</span></div>
        <div class="stat"><b class="mono">${marks}</b><span>moments marked</span></div>
      </section>
      ${dots(Math.min(list.length, PROGRAM_LENGTH))}

      ${complete ? `
      <section class="card review">
        <p class="eyebrow">14-day review</p>
        <h2 class="display">What changed?</h2>
        <p class="muted small">Average of your first three sessions vs your last three.</p>
        <table class="delta">
          <thead><tr><th></th><th>First</th><th>Last</th><th>Change</th></tr></thead>
          <tbody>${MEASURES.map((mm) => {
            const a = avg(first.map((s) => s.ratings?.[mm.key])), b = avg(lastN.map((s) => s.ratings?.[mm.key]));
            const dl = a !== null && b !== null ? b - a : null;
            return `<tr><td>${mm.short}</td><td class="mono">${a === null ? "–" : a.toFixed(1)}</td><td class="mono">${b === null ? "–" : b.toFixed(1)}</td><td class="mono ${dl > 0.9 ? "up" : dl < -0.9 ? "down" : ""}">${dl === null ? "–" : (dl > 0 ? "+" : "") + dl.toFixed(1)}</td></tr>`;
          }).join("")}</tbody>
        </table>
        <p>If nothing interesting happened, the protocol is clear: <b>don't just sit longer — change the mechanism.</b> Copy all your reports below and bring them to whoever is helping you refine it.</p>
        <div class="row"><button class="btn primary" data-a="copyall">${icon("copy")} Copy all reports</button>${cyc === store.get().cycle.id ? `<button class="btn ghost" data-a="newcycle">Start cycle ${cyc + 1}</button>` : ""}</div>
      </section>` : ""}

      <section class="section">
        <div class="sec-head"><h2>Trend</h2></div>
        <div class="chips">${MEASURES.map((mm) => `<button type="button" class="chip ${mm.key === progressMeasure ? "on" : ""}" data-m="${mm.key}">${mm.short}</button>`).join("")}</div>
        <div class="chart-card">
          <div class="chart-title"><b>${m.label}</b><span class="muted small">0 ${m.lo} · 10 ${m.hi}</span></div>
          <div class="chart" id="line"></div>
          <p class="muted small">Session number →</p>
        </div>
      </section>

      <section class="section">
        <div class="sec-head"><h2>All twelve</h2><span class="muted small">latest · average</span></div>
        <div class="multiples">${MEASURES.map((mm) => {
          const vals = list.map((s) => s.ratings?.[mm.key]);
          const lastV = [...vals].reverse().find((v) => typeof v === "number");
          const av = avg(vals);
          return `<button type="button" class="mult" data-m="${mm.key}"><span class="ml">${mm.short}</span>${sparkline(vals)}<span class="mv mono">${lastV ?? "–"} <small>· ${av === null ? "–" : av.toFixed(1)}</small></span></button>`;
        }).join("")}</div>
      </section>

      <section class="section">
        <div class="sec-head"><h2>The certainty check</h2></div>
        <div class="chart-card">
          <p class="muted small">Each dot is a session. Across: how altered the state was (average of body, self, space, time, vividness, reality, agency and separation). Up: how certain you felt about what it meant.</p>
          <div class="chart" id="scatter"></div>
          <p class="insight">${certaintyInsight(scat, r)}</p>
        </div>
      </section>

      <section class="section">
        <div class="sec-head"><h2>Export</h2></div>
        <div class="list-actions">
          <button data-a="copyall">${icon("copy")}<span><b>Copy all reports</b><small>Plain text in the protocol's format</small></span></button>
          <button data-a="csv">${icon("table")}<span><b>Download spreadsheet (CSV)</b><small>Opens in Excel, Sheets or Numbers</small></span></button>
        </div>
      </section>`;

    lineChart($("#line"), pts, { yLabel: m.label });
    if (scat.length) scatter($("#scatter"), scat); else $("#scatter").innerHTML = `<p class="muted small">Needs ratings for confidence and the alteration measures.</p>`;
    $$("[data-m]").forEach((b) => (b.onclick = () => { progressMeasure = b.dataset.m; draw(); if (b.classList.contains("mult")) $("#line").scrollIntoView({ behavior: "smooth", block: "center" }); }));
    $$("[data-cyc]").forEach((b) => (b.onclick = () => { cyc = +b.dataset.cyc; draw(); }));
    $$("[data-a=copyall]").forEach((b) => (b.onclick = () => copy(allReportsText(cyc))));
    const csv = $("[data-a=csv]"); if (csv) csv.onclick = () => download(`observer-sessions-${localDateKey()}.csv`, toCSV(), "text/csv");
    const nc = $("[data-a=newcycle]"); if (nc) nc.onclick = () => { store.newCycle(); toast(`Cycle ${store.get().cycle.id} started`); go("#/today"); };
  };
  draw();
}

function certaintyInsight(pts, r) {
  if (pts.length < 4) return `After a few more sessions this will show whether your certainty tracks the strength of the experience. (${pts.length} so far.)`;
  const highConf = pts.filter((p) => p.y >= 7).length;
  let s = `Correlation: <b class="mono">${r === null ? "n/a" : r.toFixed(2)}</b>. `;
  if (r !== null && r > 0.5) s += "Your certainty rises with the intensity of the state. That's exactly the pattern worth being careful about: stronger experiences feel more true, which doesn't make them more accurate.";
  else if (r !== null && r < -0.2) s += "Stronger states come with less certainty for you. That's a healthy sign of holding interpretations lightly.";
  else s += "So far, how altered a session felt doesn't strongly predict how sure you felt about its meaning.";
  if (highConf) s += ` ${highConf} session${highConf === 1 ? "" : "s"} rated confidence 7 or above.`;
  return s;
}

function toCSV() {
  const rows = [["cycle", "session", "date", "time", "minutes", "planned_minutes", "with_app", "guidance", "ended_early", ...MEASURES.map((m) => m.key), "alteration_index", "noticed_wandering", "marked_moments", "notes", "interpretation"]];
  const byCycle = {};
  store.sessions().forEach((s) => (byCycle[s.cycle] ||= []).push(s));
  Object.values(byCycle).forEach((arr) => arr.forEach((s, i) => {
    const a = alterationIndex(s.ratings);
    rows.push([s.cycle, i + 1, localDateKey(new Date(s.date)), fmtTime(s.date), Math.round((s.durationActual || 0) / 60), s.durationPlanned, s.withApp ? "yes" : "no", s.guidance, s.endedEarly ? "yes" : "no",
      ...MEASURES.map((m) => s.ratings?.[m.key] ?? ""), a === null ? "" : a.toFixed(2), s.noticeCount ?? "",
      (s.markers || []).map((mk) => `${fmtClock(mk.t)}${mk.note ? " " + mk.note : ""}`).join(" | "), s.notes || "", s.interpretation || ""]);
  }));
  return rows.map((r) => r.map((c) => { const v = String(c ?? ""); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }).join(",")).join("\n");
}

// ---------------------------------------------------------------- GUIDE
function guide() {
  view.innerHTML = `
    <header class="top"><span class="wordmark">The method</span>${store.settings().seenIntro ? accountChip() : `<a class="link" href="#/welcome">Back</a>`}</header>
    <section class="guide">
      <p class="eyebrow">Attention → Release → Inquiry</p>
      <h1 class="display">Build stable attention.<br><em>Then remove what builds the self.</em></h1>
      <p class="lede">The working idea: deep states don't need more effort. They may appear when attention is first made unusually steady, and then the processes that normally construct the ordinary sense of “me, observing” are gradually set down.</p>
      <p class="muted">Focused attention, open monitoring and self-inquiry seem to work through different mechanisms, so the session uses them in sequence. The order matters: dropping the self straight away is much harder than steadying attention first.</p>

      ${PHASES.map((p) => `
        <article class="phase-card" data-p="${p.n}">
          <div class="pc-vis" aria-hidden="true"><div class="orb"></div><div class="halo"></div></div>
          <div>
            <p class="eyebrow">Phase ${p.n} · minutes ${(p.n - 1) * 10}–${p.n * 10}</p>
            <h2>${p.name}</h2>
            ${p.guide.map((g) => `<p>${g}</p>`).join("")}
          </div>
        </article>`).join("")}

      <article class="card">
        <p class="eyebrow">The one rule</p>
        <h2>${RULE.title}</h2>
        <ul class="results">${RULE.results.map((r) => `<li><span>${r}</span><em>result.</em></li>`).join("")}</ul>
        <p>Write the experience down, but do not adopt its interpretation.</p>
      </article>

      <article>
        <h2>Conditions</h2>
        <p>Low sensory input: a dark or dim room, quiet, comfortable temperature. No music, no incense, nothing to look at. The aim is to reduce uncontrolled inputs. Reduced sensory anchoring alone is known to produce changes in body boundaries and time perception in ordinary people, so keeping conditions consistent makes your results comparable.</p>
        <p>The original protocol says “phone outside the room”. If you prefer that, sit without the app and use <a href="#/log?manual=1">Log a session done without the app</a> afterwards. With the app, set it to <b>Silent</b> or <b>Minimal</b> and put the phone face-down.</p>
      </article>

      <article>
        <h2>After each session</h2>
        <p>Rate twelve dimensions from 0 to 10 <b>immediately</b>, before thinking about what it meant. Then note raw events, not conclusions: “At ~23 min, body seemed less localized; attention unusually stable for ~30 seconds,” not “It was amazing.”</p>
        <p>The last rating, <b>confidence in interpretation</b>, is the critical one. If altered states produce large jumps in certainty without any gain in accuracy, that is itself an important finding. Progress plots it for you.</p>
        <p>The first meaningful result probably won't be spectacular. Something like: “For about 20 seconds, I couldn't find the boundary between where I was and what I was experiencing.” That's exactly the kind of observation worth recording.</p>
      </article>

      <article>
        <h2>After fourteen sessions</h2>
        <p>If nothing interesting has happened, don't simply sit for longer. Change the mechanism. Export your reports and use them as data to revise the protocol, rather than defending the original technique.</p>
      </article>

      <article class="card warn">
        <h2>Safety</h2>
        <p>Stop the experiment, rather than pushing through, if you experience any of these beyond the sessions: ${SAFETY_SIGNS.join("; ")}. Meditation-related adverse effects are documented, though how common they are varies a lot by study and intensity.</p>
        <p>Don't combine this with sleep deprivation, extreme fasting, hyperventilation or breath-holding, recreational drugs, or prolonged sensory deprivation.</p>
        <p class="small">India: Tele-MANAS <a href="tel:14416">14416</a> (free, 24/7). Elsewhere: <a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a></p>
      </article>

      <article>
        <h2>Why these three?</h2>
        <ol class="plain num">
          <li><b>Attention.</b> Can it become stable enough that ordinary mental noise stops dominating?</li>
          <li><b>Sensory anchoring.</b> Can the ordinary model of body and world loosen?</li>
          <li><b>Self-model.</b> Can awareness continue while the representation of an observer becomes less prominent?</li>
        </ol>
      </article>
    </section>`;
}

// ---------------------------------------------------------------- ME (account + settings)
function me() {
  const s = store.settings();
  const u = cloud.currentUser();
  const st = cloud.syncStatus();
  const prov = cloud.providers();
  cloud.prepare();
  const statusText = { "signed-out": "", connecting: "Connecting…", syncing: "Syncing…", synced: "All sessions synced", error: st.error };

  view.innerHTML = `
    <header class="top"><a class="back" href="#/today">${icon("back")} Today</a><span></span></header>
    <section class="me">
      <p class="eyebrow">You</p>
      <h1 class="display">Account & settings</h1>

      <div class="card account">
        ${!cloud.cloudAvailable() ? `
          <b>Saved on this device</b>
          <p class="muted small">Everything you log stays private on this phone or computer. Sign-in isn't switched on for this copy of the app yet. Use <b>Backup</b> below to move your data.</p>` :
        u ? `
          <div class="acc-row">${u.photoURL ? `<img class="av" src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : `<span class="av">${esc((u.displayName || u.email || "?")[0])}</span>`}
            <div><b>${esc(u.displayName || "Signed in")}</b><small class="muted">${esc(u.email || "")}</small></div></div>
          <p class="sync ${st.status}">${esc(statusText[st.status] || "")}</p>
          <div class="row"><button class="btn ghost small" data-a="sync">Sync now</button><button class="btn ghost small" data-a="signout">Sign out</button></div>` : `
          <b>Keep your progress across devices</b>
          <p class="muted small">Optional. Without signing in, everything stays on this device.</p>
          <div class="signin">
            ${prov.google ? `<button class="btn provider" data-a="google">${icon("google")} Continue with Google</button>` : ""}
            ${prov.apple ? `<button class="btn provider" data-a="apple">${icon("apple")} Continue with Apple</button>` : ""}
          </div>
          ${st.status === "connecting" ? `<p class="sync">Connecting…</p>` : ""}
          ${st.status === "error" ? `<p class="sync error">${esc(st.error)}</p>` : ""}`}
      </div>

      <h2 class="h-sec">Session defaults</h2>
      <div class="settings">
        <div class="set"><span>Length</span><div class="seg small">${DURATIONS.map((d) => `<button type="button" class="${s.duration === d ? "on" : ""}" data-set="duration" data-val="${d}">${d}</button>`).join("")}</div></div>
        <div class="set"><span>Guidance</span><div class="seg small">${Object.entries(GUIDANCE).map(([k, g]) => `<button type="button" class="${s.guidance === k ? "on" : ""}" data-set="guidance" data-val="${k}">${g.name}</button>`).join("")}</div></div>
        <div class="set"><span>Voice</span><div class="seg small">${Object.entries(VOICES).map(([k, v]) => `<button type="button" class="${s.voice === k ? "on" : ""}" data-set="voice" data-val="${k}">${v.name}</button>`).join("")}</div></div>
        <label class="set"><span>Voice volume</span><input type="range" min="0" max="1" step="0.05" value="${s.voiceVolume}" data-range="voiceVolume"></label>
        <label class="set"><span>Tone volume</span><input type="range" min="0" max="1" step="0.05" value="${s.chimeVolume}" data-range="chimeVolume"></label>
        <label class="set tog"><span>Show time remaining<small>Hidden by default, so you don't watch the clock</small></span><input type="checkbox" data-tog="showTimer" ${s.showTimer ? "checked" : ""}></label>
        <label class="set tog"><span>Count noticings in phase 1<small>Single-tap each time you notice you've wandered</small></span><input type="checkbox" data-tog="countNoticing" ${s.countNoticing ? "checked" : ""}></label>
        <label class="set tog"><span>Vibration<small>Gentle buzz when you mark a moment (Android)</small></span><input type="checkbox" data-tog="haptics" ${s.haptics ? "checked" : ""}></label>
        <button class="btn ghost small" data-a="testsound">${icon("play")} Test tone and voice</button>
      </div>

      <h2 class="h-sec">Daily reminder</h2>
      <div class="settings">
        <label class="set"><span>Time</span><input type="time" value="${s.reminderTime}" data-time></label>
        <button class="btn ghost small" data-a="ics">${icon("cal")} Add 14 daily reminders to my calendar</button>
        <p class="hint">Downloads a calendar file. Open it and your calendar app adds the reminders.</p>
      </div>

      <h2 class="h-sec">Your data</h2>
      <div class="list-actions">
        <button data-a="backup">${icon("down")}<span><b>Backup</b><small>Download everything as a file</small></span></button>
        <button data-a="restore">${icon("up")}<span><b>Restore from backup</b><small>Merges with what's here</small></span></button>
        <button data-a="newcycle">${icon("loop")}<span><b>Start a new 14-day cycle</b><small>Currently cycle ${store.get().cycle.id}. Past cycles are kept.</small></span></button>
        <button data-a="clear" class="danger">${icon("trash")}<span><b>Erase data on this device</b><small>${u ? "Your cloud copy is not affected" : "This can't be undone"}</small></span></button>
        ${u ? `<button data-a="clearcloud" class="danger">${icon("trash")}<span><b>Delete my cloud data</b><small>Removes your sessions from your account and signs you out</small></span></button>` : ""}
      </div>
      <input type="file" id="restore-file" accept="application/json,.json" hidden>

      ${installEvt || isIOS() ? `<h2 class="h-sec">Install</h2><div class="settings">${installEvt ? `<button class="btn primary small" data-a="install">Install ${APP_NAME}</button>` : `<p class="hint">On iPhone: tap the Share button in Safari, then <b>Add to Home Screen</b>.</p>`}</div>` : ""}

      <p class="foot muted small">${APP_NAME} · v1.0 · <a href="#/guide">The method</a> · <a href="#/welcome" data-a="intro">Intro</a><br>Your journal is private. Without sign-in, nothing leaves your device.</p>
    </section>`;

  $$("[data-set]").forEach((b) => (b.onclick = () => {
    const k = b.dataset.set; const v = k === "duration" ? +b.dataset.val : b.dataset.val;
    store.setSettings({ [k]: v });
    $$(`[data-set=${k}]`).forEach((x) => x.classList.toggle("on", x === b));
    if (k === "voice") { audio.unlock(); audio.setVolumes({ voice: store.settings().voiceVolume, chime: store.settings().chimeVolume }); audio.playVoice(v, "preview"); }
  }));
  $$("[data-range]").forEach((r) => (r.onchange = () => { store.setSettings({ [r.dataset.range]: +r.value }); audio.setVolumes({ voice: store.settings().voiceVolume, chime: store.settings().chimeVolume }); }));
  $$("[data-tog]").forEach((c) => (c.onchange = () => store.setSettings({ [c.dataset.tog]: c.checked })));
  $("[data-time]").onchange = (e) => store.setSettings({ reminderTime: e.target.value || "07:00" });
  const on = (a, fn) => { const el = $(`[data-a=${a}]`); if (el) el.onclick = fn; };
  on("testsound", async () => { audio.unlock(); const st2 = store.settings(); audio.setVolumes({ voice: st2.voiceVolume, chime: st2.chimeVolume }); audio.chime(1); setTimeout(() => audio.playVoice(st2.voice, "preview"), 2500); });
  on("google", () => cloud.signIn("google"));
  on("apple", () => cloud.signIn("apple"));
  on("signout", async () => { await cloud.signOutNow(); toast("Signed out. Your data stays on this device."); });
  on("sync", () => cloud.syncNow());
  on("ics", () => download("observer-reminders.ics", ics(store.settings().reminderTime), "text/calendar"));
  on("backup", () => download(`observer-backup-${localDateKey()}.json`, JSON.stringify(store.exportData(), null, 1), "application/json"));
  on("restore", () => $("#restore-file").click());
  $("#restore-file").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const n = store.importData(JSON.parse(await f.text())); toast(`Restored ${n} entr${n === 1 ? "y" : "ies"}`); render(); }
    catch (err) { toast(err.message || "Couldn't read that file"); }
  };
  on("newcycle", () => { const b = $("[data-a=newcycle]"); if (!b.dataset.armed) { b.dataset.armed = 1; b.querySelector("b").textContent = "Tap again to start a new cycle"; return; } store.newCycle(); toast(`Cycle ${store.get().cycle.id} started`); render(); });
  on("clear", () => { const b = $("[data-a=clear]"); if (!b.dataset.armed) { b.dataset.armed = 1; b.querySelector("b").textContent = "Tap again to erase everything here"; return; } store.clearAll(); toast("Erased"); go("#/today"); });
  on("clearcloud", async () => { const b = $("[data-a=clearcloud]"); if (!b.dataset.armed) { b.dataset.armed = 1; b.querySelector("b").textContent = "Tap again to delete cloud data"; return; } await cloud.deleteCloudData(); toast("Cloud data deleted"); render(); });
  on("install", async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; render(); });
  on("intro", () => store.setSettings({ seenIntro: false }));
}

function ics(time) {
  const [hh, mm] = (time || "07:00").split(":").map(Number);
  const d = new Date(); d.setHours(hh, mm, 0, 0);
  if (d < new Date()) d.setDate(d.getDate() + 1);
  const z = (n) => String(n).padStart(2, "0");
  const stamp = (x) => `${x.getFullYear()}${z(x.getMonth() + 1)}${z(x.getDate())}T${z(x.getHours())}${z(x.getMinutes())}00`;
  const end = new Date(d.getTime() + 30 * 60000);
  const now = new Date();
  const utc = `${now.getUTCFullYear()}${z(now.getUTCMonth() + 1)}${z(now.getUTCDate())}T${z(now.getUTCHours())}${z(now.getUTCMinutes())}00Z`;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Observer//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${uid()}@observer`, `DTSTAMP:${utc}`, `DTSTART:${stamp(d)}`, `DTEND:${stamp(end)}`,
    "RRULE:FREQ=DAILY;COUNT=14", `SUMMARY:${APP_NAME}: today's session`,
    `DESCRIPTION:30 minutes. Dim room\\, quiet. Rate immediately afterwards. ${location.origin}${location.pathname}`,
    `URL:${location.origin}${location.pathname}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${APP_NAME}`, "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

// ---------------------------------------------------------------- install
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; if (/today|^$/.test(document.body.dataset.view)) render(); });
function installBanner() {
  if (localStorage.getItem("observer.hideInstall")) return "";
  if (installEvt) return `<div class="card install"><span><b>Install ${APP_NAME}</b><small>Works offline, opens full-screen.</small></span><button class="btn primary small" data-a="install">Install</button><button class="x" data-a="hideinstall" aria-label="Dismiss">×</button></div>`;
  if (isIOS()) return `<div class="card install"><span><b>Add to your Home Screen</b><small>In Safari, tap Share, then “Add to Home Screen”.</small></span><button class="x" data-a="hideinstall" aria-label="Dismiss">×</button></div>`;
  return "";
}
function wireInstall() {
  const i = $("[data-a=install]", view); if (i) i.onclick = async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; render(); };
  const h = $("[data-a=hideinstall]", view); if (h) h.onclick = () => { localStorage.setItem("observer.hideInstall", "1"); h.closest(".install").remove(); };
}

// ---------------------------------------------------------------- icons
function icon(n) {
  const p = {
    back: '<path d="M15 5l-7 7 7 7"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    down: '<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>',
    up: '<path d="M12 20V8M6 13l6-6 6 6M4 4h16"/>',
    loop: '<path d="M4 12a8 8 0 0114-5.3L20 9M20 4v5h-5M20 12a8 8 0 01-14 5.3L4 15M4 20v-5h5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    google: '<path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 01-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4" stroke="none"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0012 22z" fill="#34A853" stroke="none"/><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 000 9.2L6.4 14z" fill="#FBBC05" stroke="none"/><path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 003.1 7.4L6.4 10C7.2 7.7 9.4 5.9 12 5.9z" fill="#EA4335" stroke="none"/>',
    apple: '<path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.5-1-2.5-4zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4z" fill="currentColor" stroke="none"/>',
  }[n] || "";
  return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
}

// ---------------------------------------------------------------- boot
cloud.onCloud(() => {
  const v = document.body.dataset.view;
  if (["me", "today", "journal", "progress"].includes(v)) render();
});
store.subscribe(() => {});
cloud.restore();
render();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
