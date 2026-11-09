// The server-corrected clock (api.md "X-Server-Time").
//
// Many phones have the wrong time. Signed requests must carry a time within 5 minutes of the server's,
// so every answer's X-Server-Time updates an offset (server time − phone time), and signing uses
// phone time + offset. The offset is also saved in `shopbook-app` so it's right straight after a restart.

let offsetMs = 0;
let persist = null;

// Lets the app save the offset somewhere lasting (set up once in main.jsx; tests leave it off).
export function setClockPersistence(save, saved) {
  persist = save;
  if (Number.isFinite(saved)) offsetMs = saved;
}

// Reads X-Server-Time from an answer's headers and updates the offset. Ignores missing or odd values.
export function updateClockFrom(headers, phoneNow = Date.now()) {
  const serverTime = Number(headers?.get?.('X-Server-Time'));
  if (!Number.isFinite(serverTime) || serverTime <= 0) return;
  const next = serverTime - phoneNow;
  if (Math.abs(next - offsetMs) < 1000) return; // no need to rewrite storage for tiny changes
  offsetMs = next;
  persist?.(offsetMs);
}

// The time to sign with: the phone's clock corrected by the offset.
export function serverNow() {
  return Date.now() + offsetMs;
}

// For tests and the status screen.
export function clockOffsetMs() {
  return offsetMs;
}
