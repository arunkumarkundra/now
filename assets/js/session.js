// The live session screen: timeline, sound cues, dark display, taps.
import { PHASES, buildPlan } from "./content.js";
import { CUE_DURATION } from "./cues-data.js";
import * as audio from "./audio.js";
import { fmtClock } from "./store.js";

const DOUBLE_TAP_MS = 380;
// For testing only: localStorage "observer.speed" = 60 makes a session run 60x faster.
const SPEED = Math.max(1, +(localStorage.getItem("observer.speed") || 1));

export function runSession(root, opts, onDone) {
  const { minutes, guidance, voice, showTimer, countNoticing, haptics, voiceVolume, chimeVolume } = opts;
  const total = minutes * 60;
  const plan = buildPlan(minutes, guidance, CUE_DURATION[voice]);
  const voiceIds = [...new Set(plan.filter((c) => c.type === "voice").map((c) => c.id)), guidance === "guided" ? "g_end" : "m_end"];

  let startedAt = 0, pausedAt = 0, pausedTotal = 0;
  let running = false, finished = false;
  let phase = 0;
  let timer = null, restTimer = null, uiTimer = null, tapTimer = null;
  let lastTap = 0;
  let wakeLock = null;
  const fired = new Set();
  const markers = [];
  let noticeCount = 0;

  root.innerHTML = `
    <div class="session" data-phase="0" data-state="countdown">
      <div class="field"><div class="orb"></div><div class="halo"></div><div class="grain"></div></div>
      <div class="s-count">
        <p class="s-count-n">8</p>
        <p class="s-count-t">Put the phone down, screen up or down.<br>Close your eyes when the tone sounds.</p>
        <p class="s-count-h">Double-tap anywhere to mark a moment${countNoticing ? ".<br>In phase 1, single-tap each time you notice you've wandered" : ""}.</p>
      </div>
      <div class="s-top">
        <span class="s-phase"><b class="s-phase-n">1</b> <span class="s-phase-name">${PHASES[0].name}</span></span>
        <span class="s-time mono">${showTimer ? fmtClock(total) : ""}</span>
      </div>
      <p class="s-line">${PHASES[0].line}</p>
      <div class="s-toast" aria-live="polite"></div>
      <div class="s-controls">
        <button class="btn ghost s-pause" type="button">Pause</button>
        <button class="btn ghost s-mark" type="button">Mark moment</button>
        <button class="btn ghost s-end" type="button">End</button>
      </div>
      <div class="s-done">
        <p class="eyebrow">Session complete</p>
        <h2 class="display">Rate it now,<br><em>before you interpret it.</em></h2>
        <button class="btn primary s-rate" type="button">Record ratings</button>
      </div>
    </div>`;

  const el = root.querySelector(".session");
  const $ = (s) => el.querySelector(s);
  const timeEl = $(".s-time");

  audio.unlock();
  audio.setVolumes({ voice: voiceVolume, chime: chimeVolume });
  audio.preload(voice, voiceIds);

  // ---- wake lock: keep the screen (dimly) on so timing and sound stay reliable
  async function lockScreen() {
    try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch {}
  }
  const onVis = () => {
    if (document.visibilityState === "visible") { if (!finished) lockScreen(); audio.resume(); tickLoop(); }
  };
  document.addEventListener("visibilitychange", onVis);
  lockScreen();

  // ---- countdown
  let n = 8;
  const cd = setInterval(() => {
    n--;
    $(".s-count-n").textContent = n;
    if (n <= 0) { clearInterval(cd); begin(); }
  }, 1000);

  function begin() {
    el.dataset.state = "running";
    startedAt = Date.now();
    running = true;
    timer = setInterval(tickLoop, 250);
    rest();
    tickLoop();
  }

  const elapsed = () => {
    if (!startedAt) return 0;
    const now = running ? Date.now() : pausedAt;
    return ((now - startedAt - pausedTotal) / 1000) * SPEED;
  };

  function setPhase(p) {
    if (p === phase) return;
    phase = p;
    el.dataset.phase = String(p);
    $(".s-phase-n").textContent = p + 1;
    $(".s-phase-name").textContent = PHASES[p].name;
    $(".s-line").textContent = PHASES[p].line;
  }

  function tickLoop() {
    if (!running || finished) return;
    const t = elapsed();
    if (showTimer) timeEl.textContent = fmtClock(total - t);
    setPhase(t >= (2 * total) / 3 ? 2 : t >= total / 3 ? 1 : 0);
    plan.forEach((c, i) => {
      if (fired.has(i) || c.at > t) return;
      fired.add(i);
      const late = t - c.at;
      if (c.type === "chime" && late < 6) audio.chime(c.count);
      if (c.type === "voice" && late < 20) audio.playVoice(voice, c.id);
      if (c.type === "end") finish(false);
    });
  }

  async function finish(early) {
    if (finished) return;
    const actual = Math.round(Math.min(elapsed(), total));
    finished = true;
    running = false;
    clearInterval(timer);
    el.dataset.state = "done";
    el.classList.remove("rest", "reveal");
    if (!early) {
      audio.stopVoice(0.2);
      audio.chime(3);
      if (guidance !== "silent") setTimeout(() => audio.playVoice(voice, guidance === "guided" ? "g_end" : "m_end"), 4600);
    } else {
      audio.stopVoice(0.6);
      audio.chime(1);
    }
    try { wakeLock && wakeLock.release(); } catch {}
    $(".s-rate").onclick = () => {
      audio.stopVoice(0.5);
      cleanup();
      onDone({ durationActual: actual, endedEarly: early, completed: !early, markers, noticeCount: countNoticing ? noticeCount : null });
    };
  }

  function cleanup() {
    clearInterval(timer); clearInterval(cd); clearTimeout(restTimer); clearTimeout(uiTimer); clearTimeout(tapTimer);
    document.removeEventListener("visibilitychange", onVis);
    try { wakeLock && wakeLock.release(); } catch {}
  }

  // ---- display resting: everything fades very low after a few seconds
  function rest() {
    clearTimeout(restTimer);
    restTimer = setTimeout(() => el.classList.add("rest"), 12000);
  }

  function reveal() {
    el.classList.remove("rest");
    el.classList.add("reveal");
    clearTimeout(uiTimer);
    uiTimer = setTimeout(() => { el.classList.remove("reveal"); resetEndBtn(); rest(); }, 6000);
  }

  function toast(msg) {
    const t = $(".s-toast");
    t.textContent = msg;
    t.classList.add("on");
    setTimeout(() => t.classList.remove("on"), 1800);
  }

  function buzz(ms) { if (haptics && navigator.vibrate) try { navigator.vibrate(ms); } catch {} }

  function mark() {
    if (!running) return;
    const t = Math.round(elapsed());
    markers.push({ t, phase: phase + 1, note: "" });
    audio.tick(true);
    buzz([15, 60, 15]);
    toast(`Moment marked · ${fmtClock(t)}`);
  }

  // ---- taps on the dark field
  el.addEventListener("pointerup", (e) => {
    if (e.target.closest("button")) return;
    if (el.dataset.state !== "running") return;
    const now = Date.now();
    if (now - lastTap < DOUBLE_TAP_MS) {
      clearTimeout(tapTimer); lastTap = 0; mark(); return;
    }
    lastTap = now;
    tapTimer = setTimeout(() => {
      if (countNoticing && phase === 0 && running) {
        noticeCount++; audio.tick(false); buzz(10); toast(`Noticed · ${noticeCount}`);
      } else reveal();
    }, DOUBLE_TAP_MS);
  });

  // ---- controls
  $(".s-pause").onclick = () => {
    if (finished) return;
    if (running) {
      running = false; pausedAt = Date.now(); audio.stopVoice(0.3);
      $(".s-pause").textContent = "Resume"; el.classList.add("paused");
      clearTimeout(uiTimer);
    } else {
      pausedTotal += Date.now() - pausedAt; running = true;
      $(".s-pause").textContent = "Pause"; el.classList.remove("paused");
      reveal(); tickLoop();
    }
  };
  $(".s-mark").onclick = () => { mark(); reveal(); };
  const endBtn = $(".s-end");
  function resetEndBtn() { endBtn.textContent = "End"; endBtn.dataset.armed = ""; }
  endBtn.onclick = () => {
    if (endBtn.dataset.armed) { finish(true); return; }
    endBtn.dataset.armed = "1"; endBtn.textContent = "Tap again to end";
    reveal();
  };

  return { abort: () => { cleanup(); audio.stopVoice(0.2); } };
}
