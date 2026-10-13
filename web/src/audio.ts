// Procedural desk audio: short square-wave ticks, no samples, no classes.
// The context is created lazily on first user gesture.

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let muted = false;

function out(): { ac: AudioContext; dst: GainNode } | null {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    bus = ctx.createGain();
    bus.gain.value = 0.06;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4200;
    bus.connect(lp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ac: ctx, dst: bus! };
}

function blip(freq: number, dur: number, at = 0, level = 1): void {
  const o = out();
  if (!o) return;
  const t = o.ac.currentTime + at;
  const osc = o.ac.createOscillator();
  const env = o.ac.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, t);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(level, t + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(o.dst);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

export function setMuted(m: boolean): void {
  muted = m;
}

export function isMuted(): boolean {
  return muted;
}

/** Key / nav press. */
export function tick(): void {
  blip(1800, 0.018);
}

/** Field commit or toggle. */
export function tock(): void {
  blip(900, 0.03, 0, 0.8);
}

/** Order submitted to the contract. */
export function submitTone(): void {
  blip(660, 0.04);
  blip(990, 0.05, 0.05);
}

/** One log line arrived from the circuit run. */
export function lineTone(): void {
  blip(2400, 0.008, 0, 0.35);
}

export function okTone(): void {
  [880, 1320, 1760].forEach((f, i) => blip(f, 0.06, i * 0.06));
}

export function breachTone(): void {
  blip(220, 0.12);
  blip(196, 0.16, 0.13);
}

export function amberTone(): void {
  blip(520, 0.05);
}
