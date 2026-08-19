// Synthesized correct-answer chime via Web Audio API — no audio asset needed.
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(audioCtx: AudioContext, freq: number, startTime: number, duration: number, gain: number) {
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, startTime);
  env.gain.linearRampToValueAtTime(gain, startTime + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(env).connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// Called from a user-gesture-driven click handler on every correct answer.
// Classic 8-bit "coin get" blip — quick ascending square-wave two-note hit.
export function playCorrectChime() {
  const audioCtx = getContext();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  tone(audioCtx, 988, now, 0.09, 0.12); // B5
  tone(audioCtx, 1319, now + 0.08, 0.22, 0.12); // E6
}
