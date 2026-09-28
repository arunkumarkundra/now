// All the words and structure of the practice live here, so they are easy to change.

export const APP_NAME = "Observer";
export const PROGRAM_LENGTH = 14; // sessions in one experiment cycle

export const PHASES = [
  {
    key: "stabilize", n: 1, name: "Stabilize", short: "Attention",
    line: "Attention on the breath. Notice wandering, and return.",
    guide: [
      "Close your eyes. Put attention on the physical sensation of breathing, preferably around the nose.",
      "Don't manipulate the breath. Your only job: notice when attention has wandered, and return.",
      "Don't fight thoughts. Don't suppress them. The measure of success isn't “no thoughts”. It's how quickly you noticed that attention had wandered.",
    ],
  },
  {
    key: "release", n: 2, name: "Remove the anchor", short: "Release",
    line: "Let everything appear. No need to be the observer.",
    guide: [
      "Stop concentrating on the breath. Let everything appear in awareness without deliberately following anything: sounds, sensations, thoughts, images, emotions.",
      "The unusual instruction: don't identify yourself as the observer. Don't think “I am observing my thoughts.” Notice that thoughts, sensations and awareness are simply occurring.",
      "If a thought says “I'm doing this badly”, that's another event. If a sensation says “my leg hurts”, another event. Don't suppress anything. Don't pursue anything.",
    ],
  },
  {
    key: "inquiry", n: 3, name: "The experiment", short: "Inquiry",
    line: "Where exactly is the observer? Look. Don't answer.",
    guide: [
      "Ask one question: “Where exactly is the observer?”",
      "Don't answer intellectually. Not “the brain”, not “behind my eyes”, not “consciousness”. Actually look. If you find a location, investigate it: is the observer there, or merely a sensation, image or thought about an observer?",
      "Then stop asking. For the remaining time, look without constructing an answer.",
    ],
  },
];

// The 12 post-session ratings, 0–10. Labels and anchors follow the protocol.
export const MEASURES = [
  { key: "thought",    label: "Thought activity",             short: "Thought activity",           lo: "continuous",          hi: "almost absent" },
  { key: "attention",  label: "Attention stability",          short: "Attention",                  lo: "chaotic",             hi: "extremely stable" },
  { key: "body",       label: "Body awareness",               short: "Body",                       lo: "ordinary",            hi: "almost absent" },
  { key: "self",       label: "Sense of self",                short: "Self",                       lo: "completely ordinary", hi: "almost absent" },
  { key: "space",      label: "Sense of space",               short: "Space",                      lo: "ordinary",            hi: "radically altered" },
  { key: "time",       label: "Sense of time",                short: "Time",                       lo: "ordinary",            hi: "radically altered" },
  { key: "vivid",      label: "Perceptual vividness",         short: "Vividness",                  lo: "ordinary",            hi: "extraordinarily vivid" },
  { key: "reality",    label: "Sense of reality",             short: "Reality",                    lo: "ordinary",            hi: "unusually intense" },
  { key: "peace",      label: "Peace / equanimity",           short: "Peace",                      lo: "none",                hi: "extreme" },
  { key: "agency",     label: "Agency",                       short: "Agency",                     lo: "completely normal",   hi: "greatly reduced" },
  { key: "separation", label: "Observer/observed separation", short: "Observer separation",        lo: "completely distinct", hi: "absent" },
  { key: "confidence", label: "Confidence in interpretation", short: "Interpretation confidence",  lo: "uncertain",           hi: "absolutely certain" },
];

// Measures that describe how "altered" the state was; averaged into the Alteration index.
export const ALTERATION_KEYS = ["body", "self", "space", "time", "vivid", "reality", "agency", "separation"];

export const CONDITIONS = [
  { key: "dim",      label: "Dim or dark room",               short: "dim room" },
  { key: "quiet",    label: "Quiet",                          short: "quiet" },
  { key: "temp",     label: "Comfortable temperature",        short: "comfortable temperature" },
  { key: "private",  label: "Won't be disturbed",             short: "undisturbed" },
  { key: "slept",    label: "Slept normally",                 short: "normal sleep" },
  { key: "clear",    label: "No alcohol or substances today", short: "no substances" },
];

export const DURATIONS = [15, 20, 30, 45];

export const GUIDANCE = {
  guided:  { name: "Guided",  desc: "Spoken instructions at the start of each phase, and a few sparse reminders." },
  minimal: { name: "Minimal", desc: "One short spoken line at each transition. Mostly silence." },
  silent:  { name: "Silent",  desc: "Soft tones only. Closest to the protocol's “no app”." },
};

export const SAFETY_SIGNS = [
  "persistent unreality or detachment from yourself (derealization / depersonalization)",
  "significant anxiety",
  "insomnia",
  "confusion or paranoia",
  "difficulty functioning outside the sessions",
];

export const RULE = {
  title: "Don't try to manufacture an experience.",
  results: [
    "If nothing happens",
    "If you become extremely peaceful",
    "If your body feels enormous",
    "If your body disappears",
    "If time seems to stop",
    "If you see lights",
    "If you sense another presence",
    "If you become convinced you've discovered something profound",
  ],
};

/**
 * Build the timeline of cues for a session.
 * Returns [{ at: seconds, type: "voice"|"chime", id?, count?, phase? }]
 */
export function buildPlan(minutes, guidance, durations) {
  const total = minutes * 60;
  const P = total / 3;
  const plan = [];
  const d = (id) => (durations && durations[id]) || 10;
  const chime = (at, count) => plan.push({ at, type: "chime", count });
  const voice = (at, id) => plan.push({ at, type: "voice", id });

  chime(0, 1);
  plan.push({ at: P, type: "phase", phase: 1 });
  plan.push({ at: 2 * P, type: "phase", phase: 2 });
  chime(P, 2);
  chime(2 * P, 2);

  if (guidance === "guided") {
    voice(3, "g_intro");
    voice(3 + d("g_intro") + 1.5, "g_p1_start");
    voice(P * 0.45, "g_p1_mid");
    voice(P * 0.8, "g_p1_late");
    voice(P + 4.8, "g_p2_start");
    voice(P + P * 0.45, "g_p2_mid");
    voice(P + P * 0.8, "g_p2_late");
    voice(2 * P + 4.8, "g_p3_start");
    voice(2 * P + Math.max(P * 0.3, d("g_p3_start") + 60), "g_p3_drop");
    voice(2 * P + P * 0.72, "g_p3_late");
  } else if (guidance === "minimal") {
    voice(3, "m_p1_start");
    voice(P + 4.8, "m_p2_start");
    voice(2 * P + 4.8, "m_p3_start");
    voice(2 * P + Math.max(P * 0.3, 60), "m_p3_drop");
  }
  plan.push({ at: total, type: "end" });
  return plan.sort((a, b) => a.at - b.at);
}
