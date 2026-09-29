// All the words and the session timeline live here, so they are easy to change.

export const APP_NAME = "Observer";

export const PHASES = [
  { n: 1, name: "Breath",   line: "Attention on the breath. Notice wandering, and return." },
  { n: 2, name: "Let go",   line: "Let everything appear. No need to be the observer." },
  { n: 3, name: "Look",     line: "Where exactly is the observer? Look. Don't answer." },
];

export const DURATIONS = [15, 30, 45];

export const GUIDANCE = {
  guided:  { name: "Guided",  desc: "A gentle settling-in, full instructions for each phase, and a few quiet reminders." },
  minimal: { name: "Minimal", desc: "A short settling-in and one key line at each phase. Mostly silence." },
  silent:  { name: "Silent",  desc: "Bells only: one to begin, two at each change of phase, three at the end." },
};

export const DEFAULTS = { minutes: 30, guidance: "guided" };

export const PREP = [
  ["Sit comfortably", "Upright but relaxed, on a chair or cushion."],
  ["Dim and quiet", "Somewhere you won't be disturbed for the whole session."],
  ["Volume low", "The voice starts softly. You can adjust it in the first minute."],
  ["Phone face-down", "The screen fades to black. Tap it any time to pause or end."],
];

/**
 * The timeline of a session, in seconds from Begin.
 * Returns [{ at, type: "voice"|"chime"|"pretone"|"phase"|"end", id?, count?, phase? }]
 * A "pretone" is a very soft swell that comes before a reminder, so the voice never arrives out of silence.
 */
export function buildPlan(minutes, guidance, durations = {}) {
  const total = minutes * 60;
  const P = total / 3;
  const plan = [];
  const d = (id) => durations[id] || 10;
  const chime = (at, count) => plan.push({ at, type: "chime", count });
  const voice = (at, id, soft = false) => {
    if (soft) plan.push({ at: at - 3.5, type: "pretone" });
    plan.push({ at, type: "voice", id });
    return at + d(id);
  };

  chime(2, 1);
  plan.push({ at: P, type: "phase", phase: 1 });
  plan.push({ at: 2 * P, type: "phase", phase: 2 });
  chime(P, 2);
  chime(2 * P, 2);

  if (guidance === "guided") {
    const introEnd = voice(7, "g_intro");
    const p1End = voice(introEnd + 2, "g_p1_start");
    voice(Math.max(P * 0.5, p1End + 40), "g_p1_mid", true);
    voice(P * 0.82, "g_p1_late", true);
    const p2End = voice(P + 6, "g_p2_start");
    voice(Math.max(P + P * 0.5, p2End + 40), "g_p2_mid", true);
    voice(P + P * 0.82, "g_p2_late", true);
    const p3End = voice(2 * P + 6, "g_p3_start");
    voice(Math.max(2 * P + P * 0.35, p3End + 45), "g_p3_drop", true);
    voice(2 * P + P * 0.78, "g_p3_late", true);
  } else if (guidance === "minimal") {
    const introEnd = voice(7, "m_intro");
    voice(introEnd + 2, "m_p1_start");
    voice(P + 6, "m_p2_start");
    const p3End = voice(2 * P + 6, "m_p3_start");
    voice(Math.max(2 * P + P * 0.3, p3End + 45), "m_p3_drop", true);
  }
  plan.push({ at: total, type: "end" });
  return plan.sort((a, b) => a.at - b.at);
}
