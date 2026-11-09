// Showing times and days in the BUSINESS's time zone (api.md: business dates use me.businesses[].timezone),
// written the way design.md asks: "2:15 pm", "Tue 3 Nov". Dates aren't money, so the browser's own
// date formatting is fine here; only the time zone must be the shop's, not the phone's.

// "10:42 am" for an ISO time, in the given IANA time zone (e.g. Africa/Accra).
export function formatTime(iso, timeZone) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone }).format(date).replace(/\s?([ap])\.?m\.?$/i, ' $1m').toLowerCase();
}

// "Tue 3 Nov" for an ISO time, in the given time zone.
export function formatDay(iso, timeZone) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone }).format(date).replace(',', '');
}

// Whole days between an ISO time and now (0 = less than a day).
export function daysSince(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.floor((now - then) / 86_400_000);
}
