# Observer

A 14-day attention experiment you can install on your phone. Each session runs 30 minutes in three phases:

1. **Stabilize**: attention on the breath. Notice when it wanders, and return.
2. **Remove the anchor**: let everything appear, without taking up the position of "the observer".
3. **The experiment**: ask "where exactly is the observer?", then look without constructing an answer.

Straight afterwards, you rate 12 dimensions from 0 to 10 before interpreting anything. The app then tracks trends, runs the "certainty check" (does confidence in your interpretation rise with how altered the state felt?), and exports reports in the protocol's format.

**Setup:** see [`docs/SETUP.md`](docs/SETUP.md).

## Features
- Guided, minimal or silent sessions (15/20/30/45 min), with 3 neural voices and soft synthesized tones
- A screen that fades almost to black during the session. Double-tap marks a moment, and in phase 1 you can optionally tap to count each time you notice you've wandered
- A pre-session conditions checklist and a safety check-in (the protocol's stop rule)
- Ratings kept separate from interpretation, plus timestamped moment notes
- Progress view: a trend for each measure, small multiples of all 12, the certainty scatter, and a 14-day review
- Export as copyable text, CSV and a JSON backup, with restore. Also a calendar file of daily reminders
- Works offline and installs to the Home Screen (PWA)
- Optional Google/Apple sign-in with cloud sync (Firebase). The app works fully without an account

## Files
```
index.html               app page
sw.js                    offline support (bump VERSION after changes)
manifest.webmanifest     install settings
_headers, _routes.json   Cloudflare Pages settings
functions/[[path]].js    Cloudflare function that makes sign-in work on your own domain
firestore.rules          database rules to paste into Firebase
assets/js/config.js      ← your Firebase settings go here
assets/js/content.js     all practice text, ratings and timings
assets/js/…              app code (no build step)
assets/css/app.css       visual design
assets/audio/<voice>/    spoken cues (Kokoro neural TTS)
assets/vendor/firebase.js  Firebase SDK v12.19.0, bundled
tools/                   narration script + generator used to make the audio
```
