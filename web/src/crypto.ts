// Desk-side preview digests.
//
// HONESTY NOTE: everything here is a SHA-256 stand-in so the terminal can show
// instant fingerprints while the operator types. It is NOT the contract's
// persistentHash and nothing computed here is ever submitted. The authoritative
// values come from the compiled contract run in chain.ts.

const enc = new TextEncoder();

export const hex = (b: Uint8Array): string =>
  b.reduce((s, x) => s + (x < 16 ? '0' : '') + x.toString(16), '');

export const short = (h: string, n = 6): string => `${h.slice(0, n)}..${h.slice(-4)}`;

export function unhex(s: string): Uint8Array {
  const body = s.replace(/^0x/i, '');
  const out = new Uint8Array(body.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(body.substr(i * 2, 2), 16);
  return out;
}

type Part = Uint8Array | bigint | number | string;

function encodePart(p: Part): Uint8Array {
  if (typeof p === 'string') return enc.encode(p);
  if (p instanceof Uint8Array) return p;
  const word = new Uint8Array(16);
  let v = BigInt(p);
  for (let i = 15; i >= 0; i--) {
    word[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return word;
}

/** Tagged SHA-256 over a length-prefixed concatenation. Preview only. */
export async function previewDigest(tag: string, ...parts: Part[]): Promise<string> {
  const chunks = [tag, ...parts].map(encodePart);
  const size = chunks.reduce((n, c) => n + 4 + c.length, 0);
  const buf = new Uint8Array(size);
  const view = new DataView(buf.buffer);
  let at = 0;
  for (const c of chunks) {
    view.setUint32(at, c.length);
    buf.set(c, at + 4);
    at += 4 + c.length;
  }
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', buf)));
}

export const previewRoleKey = (role: 'borrower' | 'lender' | 'oracle' | 'custodian', sk: Uint8Array) =>
  previewDigest(`desk/${role}`, sk);

export const previewCollateralSeal = (units: bigint, owner: Uint8Array, salt: Uint8Array) =>
  previewDigest('desk/collateral', owner, units, salt);

/** Maintenance ratio in basis points: (units * px * 10_000) / debt. */
export function ratioBps(debt: bigint, units: bigint, px: bigint): bigint {
  return debt <= 0n ? 0n : (units * px * 10_000n) / debt;
}

export function randomKey(n = 32): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}
