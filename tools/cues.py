# Narration script for Observer. Each cue is a list of sentences (str) and pauses (float seconds).
# Plain, secular, unhurried. Written to be heard, not read. Short phrases, long pauses.

CUES = {
  # ---------- GUIDED (full instructions) ----------
  "g_intro": [
    "Welcome.", 2.0,
    "Take a moment to settle in.", 2.5,
    "Sit comfortably,", 0.5, "with your back upright,", 0.5, "but not stiff.", 2.0,
    "Let your hands rest wherever they're comfortable.", 2.5,
    "Let your shoulders drop.", 2.0,
    "Soften your jaw,", 0.6, "and the muscles around your eyes.", 3.0,
    "Take a slow breath in,", 3.0, "and let it go.", 4.0,
    "Once more.", 1.0, "Breathing in,", 3.0, "and out.", 4.5,
    "For the next while,", 0.6, "there is nothing to achieve.", 2.0,
    "You're simply going to look,", 0.6, "and see what happens.", 3.0,
    "When you're ready,", 0.8, "let your eyes close.", 3.0,
  ],
  "g_p1_start": [
    "Let your breathing find its own rhythm.", 3.0,
    "Bring your attention to the feeling of the breath,", 0.6, "wherever it's clearest.", 1.2,
    "Perhaps at the nose.", 3.0,
    "There's no need to change it.", 1.2, "Just feel it,", 0.6, "as it is.", 4.0,
    "Your only job is this.", 2.0,
    "Notice when attention has wandered,", 1.0, "and gently return.", 4.0,
    "Thoughts will come.", 1.5, "You don't need to fight them.", 1.2,
    "Just come back to the breath.",
  ],
  "g_p1_mid": [
    "If you've drifted,", 1.0, "noticing that is the practice itself.", 2.5,
    "Gently,", 0.8, "come back to the breath.",
  ],
  "g_p1_late": [
    "Success isn't having no thoughts.", 2.0,
    "It's noticing,", 1.0, "and returning.",
  ],
  "g_p2_start": [
    "Now,", 1.0, "let go of the breath.", 3.0,
    "Stop focusing on anything in particular.", 2.5,
    "Let everything appear on its own.", 2.0,
    "Sounds.", 1.5, "Sensations.", 1.5, "Thoughts.", 1.5, "Feelings.", 4.0,
    "And there's no need to be the one who is watching.", 2.5,
    "Simply notice that thoughts,", 0.8, "sensations,", 0.8, "and awareness,", 1.0, "are happening,", 1.0, "on their own.",
  ],
  "g_p2_mid": [
    "If a thought says,", 0.6, "I'm doing this badly,", 1.2, "that's just another event.", 2.5,
    "Nothing to push away.", 1.5, "Nothing to follow.",
  ],
  "g_p2_late": [
    "Whatever appears,", 1.0, "let it appear.", 2.0,
    "Whatever leaves,", 1.0, "let it leave.",
  ],
  "g_p3_start": [
    "Now,", 1.0, "gently ask one question.", 3.5,
    "Where,", 1.0, "exactly,", 1.0, "is the observer?", 6.0,
    "Don't answer with an idea.", 2.0,
    "Actually look.", 5.0,
    "If you seem to find a place,", 1.0, "look at it closely.", 2.5,
    "Is someone there?", 2.0,
    "Or only a sensation,", 1.0, "an image,", 1.0, "or a thought?",
  ],
  "g_p3_drop": [
    "Now,", 0.8, "let the question go.", 3.0,
    "For the remaining time,", 1.0, "keep looking,", 1.2, "without building an answer.",
  ],
  "g_p3_late": [
    "Nothing needs to happen.", 2.5,
    "Just rest,", 1.0, "and look.",
  ],
  "g_end": [
    "The session is complete.", 3.5,
    "There's no need to move yet.", 2.5,
    "Let the experience be what it was.", 4.0,
    "Slowly,", 1.0, "let a little movement come back,", 0.8, "into your fingers,", 1.0, "and your hands.", 4.0,
    "And when you're ready,", 1.0, "gently open your eyes.",
  ],

  # ---------- MINIMAL (key instructions only) ----------
  "m_intro": [
    "Settle in,", 1.0, "and sit comfortably.", 2.5,
    "Take one slow breath in,", 3.0, "and let it go.", 3.5,
    "When you're ready,", 0.8, "close your eyes.",
  ],
  "m_p1_start": [
    "Attention on the breath.", 2.5,
    "Notice when it wanders,", 1.0, "and gently return.",
  ],
  "m_p2_start": [
    "Let go of the breath.", 2.5,
    "Let everything appear on its own.",
  ],
  "m_p3_start": [
    "Where,", 1.0, "exactly,", 1.0, "is the observer?", 3.5,
    "Look.", 1.2, "Don't answer.",
  ],
  "m_p3_drop": [
    "Let the question go.", 2.0, "Keep looking.",
  ],
  "m_end": [
    "The session is complete.", 3.0,
    "Open your eyes,", 0.8, "when you're ready.",
  ],
}

# The one voice used by the app (Kokoro-82M). af_heart is Kokoro's most natural voice;
# slowed down it is warm and unhurried without sounding sleepy.
VOICE = ("af_heart", 0.8)
