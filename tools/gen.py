# Generates the spoken cues for Observer.
# Needs: pip install kokoro-onnx soundfile numpy, ffmpeg, and the Kokoro model files
# (kokoro-v1.0.onnx, voices-v1.0.bin) in the current folder.
# Usage: python gen.py <output folder>    -> writes <out>/<cue>.mp3 and <out>/durations.json
import os, sys, json, subprocess, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
from cues import CUES, VOICE

OUT = sys.argv[1]
SR = 24000
LEAD = 0.6  # silence before the first word, so the player's soft fade-in never clips a word
k = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
voice, speed = VOICE

def chunks(items):
    """Merge text separated by short pauses into one utterance; keep longer pauses as silence."""
    out, buf = [], []
    for it in items:
        if isinstance(it, str):
            buf.append(it)
        else:
            if it < 0.7 and buf:
                continue  # short pause: rely on punctuation, keep merging
            if buf:
                out.append(" ".join(buf)); buf = []
            out.append(float(it))
    if buf: out.append(" ".join(buf))
    return out

def trim(a, thr=0.004):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0: return a
    s = max(0, idx[0] - int(0.03*SR)); e = min(len(a), idx[-1] + int(0.12*SR))
    return a[s:e]

# A small, soft room: exponentially decaying filtered noise (about 1 s tail), mixed in lightly.
rng = np.random.default_rng(7)
n = int(1.1 * SR)
t = np.arange(n) / SR
ir = rng.standard_normal(n) * np.exp(-t / 0.16)
ir = np.convolve(ir, np.ones(12) / 12, mode="same")  # darken the tail
ir[: int(0.018 * SR)] = 0                              # 18 ms pre-delay
ir /= np.sqrt(np.sum(ir ** 2))

def room(a, wet=0.16):
    L = len(a) + len(ir) - 1
    N = 1 << (L - 1).bit_length()
    r = np.fft.irfft(np.fft.rfft(a, N) * np.fft.rfft(ir, N), N)[:L]
    dry = np.concatenate([a, np.zeros(len(ir) - 1, dtype=np.float32)])
    return (dry * (1 - wet * 0.5) + r * wet).astype(np.float32)

os.makedirs(OUT, exist_ok=True)
durations = {}
for cid, items in CUES.items():
    parts = [np.zeros(int(LEAD * SR), dtype=np.float32)]
    for c in chunks(items):
        if isinstance(c, float):
            parts.append(np.zeros(int(c * SR), dtype=np.float32))
        else:
            a, sr = k.create(c, voice=voice, speed=speed, lang="en-us")
            assert sr == SR
            parts.append(trim(a.astype(np.float32)))
            parts.append(np.zeros(int(0.4 * SR), dtype=np.float32))
    audio = room(np.concatenate(parts))
    wav = f"/tmp/obs_{cid}.wav"; sf.write(wav, audio, SR)
    mp3 = os.path.join(OUT, f"{cid}.mp3")
    # Warm and soft: cut rumble and hiss, tame the "s" sounds, even out the level, keep it quiet.
    af = ",".join([
        "highpass=f=80",
        "lowpass=f=7800",
        "equalizer=f=6500:t=q:w=1.2:g=-4",
        "equalizer=f=220:t=q:w=1.0:g=1.5",
        "acompressor=threshold=-24dB:ratio=2.5:attack=15:release=250:makeup=2",
        "loudnorm=I=-23:TP=-4:LRA=6",
        "afade=t=in:d=0.3",
    ])
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", af,
                    "-ac", "1", "-ar", "24000", "-b:a", "64k", mp3], check=True)
    durations[cid] = round(len(audio) / SR, 2)
    print(cid, durations[cid], flush=True)

json.dump(durations, open(os.path.join(OUT, "durations.json"), "w"), indent=1)
