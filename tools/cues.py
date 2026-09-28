# Narration script for Observer. Each cue is a list of sentences (str) and pauses (float seconds).
# Plain, secular, unhurried. Written to be heard, not read.

CUES = {
  # ---------- GUIDED ----------
  "g_intro": [
    "Welcome.", 1.2,
    "Settle into a comfortable position, somewhere you won't be disturbed.", 1.0,
    "Let the room be dim, and quiet.", 1.6,
    "For the next while, there is nothing to achieve,", 0.3, "and nothing to believe.", 1.2,
    "You're simply going to look,", 0.3, "and see what happens.", 2.0,
  ],
  "g_p1_start": [
    "Close your eyes.", 1.6,
    "Bring your attention to the physical sensation of breathing.", 0.8,
    "Wherever it's clearest.", 0.4, "Perhaps around the nose.", 1.8,
    "Don't change the breath.", 0.6, "Just feel it, as it is.", 2.5,
    "Your only job is this.", 1.0,
    "Notice when attention has wandered,", 0.5, "and return.", 2.5,
    "Thoughts will come.", 0.6, "You don't need to fight them,", 0.3, "or push them away.",
  ],
  "g_p1_mid": [
    "If you've drifted,", 0.4, "that moment of noticing is the practice itself.", 1.2,
    "Gently return to the breath.",
  ],
  "g_p1_late": [
    "Success isn't having no thoughts.", 1.0,
    "It's how quickly you notice.", 1.2,
    "Notice,", 0.4, "and return.",
  ],
  "g_p2_start": [
    "Now, let go of the breath.", 1.6,
    "Stop concentrating on anything in particular.", 1.2,
    "Let everything appear on its own.", 0.8,
    "Sounds.", 0.6, "Sensations.", 0.6, "Thoughts.", 0.6, "Images.", 0.6, "Feelings.", 2.5,
    "And one unusual instruction.", 1.2,
    "Don't take up the position of an observer.", 1.2,
    "There's no need to think,", 0.3, "I am watching my thoughts.", 1.4,
    "Simply notice that thoughts,", 0.3, "sensations,", 0.3, "and awareness,", 0.3, "are occurring.",
  ],
  "g_p2_mid": [
    "If a thought says,", 0.3, "I'm doing this badly,", 0.6, "that's just another event.", 1.4,
    "If a sensation says,", 0.3, "my leg hurts,", 0.6, "another event.", 1.6,
    "Nothing to suppress.", 0.8, "Nothing to pursue.",
  ],
  "g_p2_late": [
    "Whatever appears,", 0.4, "let it appear.", 1.0,
    "Whatever leaves,", 0.4, "let it leave.",
  ],
  "g_p3_start": [
    "Now, ask one question.", 2.0,
    "Where,", 0.5, "exactly,", 0.5, "is the observer?", 3.5,
    "Don't answer with an idea.", 0.8,
    "Not the brain.", 0.6, "Not behind the eyes.", 1.4,
    "Actually look.", 2.5,
    "If you seem to find a location,", 0.4, "examine it closely.", 1.4,
    "Is the observer there?", 1.2,
    "Or only a sensation,", 0.4, "an image,", 0.4, "or a thought,", 0.4, "about an observer?",
  ],
  "g_p3_drop": [
    "Now let the question go.", 1.6,
    "For the remaining time,", 0.4, "keep looking,", 0.6, "without building an answer.",
  ],
  "g_p3_late": [
    "Nothing needs to happen.", 1.2,
    "Whatever occurs,", 0.4, "or doesn't,", 0.6, "is simply a result.",
  ],
  "g_end": [
    "The session is complete.", 1.8,
    "Stay still for a moment.", 1.2,
    "Let the experience be what it was,", 0.4, "without deciding what it meant.", 2.2,
    "When you're ready,", 0.4, "open your eyes,", 0.6,
    "and record your ratings straight away,", 0.4, "before you think about them.",
  ],

  # ---------- MINIMAL ----------
  "m_p1_start": [
    "Close your eyes.", 1.0, "Attention on the breath.", 1.2,
    "Notice when it wanders,", 0.4, "and return.",
  ],
  "m_p2_start": [
    "Release the anchor.", 1.2, "Let everything appear.", 1.2,
    "No need to be the observer.",
  ],
  "m_p3_start": [
    "Where,", 0.4, "exactly,", 0.4, "is the observer?", 1.6,
    "Look.", 0.6, "Don't answer.",
  ],
  "m_p3_drop": [
    "Let the question go.", 1.0, "Keep looking.",
  ],
  "m_end": [
    "Session complete.", 1.2, "Record your ratings,", 0.3, "before interpreting.",
  ],

  # ---------- SHORT UTTERANCES (preview) ----------
  "preview": [
    "This is how I'll sound during your sessions.", 0.8, "Calm,", 0.3, "and unhurried.",
  ],
}

VOICES = {
  # id: (kokoro voice, speed, display name, description)
  "warm":  ("af_heart", 0.84, "Warm", "Soft, warm female voice"),
  "clear": ("bf_emma", 0.86, "Clear", "Calm British female voice"),
  "low":   ("am_michael", 0.86, "Low", "Low, steady male voice"),
}
