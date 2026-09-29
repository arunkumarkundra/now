# Observer

A quiet, guided attention practice you can install on your phone. Each session has three equal parts:

1. **Breath**: attention on the breath. Notice when it wanders, and gently return.
2. **Let go**: let everything appear, without taking up the position of "the observer".
3. **Look**: ask "where, exactly, is the observer?", then keep looking without building an answer.

The home screen shows a few prep steps and a **Begin** button. Settings has only two choices: **Length** (15, 30 or 45 minutes) and **Guidance**:
- **Guided**: full instructions
- **Minimal**: key lines only
- **Silent**: bells only

The voice is designed not to startle you. Each spoken cue starts almost silent and rises over a few seconds, a very soft tone swells in before reminders, and the bells bloom in rather than strike.

**Setup:** see [`docs/SETUP.md`](docs/SETUP.md).

## Files
```
index.html               app page
sw.js                    offline support (bump VERSION after changes)
manifest.webmanifest     install settings
_headers                 Cloudflare Pages cache settings (ignored by GitHub Pages)
assets/js/content.js     all words, prep steps and the session timeline
assets/js/session.js     the live session screen
assets/js/audio.js       voice playback and synthesized bells
assets/js/app.js         home and settings screens
assets/js/cues-data.js   generated: text and length of each voice clip
assets/css/app.css       visual design
assets/audio/calm/       spoken cues (Kokoro neural TTS, voice af_heart)
tools/                   narration script + generator used to make the audio
```
