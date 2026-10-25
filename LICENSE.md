# Licence

## The kit (our code and docs): MIT License

Copyright (c) 2026 AgileKaur

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The MIT License covers the skills (`skills/`), including the editor, the effects, the reel formats and the `vs`
command, plus `install.sh` and the documentation.
Videos you make with the kit are yours.

**Not covered by the MIT License:** the demo clip (`demo/demo.mp4`). The demo clip is included so you can see the effects: use it for testing the
kit only, and do not publish it or use it in your own videos.

## Third-party tools and files

The kit does not include these tools. The installer downloads them from their official sources, and each one has its
own licence. You agree to those licences when you install and use them.

| Tool or file | Used for | Licence |
|---|---|---|
| FFmpeg (installed with Homebrew) | Decoding, encoding, audio | LGPL 2.1 or later. The Homebrew build includes GPL parts (such as x264), so that build is GPL 2 or later. ffmpeg.org/legal.html |
| Remotion | 3D and motion panels | Remotion License. Free for individuals, non-profits and companies with up to 3 people. Larger companies need a paid company licence. remotion.dev/license |
| React, React DOM and other npm packages | Used by Remotion | Mostly MIT. See each package in `skills/video-studio/editor/app/node_modules/` |
| Node.js, Python | Running the tools | Node.js: MIT. Python: PSF License |
| faster-whisper and Whisper models | Transcription | MIT |
| RobustVideoMatting model (downloaded by the installer from the official GitHub release) | Speaker cutout | GPL 3.0. The kit does not include or change it. github.com/PeterL1n/RobustVideoMatting |
| Flask | The editor's local server | BSD 3-Clause |
| Vite | Building the editor app | MIT |
| ONNX Runtime, OpenCV, Pillow, NumPy, fontTools | Image and model processing | MIT, Apache 2.0, HPND (MIT-CMU), BSD and MIT respectively |
| Homebrew | Installing ffmpeg, Node and Python | BSD 2-Clause |
| Higgsfield (optional, paid) | AI b-roll and backgrounds | Higgsfield's own terms. You need your own account |

## Fonts

* **Default font.** The editor's built-in look uses Poppins, under the SIL Open Font License 1.1. It is included in
  `skills/video-studio/editor/static/fonts/` with its licence (`OFL-Poppins.txt`). You may use it in videos,
  including commercial ones.
* **Brand kit fonts.** Fonts that `/video-brand-kit` or the editor's Brand tab download for you keep their own
  licence. Only use fonts whose licence allows use in videos. You are responsible for that licence.
* The kit contains no Fontshare fonts.
