// How long to wait before trying again after a temporary failure (no network, timeout, 5xx)
// (docs/app-plan.md "Sync engine"): 30 s, 1 min, 2 min, 5 min, then every 5 min, each with up to 20%
// random extra ("jitter"). The jitter stops many phones that lost the network together (a market's
// signal drops) from all hitting the sleepy free server at exactly the same moment when it returns.

const STEPS_MS = [30_000, 60_000, 120_000, 300_000];

// `failures`: how many temporary failures in a row (1 for the first). `random`: a number in [0, 1).
export function backoffMs(failures, random = Math.random()) {
  const base = STEPS_MS[Math.min(Math.max(failures, 1), STEPS_MS.length) - 1];
  return Math.round(base * (1 + 0.2 * random));
}
