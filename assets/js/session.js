// The live session screen: timeline, sound cues, dark display.
import { PHASES, buildPlan } from "./content.js";
import { CUE_DURATION } from "./cues-data.js";
import * as audio from "./audio.js";

// For testing only: localStorage "observer.speed" = 60 makes a session run 60x faster.
const SPEED = Math.max(1, +(localStorage.getItem("observer.speed") || 1));

const clock = (sec) => {
  sec = Math.max(0, Math.round(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
};

export function runSession(root, { minutes, guidance }, onDone) {
  const total = minutes * 60;
  const plan = buildPlan(minutes, guidance, CUE_DURATION);
  const endId = guidance === "guided" ? "g_end" : guidance === "minimal" ? "m_end" : null;
  const voiceIds = [...new Set(plan.filter((c) => c.type === "voice").map((c) => c.id)), endId].filter(Boolean);

  let startedAt = 0, pausedAt = 0, pausedTotal = 0;
  let running = false, finished = false;
  let phase = 0;
  let timer = null, restTimer = null, uiTimer = null;
  let wakeLock = null;
  let closed = false;
  const fired = new Set();

  root.innerHTML = `
    <div class="session" data-phase="0" data-state="arrive">
      <div class="field"><div class="orb"></div><div class="halo"></div><div class="grain"></div></div>
      <div class="s-arrive">
        <p class="s-arrive-t">Put the phone down,<br>and let yourself arrive.</p>
        <p class="s-arrive-h">${guidance === "silent" ? "Close your eyes when you hear the bell." : "Just listen. Tap the screen any time to pause."}</p>
      </div>
      <div class="s-top">
        <span class="s-phase"><b class="s-phase-n">1</b> <span class="s-phase-name">${PHASES[0].name}</span></span>
        <span class="s-time">${clock(total)}</span>
      </div>
      <p class="s-line">${PHASES[0].line}</p>
      <div class="s-controls">
        <button class="btn ghost s-pause" type="button">Pause</button>
        <button class="btn ghost s-end" type="button">End</button>
      </div>
      <div class="s-done">
        <p class="eyebrow s-done-e">Session complete</p>
        <h2 class="display s-done-h">Take your time<br><em>before you get up.</em></h2>
        <button class="btn primary s-finish" type="button">Finish</button>
      </div>
    </div>`;

  const el = root.querySelector(".session");
  const $ = (s) => el.querySelector(s);
  const timeEl = $(".s-time");

  audio.unlock();
  audio.preload(voiceIds);

  // ---- wake lock: keep the screen (dimly) on so timing and sound stay reliable
  async function lockScreen() {
    try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch {}
  }
  const onVis = () => {
    if (document.visibilityState === "visible") { if (!finished) lockScreen(); audio.resume(); tickLoop(); }
  };
  document.addEventListener("visibilitychange", onVis);
  lockScreen();

  const elapsed = () => {
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
    timeEl.textContent = clock(total - t);
    setPhase(t >= (2 * total) / 3 ? 2 : t >= total / 3 ? 1 : 0);
    plan.forEach((c, i) => {
      if (fired.has(i) || c.at > t) return;
      fired.add(i);
      const late = t - c.at;
      // If the phone slept and we're catching up, skip sounds that are no longer timely.
      if (c.type === "chime" && late < 6) audio.chime(c.count);
      if (c.type === "pretone" && late < 2) audio.pretone();
      if (c.type === "voice" && late < 15) audio.playVoice(c.id);
      if (c.type === "end") finish(false);
    });
  }

  function finish(early) {
    if (finished) return;
    const actual = Math.min(elapsed(), total);
    finished = true;
    running = false;
    clearInterval(timer);
    el.dataset.state = "done";
    el.classList.remove("rest", "reveal", "paused");
    const mins = Math.max(1, Math.round(actual / 60));
    if (early) {
      audio.stopVoice(1.2);
      audio.chime(1);
      $(".s-done-e").textContent = `Ended after ${mins} min`;
      $(".s-done-h").innerHTML = `That's fine.<br><em>Every sit counts.</em>`;
    } else {
      audio.stopVoice(1.2);
      const dur = audio.chime(3);
      if (endId) setTimeout(() => { if (!closed) audio.playVoice(endId); }, (dur - 1) * 1000);
      $(".s-done-e").textContent = `Session complete · ${minutes} min`;
    }
    try { wakeLock && wakeLock.release(); } catch {}
  }

  $(".s-finish").onclick = () => {
    closed = true;
    audio.stopVoice(1.2);
    cleanup();
    onDone();
  };

  function cleanup() {
    clearInterval(timer); clearTimeout(restTimer); clearTimeout(uiTimer);
    document.removeEventListener("visibilitychange", onVis);
    try { wakeLock && wakeLock.release(); } catch {}
  }

  // ---- display resting: everything fades very low after a few seconds
  function rest() {
    clearTimeout(restTimer);
    restTimer = setTimeout(() => el.classList.add("rest"), 8000);
  }

  function reveal() {
    if (el.dataset.state === "arrive") el.dataset.state = "running";
    el.classList.remove("rest");
    el.classList.add("reveal");
    clearTimeout(uiTimer);
    uiTimer = setTimeout(() => { if (!running) return; el.classList.remove("reveal"); resetEndBtn(); rest(); }, 6000);
  }

  // ---- a tap on the dark screen shows the time and controls
  el.addEventListener("pointerup", (e) => {
    if (e.target.closest("button")) return;
    if (finished) return;
    reveal();
  });

  // ---- controls
  const pauseBtn = $(".s-pause");
  pauseBtn.onclick = () => {
    if (finished) return;
    if (running) {
      running = false; pausedAt = Date.now(); audio.stopVoice(1);
      pauseBtn.textContent = "Resume"; el.classList.add("paused");
      clearTimeout(uiTimer);
    } else {
      pausedTotal += Date.now() - pausedAt; running = true;
      pauseBtn.textContent = "Pause"; el.classList.remove("paused");
      reveal(); tickLoop();
    }
  };
  const endBtn = $(".s-end");
  function resetEndBtn() { endBtn.textContent = "End"; endBtn.dataset.armed = ""; }
  endBtn.onclick = () => {
    if (endBtn.dataset.armed) { finish(true); return; }
    endBtn.dataset.armed = "1"; endBtn.textContent = "Tap again to end";
    reveal();
  };

  // ---- start straight away; the opening words fade after a few seconds
  startedAt = Date.now();
  running = true;
  timer = setInterval(tickLoop, 250);
  setTimeout(() => { if (el.dataset.state === "arrive") { el.classList.add("rest"); el.dataset.state = "running"; } }, 9000 / Math.min(SPEED, 9));
  tickLoop();

  return { abort: () => { cleanup(); audio.stopVoice(0.3); } };
}
