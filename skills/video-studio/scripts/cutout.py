"""Speaker cutout helper (our design). Usage: python cutout.py in.mp4 out_dir
Needs: pip install rembg onnxruntime pillow ; ffmpeg on PATH. NOT TESTED in the build environment."""
import sys, os, subprocess, glob
from rembg import remove, new_session
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out + "/frames", exist_ok=True)
subprocess.run(["ffmpeg","-y","-i",src,"-vf","fps=30",out+"/frames/%05d.png"],check=True)
sess = new_session("u2net_human_seg")
prev = None
for f in sorted(glob.glob(out+"/frames/*.png")):
    im = Image.open(f).convert("RGB")
    rgba = remove(im, session=sess)
    a = rgba.split()[3]
    if prev is not None:
        a = Image.blend(a, prev, 0.3)   # temporal smoothing
    prev = a
    rgba.putalpha(a); rgba.save(f)
subprocess.run(["ffmpeg","-y","-framerate","30","-i",out+"/frames/%05d.png","-c:v","prores_ks","-profile:v","4444","-pix_fmt","yuva444p10le",out+"/cutout.mov"],check=True)
subprocess.run(["ffmpeg","-y","-i",out+"/cutout.mov","-vf","alphaextract","-pix_fmt","yuv420p",out+"/matte.mp4"],check=True)
