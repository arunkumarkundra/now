// Sound: pre-recorded voice clips + soft synthesized tones (no files needed for tones).

let ctx = null;
let master, voiceGain, chimeGain;
const buffers = new Map(); // "voice/id" -> AudioBuffer
let current = null; // currently playing voice source

export function unlock() {
  // Must be called from a tap. Makes iOS play through the silent switch where supported.
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    voiceGain = ctx.createGain(); voiceGain.connect(master);
    chimeGain = ctx.createGain(); chimeGain.connect(master);
  }
  if (ctx.state === "suspended") ctx.resume();
  // play one silent frame to fully unlock on older iOS
  const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
  return ctx;
}

export function setVolumes({ voice = 0.9, chime = 0.6 } = {}) {
  if (!ctx) return;
  voiceGain.gain.value = voice;
  chimeGain.gain.value = chime;
}

export function resume() { if (ctx && ctx.state !== "running") ctx.resume(); }
export function suspend() { if (ctx && ctx.state === "running") ctx.suspend(); }

const url = (voice, id) => `assets/audio/${voice}/${id}.mp3`;

async function load(voice, id) {
  const k = `${voice}/${id}`;
  if (buffers.has(k)) return buffers.get(k);
  const res = await fetch(url(voice, id));
  if (!res.ok) throw new Error("Missing audio " + k);
  const arr = await res.arrayBuffer();
  const buf = await new Promise((ok, fail) => ctx.decodeAudioData(arr, ok, fail));
  buffers.set(k, buf);
  return buf;
}

export async function preload(voice, ids) {
  unlock();
  const results = await Promise.allSettled(ids.map((id) => load(voice, id)));
  return results.filter((r) => r.status === "rejected").length === 0;
}

export async function playVoice(voice, id) {
  unlock();
  stopVoice();
  let buf;
  try { buf = await load(voice, id); } catch (e) { console.warn(e); return; }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain(); g.gain.value = 1;
  src.connect(g); g.connect(voiceGain);
  src.start();
  current = { src, g };
  return new Promise((done) => { src.onended = () => { if (current?.src === src) current = null; done(); }; });
}

export function stopVoice(fade = 0.4) {
  if (!current || !ctx) return;
  const { src, g } = current;
  const t = ctx.currentTime;
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.linearRampToValueAtTime(0, t + fade);
  try { src.stop(t + fade + 0.05); } catch {}
  current = null;
}

/** A soft glass-like tone. count = how many strikes, spaced apart. */
export function chime(count = 1, { pitch = 587.33 } = {}) {
  unlock();
  const now = ctx.currentTime + 0.05;
  for (let i = 0; i < count; i++) {
    const t = now + i * 2.2;
    const partials = [
      [1, 0.55, 5.5],
      [2.01, 0.16, 3.2],
      [2.76, 0.07, 2.2],
      [5.4, 0.02, 0.9],
    ];
    for (const [mul, amp, decay] of partials) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = pitch * mul;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp * 0.5, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g); g.connect(chimeGain);
      o.start(t); o.stop(t + decay + 0.1);
    }
  }
  return (count - 1) * 2.2 + 4;
}

/** A barely-there tick to confirm a tap without waking you up. */
export function tick(high = false) {
  unlock();
  const t = ctx.currentTime + 0.01;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = "sine"; o.frequency.value = high ? 1320 : 880;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.08, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g); g.connect(chimeGain); o.start(t); o.stop(t + 0.2);
}
