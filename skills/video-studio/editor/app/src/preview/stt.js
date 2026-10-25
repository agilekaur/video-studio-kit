// In-browser transcription with word timestamps (Whisper tiny, English) for the effects page preview.
// Everything is served next to the page (the page cannot fetch other sites): the ONNX runtime in stt/,
// the model in stt/models/. Model files are published as .wasm parts (a type the page host serves; the
// 30 MB decoder needs three parts to fit the 15 MB file limit) and joined back here.
import { pipeline, env } from "@huggingface/transformers";

const MODEL = "whisper-tiny.en_timestamped";
const SPLIT = {
  "encoder_model_quantized.onnx": ["p0.wasm"],
  "decoder_model_merged_quantized.onnx": ["p0.wasm", "p1.wasm", "p2.wasm"],
};
const abs = (p) => new URL(p, document.baseURI).href;

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = "stt/models/"; // relative: the library probes optional files (tokenizer, audio settings) only for paths, not URLs
env.backends.onnx.wasm.wasmPaths = { mjs: abs("stt/ort-wasm-simd-threaded.mjs"), wasm: abs("stt/ort-wasm-simd-threaded.wasm") };
env.backends.onnx.wasm.numThreads = 1;
const baseFetch = env.fetch || fetch.bind(window);
env.fetch = async (input, init) => {
  const url = String(input && input.url ? input.url : input);
  const name = Object.keys(SPLIT).find((n) => url.split("?")[0].endsWith("/" + n));
  if (!name) return baseFetch(input, init);
  const parts = await Promise.all(SPLIT[name].map(async (suffix) => {
    const r = await baseFetch(`${url.split("?")[0]}.${suffix}`, init);
    if (!r.ok) throw new Error(`Missing model part ${suffix}`);
    return r.arrayBuffer();
  }));
  const blob = new Blob(parts, { type: "application/octet-stream" });
  return new Response(blob, { status: 200, headers: { "content-length": String(blob.size) } });
};

let asr = null;
async function getPipeline(onProgress) {
  if (!asr) {
    asr = pipeline("automatic-speech-recognition", MODEL, {
      device: "wasm",
      dtype: { encoder_model: "q8", decoder_model_merged: "q8" },
      progress_callback: (p) => { if (p.status === "progress" && onProgress) onProgress(p); },
    });
    asr.catch(() => { asr = null; });
  }
  return asr;
}

// Mono 16 kHz samples from the clip's audio track, first `seconds` only.
async function decodeAudio(file, seconds) {
  const buf = await file.arrayBuffer();
  const probe = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  let audio;
  try { audio = await probe.decodeAudioData(buf); } finally { probe.close && probe.close(); }
  const n = Math.min(audio.length, Math.round(seconds * 16000));
  const out = new Float32Array(n);
  for (let ch = 0; ch < audio.numberOfChannels; ch++) {
    const d = audio.getChannelData(ch);
    for (let i = 0; i < n; i++) out[i] += d[i] / audio.numberOfChannels;
  }
  return out;
}

// Returns [{w, s, e}] in seconds.
export async function transcribe(file, seconds, onStage) {
  onStage && onStage("Reading the audio");
  const samples = await decodeAudio(file, seconds);
  onStage && onStage("Loading the speech model (about 55 MB, first time only)");
  const run = await getPipeline((p) => onStage && onStage(`Loading the speech model ${Math.round(p.progress || 0)}%`));
  onStage && onStage("Transcribing");
  const res = await run(samples, { return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5 });
  return (res.chunks || [])
    .map((c) => ({ w: String(c.text || "").trim(), s: +c.timestamp[0], e: +(c.timestamp[1] ?? c.timestamp[0] + 0.3) }))
    .filter((x) => x.w && Number.isFinite(x.s));
}
