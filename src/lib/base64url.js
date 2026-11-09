// base64url: the URL-safe text form of bytes used for nonces and signatures (api.md "Phones and signed
// requests"): like base64, but "-" and "_" instead of "+" and "/", and no "=" padding.

// Bytes (Uint8Array or ArrayBuffer) → base64url text.
export function toBase64url(bytes) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of array) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// base64url text → bytes.
export function fromBase64url(text) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}
