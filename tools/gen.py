import os, sys, json, subprocess, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
from cues import CUES, VOICES

OUT = sys.argv[1]
SR = 24000
k = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")

def chunks(items):
    """Merge text separated by short pauses into one utterance; keep long pauses as silence."""
    out, buf = [], []
    for it in items:
        if isinstance(it, str):
            buf.append(it)
        else:
            if it < 0.8 and buf:
                continue  # short pause: rely on punctuation, keep merging
            if buf:
                out.append(" ".join(buf)); buf = []
            out.append(float(it))
    if buf: out.append(" ".join(buf))
    return out

def trim(a, thr=0.004):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0: return a
    s = max(0, idx[0] - int(0.03*SR)); e = min(len(a), idx[-1] + int(0.08*SR))
    return a[s:e]

durations = {}
for vid, (voice, speed, _, _) in VOICES.items():
    d = os.path.join(OUT, vid); os.makedirs(d, exist_ok=True)
    durations[vid] = {}
    for cid, items in CUES.items():
        parts = [np.zeros(int(0.25*SR), dtype=np.float32)]
        for c in chunks(items):
            if isinstance(c, float):
                parts.append(np.zeros(int(c*SR), dtype=np.float32))
            else:
                a, sr = k.create(c, voice=voice, speed=speed, lang="en-us" if voice[0]=="a" else "en-gb")
                assert sr == SR
                parts.append(trim(a.astype(np.float32)))
                parts.append(np.zeros(int(0.35*SR), dtype=np.float32))
        audio = np.concatenate(parts)
        wav = f"/tmp/{vid}_{cid}.wav"; sf.write(wav, audio, SR)
        mp3 = os.path.join(d, f"{cid}.mp3")
        subprocess.run(["ffmpeg","-y","-loglevel","error","-i",wav,"-af",
            "highpass=f=70,lowpass=f=10500,loudnorm=I=-19:TP=-2:LRA=7,afade=t=in:d=0.05",
            "-ac","1","-ar","24000","-b:a","56k",mp3], check=True)
        durations[vid][cid] = round(len(audio)/SR, 2)
        print(vid, cid, durations[vid][cid], flush=True)

json.dump(durations, open(os.path.join(OUT, "durations.json"), "w"), indent=1)
