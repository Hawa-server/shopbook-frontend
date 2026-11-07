// Phone number helpers. The server stores and sends numbers in E.164 ("+233241234567", api.md BE4.5);
// people read them in their country's local form ("024 123 4567").
//
// Reading what a person TYPES is the server's job (it accepts local and international forms using the
// business's or chosen country), so the app sends typed numbers as they are and only formats for display.

// Turns an E.164 number into the local form for its country, using the country facts from
// GET /api/reference ({ dialCode: "233", trunkPrefix: "0", nationalNumberLengths: [9] }).
// Ghana (10 digits with the trunk "0") is grouped 3-3-4: "024 123 4567". Other lengths are shown
// ungrouped until the server gives a pattern for them. Anything unexpected is shown exactly as received.
export function formatPhoneLocal(e164, country) {
  if (typeof e164 !== 'string' || !country) return e164 ?? '';
  const prefix = `+${country.dialCode}`;
  if (!e164.startsWith(prefix)) return e164;
  const national = e164.slice(prefix.length);
  if (!/^\d+$/.test(national) || !country.nationalNumberLengths?.includes(national.length)) return e164;
  const local = `${country.trunkPrefix ?? ''}${national}`;
  if (local.length === 10) return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  return local;
}

// The number for WhatsApp links: E.164 without the "+" (api.md BE4.5), e.g. "233241234567".
export function whatsAppNumber(e164) {
  return typeof e164 === 'string' ? e164.replace(/^\+/, '') : '';
}
