// Sound: pre-recorded voice clips + soft synthesized bells (no files needed for bells).
// Everything here is designed not to startle: the voice fades in, bells swell rather than strike.

let ctx = null;
let master, voiceGain, chimeGain;
const buffers = new Map(); // id -> AudioBuffer
let current = null; // currently playing voice

const VOICE_LEVEL = 0.8;
const CHIME_LEVEL = 0.45;
const FADE_IN = 3.5;  // seconds for the voice to rise from soft to full level
const FADE_FROM = 0.25; // starting level (about a quarter: soft, but the first words are still clear)

export function unlock() {
  // Must be called from a tap. Makes iOS play through the silent switch where supported.
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    voiceGain = ctx.createGain(); voiceGain.gain.value = VOICE_LEVEL; voiceGain.connect(master);
    chimeGain = ctx.createGain(); chimeGain.gain.value = CHIME_LEVEL; chimeGain.connect(master);
  }
  if (ctx.state === "suspended") ctx.resume();
  // play one silent frame to fully unlock on older iOS
  const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
  return ctx;
}

export function resume() { if (ctx && ctx.state !== "running") ctx.resume(); }

const url = (id) => `assets/audio/calm/${id}.mp3`;

async function load(id) {
  if (buffers.has(id)) return buffers.get(id);
  const res = await fetch(url(id));
  if (!res.ok) throw new Error("Missing audio " + id);
  const arr = await res.arrayBuffer();
  const buf = await new Promise((ok, fail) => ctx.decodeAudioData(arr, ok, fail));
  buffers.set(id, buf);
  return buf;
}

export async function preload(ids) {
  unlock();
  await Promise.allSettled(ids.map(load));
}

// A smooth S-shaped rise from `from` to 1.
function riseCurve(from, steps = 64) {
  const c = new Float32Array(steps);
  for (let i = 0; i < steps; i++) {
    const x = i / (steps - 1);
    const s = x * x * (3 - 2 * x); // smoothstep
    c[i] = from + (1 - from) * s;
  }
  return c;
}

/** Play a voice cue. It starts very quietly and rises over a few seconds. */
export async function playVoice(id) {
  unlock();
  stopVoice();
  let buf;
  try { buf = await load(id); } catch (e) { console.warn(e); return; }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  const t = ctx.currentTime + 0.05;
  g.gain.value = FADE_FROM;
  g.gain.setValueCurveAtTime(riseCurve(FADE_FROM), t, FADE_IN);
  src.connect(g); g.connect(voiceGain);
  src.start(t);
  current = { src, g };
  return new Promise((done) => { src.onended = () => { if (current?.src === src) current = null; done(); }; });
}

export function stopVoice(fade = 0.8) {
  if (!current || !ctx) return;
  const { src, g } = current;
  const t = ctx.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.linearRampToValueAtTime(0, t + fade);
  try { src.stop(t + fade + 0.05); } catch {}
  current = null;
}

/**
 * A soft bell, like a small singing bowl touched lightly. count = how many, spaced apart.
 * The attack is slowed down so it blooms instead of striking. Returns the seconds it lasts.
 */
export function chime(count = 1, { pitch = 392 } = {}) {
  unlock();
  const now = ctx.currentTime + 0.05;
  const gap = 3.2;
  for (let i = 0; i < count; i++) {
    const t = now + i * gap;
    const partials = [
      // [frequency multiple, level, decay seconds, slight detune for a gentle beat]
      [1, 0.5, 8.0, 0.6],
      [2.02, 0.14, 5.0, 0],
      [2.99, 0.05, 3.2, 0],
      [4.2, 0.015, 1.6, 0],
    ];
    for (const [mul, amp, decay, beat] of partials) {
      for (const det of beat ? [-beat / 2, beat / 2] : [0]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = pitch * mul + det;
        const a = beat ? amp / 2 : amp;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(a, t + 0.09);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        o.connect(g); g.connect(chimeGain);
        o.start(t); o.stop(t + decay + 0.1);
      }
    }
  }
  return (count - 1) * gap + 6;
}

/** A barely-there low swell, a few seconds before a reminder, so the voice never comes out of nowhere. */
export function pretone() {
  unlock();
  const t = ctx.currentTime + 0.05;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 1.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
  g.connect(chimeGain);
  for (const [f, lvl] of [[196, 1], [294, 0.45], [392.5, 0.2]]) {
    const o = ctx.createOscillator(); const og = ctx.createGain();
    o.type = "sine"; o.frequency.value = f; og.gain.value = lvl;
    o.connect(og); og.connect(g); o.start(t); o.stop(t + 5.1);
  }
}
