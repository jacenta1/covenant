// Desk terminal controller: wires the panes, the oracle tape and the
// in-browser contract session (chain.ts).

import { runDemo } from './chain';
import { desk, type Facility } from './state';
import { ratioBps, previewCollateralSeal, randomKey, short } from './crypto';
import * as sfx from './audio';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const fmtInt = (v: bigint | number) => Number(v).toLocaleString('en-US');
const fmtPct = (bps: bigint) => (Number(bps) / 100).toFixed(2) + '%';
const SCALE_MAX_BPS = 30_000;

/* ---------- facility readouts ---------- */

const ownerKey = randomKey();
const sealSalt = randomKey();
let sealJob = 0;

function classify(f: Facility, bps: bigint): 'ok' | 'amber' | 'red' {
  if (bps < f.floorBps) return 'red';
  if (bps < f.floorBps + 2_000n) return 'amber';
  return 'ok';
}

function paint(): void {
  const f = desk.facility;
  const bps = ratioBps(f.debt, f.units, f.px);
  const band = classify(f, bps);

  $('roDebt').textContent = fmtInt(f.debt);
  $('roUnits').textContent = fmtInt(f.units);
  $('roPx').textContent = Number(f.px).toFixed(2);
  $('roFloor').textContent = fmtPct(f.floorBps);
  $('roHealth').textContent = fmtPct(bps);
  const head = (Number(bps - f.floorBps) / 100).toFixed(2);
  $('roHead').textContent = (bps >= f.floorBps ? '+' : '') + head + ' pp';

  const key = $('roHealth').parentElement!;
  key.classList.toggle('is-amber', band === 'amber');
  key.classList.toggle('is-red', band === 'red');

  const fill = $('gaugeFill');
  fill.style.transform = `scaleX(${Math.min(1, Number(bps) / SCALE_MAX_BPS)})`;
  fill.classList.toggle('is-amber', band === 'amber');
  fill.classList.toggle('is-red', band === 'red');
  $('gaugeLine').style.left = `${(Number(f.floorBps) / SCALE_MAX_BPS) * 100}%`;
  ($('gaugeLine').firstElementChild as HTMLElement).textContent = `COV ${fmtPct(f.floorBps)}`;

  const phase = band === 'red' ? 'BREACH' : f.phase;
  $('phaseFlag').textContent = phase;
  $('lgProof').textContent = String(band !== 'red');
  $('lgProof').className = 'mono ' + (band === 'red' ? 'bad' : 'ok');

  renderShocks(f);

  const job = ++sealJob;
  void previewCollateralSeal(f.units, ownerKey, sealSalt).then((h) => {
    if (job === sealJob) $('sealPrev').textContent = short(h, 10);
  });
}

function renderShocks(f: Facility): void {
  const rows = [-40, -25, -10, 0, 10].map((pct) => {
    const px = (f.px * BigInt(100 + pct)) / 100n;
    const bps = ratioBps(f.debt, f.units, px);
    const band = classify(f, bps);
    const label = band === 'red' ? 'LIQ' : band === 'amber' ? 'WATCH' : 'OK';
    const cls = band === 'red' ? 'bad' : band === 'amber' ? 'warn' : 'ok';
    return `<tr><td>${pct > 0 ? '+' : ''}${pct}%</td><td>${fmtInt(px)}</td><td>${fmtPct(bps)}</td><td class="${cls}">${label}</td></tr>`;
  });
  $('shockRows').innerHTML = rows.join('');
}

let lastBand = 'ok';
function bindInputs(): void {
  const bindNum = (id: string, apply: (v: bigint) => void) => {
    $<HTMLInputElement>(id).addEventListener('change', (e) => {
      const n = Math.max(1, Math.floor(Number((e.target as HTMLInputElement).value) || 1));
      apply(BigInt(n));
      sfx.tock();
      paint();
    });
  };
  bindNum('inUnits', (v) => (desk.facility.units = v));
  bindNum('inDebt', (v) => (desk.facility.debt = v));
  bindNum('inFloor', (v) => (desk.facility.floorBps = v < 10_000n ? 10_000n : v));

  const px = $<HTMLInputElement>('inPx');
  px.addEventListener('input', () => {
    desk.facility.px = BigInt(px.value);
    $('pxOut').textContent = px.value;
    paint();
    const f = desk.facility;
    const band = classify(f, ratioBps(f.debt, f.units, f.px));
    if (band !== lastBand) {
      if (band === 'red') sfx.breachTone();
      else if (band === 'amber') sfx.amberTone();
      else sfx.tick();
      lastBand = band;
    }
  });
}

/* ---------- oracle tape ---------- */

const SYMBOLS: Array<[string, number]> = [
  ['CCY1/USD', 1000], ['wBTC/USD', 64210], ['wETH/USD', 3120.5], ['DUST/USD', 0.0412],
  ['SOFR', 5.31], ['UST10Y', 4.18], ['NIGHT/USD', 0.0631], ['EURC/USD', 1.084],
];

function buildTape(): HTMLElement[] {
  const track = $('tapeTrack');
  const make = () =>
    SYMBOLS.map(([sym, px]) => {
      const el = document.createElement('span');
      el.className = 'q';
      el.innerHTML = `<b>${sym}</b><span class="v">${px}</span><span class="d up">+0.00</span>`;
      el.dataset.px = String(px);
      el.dataset.sym = sym;
      return el;
    });
  const cells = [...make(), ...make()];
  track.append(...cells);
  return cells;
}

function driftTape(cells: HTMLElement[]): void {
  // Low-frequency (1 Hz) direct textContent writes; no framework re-render.
  setInterval(() => {
    for (let i = 0; i < SYMBOLS.length; i++) {
      const base = SYMBOLS[i][1];
      const prev = Number(cells[i].dataset.px);
      const next = prev * (1 + (Math.random() - 0.5) * 0.002);
      const delta = ((next - base) / base) * 100;
      const digits = base < 1 ? 4 : 2;
      for (const el of [cells[i], cells[i + SYMBOLS.length]]) {
        el.dataset.px = String(next);
        (el.children[1] as HTMLElement).textContent = next.toFixed(digits);
        const d = el.children[2] as HTMLElement;
        d.textContent = (delta >= 0 ? '+' : '') + delta.toFixed(2) + '%';
        d.className = 'd ' + (delta >= 0 ? 'up' : 'dn');
      }
    }
  }, 1000);
}

function runClock(): void {
  const el = $('clock');
  const step = () => {
    const d = new Date();
    el.textContent = d.toISOString().slice(11, 23);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- rail ---------- */

function bindRail(): void {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.rail__go'));
  const select = (sec: string) => links.forEach((a) => a.classList.toggle('is-on', a.dataset.sec === sec));
  links.forEach((a, i) => {
    a.addEventListener('click', () => {
      sfx.tick();
      select(a.dataset.sec!);
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === `F${i + 1}`) {
        e.preventDefault();
        sfx.tick();
        select(a.dataset.sec!);
        document.getElementById(a.dataset.sec!)?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  const mute = $<HTMLButtonElement>('muteBtn');
  mute.addEventListener('click', () => {
    const m = !sfx.isMuted();
    if (!m) sfx.setMuted(false);
    sfx.tock();
    sfx.setMuted(m);
    mute.setAttribute('aria-pressed', String(m));
    mute.textContent = m ? 'AUDIO OFF' : 'AUDIO ON';
  });
}

/* ---------- contract session ---------- */

function setRun(state: typeof desk.run, label: string): void {
  desk.run = state;
  const el = $('runState');
  el.textContent = label;
  el.className = `runstate mono is-${state}`;
}

async function execute(): Promise<void> {
  if (desk.run === 'running') return;
  const btn = $<HTMLButtonElement>('runBtn');
  const tty = $('tty');
  const counter = $('lineCount');
  const elapsed = $('elapsed');
  btn.disabled = true;
  tty.textContent = '';
  desk.lines = 0;
  delete document.body.dataset.chain;
  setRun('running', 'RUNNING');
  sfx.submitTone();
  const t0 = performance.now();

  const log = (...parts: unknown[]) => {
    const text = parts.map((p) => (typeof p === 'string' ? p : String(p))).join(' ');
    const line = document.createElement('div');
    if (/^\s*\n?\[\d\/\d\]/.test(text)) line.className = 'ln-step';
    line.textContent = text;
    tty.appendChild(line);
    tty.scrollTop = tty.scrollHeight;
    counter.textContent = String(++desk.lines);
    elapsed.textContent = `${Math.round(performance.now() - t0)} ms`;
    sfx.lineTone();
    const st = /Final Loan Status:\s*(\w+)/.exec(text);
    if (st) $('lgStatus').textContent = st[1];
  };

  try {
    await runDemo(log);
    $('lgId').textContent = short(Array.from(randomKey(8), (b) => b.toString(16).padStart(2, '0')).join(''), 8);
    setRun('completed', 'COMPLETED');
    document.body.dataset.chain = 'completed';
    sfx.okTone();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const line = document.createElement('div');
    line.className = 'ln-err';
    line.textContent = `REJECTED: ${msg}`;
    tty.appendChild(line);
    setRun('rejected', 'REJECTED');
    document.body.dataset.chain = 'rejected: ' + msg;
    sfx.breachTone();
  } finally {
    elapsed.textContent = `${Math.round(performance.now() - t0)} ms`;
    btn.disabled = false;
  }
}

/* ---------- boot ---------- */

bindInputs();
bindRail();
driftTape(buildTape());
runClock();
paint();

$('runBtn').addEventListener('click', () => void execute());
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !(e.target instanceof HTMLInputElement)) void execute();
});

if (location.hash === '#selftest') void execute();
