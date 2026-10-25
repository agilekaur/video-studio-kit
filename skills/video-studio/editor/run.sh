#!/bin/bash
# Start Video Studio on http://127.0.0.1:5178 (PORT and VS_HOME can override).
# SETUP_ONLY=1 does the one-time setup (Python packages, cutout model, app build) and exits.
# PYTHON picks the Python used for the venv (default python3).
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then
  "${PYTHON:-python3}" -m venv .venv && .venv/bin/pip install -q -r requirements.txt
fi
if [ ! -f models/rvm_mobilenetv3_fp32.onnx ]; then
  mkdir -p models && curl -sSL -o models/rvm_mobilenetv3_fp32.onnx \
    https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx
fi
if [ ! -d app/node_modules ]; then
  (cd app && npm install --no-audit --no-fund)
fi
(cd app && npx vite build --logLevel error) || { echo "App build failed"; exit 1; }
[ "${SETUP_ONLY:-0}" = 1 ] && exit 0
exec .venv/bin/python server.py
