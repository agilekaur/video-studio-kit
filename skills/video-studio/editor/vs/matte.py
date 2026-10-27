"""Speaker cutout with RobustVideoMatting (ONNX, CPU/CoreML).

Reads the clip's 1080x1920 working copy at 720x1280, runs RVM with its recurrent state
(temporally stable edges), and writes a VP9 WebM with alpha that Remotion and Chrome
play as a transparent layer.
"""
import os
import subprocess

import numpy as np

MODEL = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "rvm_mobilenetv3_fp32.onnx")
# fetched from the official release on first use (GPL-3.0, not shipped with the Mac app)
MODEL_URL = "https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx"
MW, MH = 720, 1280

_sess = None


def session():
    global _sess
    if _sess is None:
        import onnxruntime as ort
        if not os.path.exists(MODEL):
            download_model()
        _sess = ort.InferenceSession(MODEL, providers=["CPUExecutionProvider"])
    return _sess


def download_model():
    import ssl
    import urllib.request
    try:
        import certifi
        ctx = ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        ctx = ssl.create_default_context()
    os.makedirs(os.path.dirname(MODEL), exist_ok=True)
    tmp = MODEL + ".part"
    with urllib.request.urlopen(MODEL_URL, context=ctx, timeout=120) as r, open(tmp, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    os.replace(tmp, MODEL)


def make_matte(src, out, duration, progress=lambda p: None, cancel=lambda: False):
    sess = session()
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-vf", "scale=%d:%d" % (MW, MH), "-f", "rawvideo",
                            "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    tmp = out + ".part.webm"
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", "%dx%d" % (MW, MH),
                            "-r", "30", "-i", "-", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30",
                            "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", "-auto-alt-ref", "0", tmp],
                           stdin=subprocess.PIPE)
    rec = [np.zeros([1, 1, 1, 1], dtype=np.float32)] * 4
    ratio = np.array([0.375], dtype=np.float32)
    n = 0
    total = max(1, int(duration * 30))
    fsize = MW * MH * 3
    try:
        while True:
            if cancel():
                raise RuntimeError("cancelled")
            buf = dec.stdout.read(fsize)
            if len(buf) < fsize:
                break
            rgb = np.frombuffer(buf, np.uint8).reshape(MH, MW, 3)
            x = (rgb.astype(np.float32) / 255.0).transpose(2, 0, 1)[None]
            fgr, pha, *rec = sess.run(None, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3],
                                             "downsample_ratio": ratio})
            a = np.clip(pha[0, 0] * 255.0, 0, 255).astype(np.uint8)
            rgba = np.dstack([rgb, a])
            enc.stdin.write(rgba.tobytes())
            n += 1
            if n % 10 == 0:
                progress(min(n / total, 1.0))
        enc.stdin.close()
        enc.wait()
        dec.wait()
        if enc.returncode != 0:
            raise RuntimeError("VP9 alpha encode failed")
        os.replace(tmp, out)
    finally:
        for p in (dec, enc):
            if p.poll() is None:
                p.kill()
        if os.path.exists(tmp):
            os.remove(tmp)
    return n
