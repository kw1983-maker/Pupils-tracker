// AudioWorklet that turns live microphone audio into the format the Gemini
// Live API expects: raw 16-bit PCM, mono, 16 kHz, little-endian.
//
// The browser's AudioContext usually runs at 44.1 or 48 kHz, so we linearly
// downsample to 16 kHz here, convert Float32 [-1,1] samples to Int16, and
// postMessage the ArrayBuffer back to the main thread (which base64-encodes it
// and sends it over the Live socket). Served as a static file from /public so
// Turbopack doesn't need to bundle it.

const TARGET_RATE = 16000;

class PCMRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Fractional read position carried across render quanta so resampling
    // stays continuous (no clicks at 128-sample block boundaries).
    this._pos = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channel = input[0]; // mono: first channel only
    if (!channel || channel.length === 0) return true;

    const ratio = sampleRate / TARGET_RATE; // e.g. 48000 / 16000 = 3
    const outLength = Math.max(0, Math.floor((channel.length - this._pos) / ratio));
    if (outLength <= 0) {
      this._pos -= channel.length;
      return true;
    }

    const out = new Int16Array(outLength);
    let pos = this._pos;
    for (let i = 0; i < outLength; i++) {
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const s0 = channel[idx] || 0;
      const s1 = channel[idx + 1] !== undefined ? channel[idx + 1] : s0;
      let sample = s0 + (s1 - s0) * frac; // linear interpolation
      sample = Math.max(-1, Math.min(1, sample));
      out[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      pos += ratio;
    }
    // Keep the leftover fractional offset for the next block.
    this._pos = pos - channel.length;

    this.port.postMessage(out.buffer, [out.buffer]);
    return true;
  }
}

registerProcessor("pcm-recorder-processor", PCMRecorderProcessor);
