// The app's icons: simple stroke icons drawn here as inline SVG (docs/design.md §5).
// No icon library and no emoji. Icons are decoration: the words next to them carry the meaning,
// so every icon is hidden from screen readers (aria-hidden) and never used without a label.

// Each icon is a list of SVG shapes on a 24×24 grid.
const ICONS = {
  bag: (
    <>
      <path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 14.2A5 5 0 0 1 21 19.5" />
    </>
  ),
  box: (
    <>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  dots: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  sync: (
    <>
      <path d="M19.5 10A8 8 0 0 0 5 7.5" />
      <path d="M5 3.5v4h4" />
      <path d="M4.5 14A8 8 0 0 0 19 16.5" />
      <path d="M19 20.5v-4h-4" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  warning: (
    <>
      <path d="M12 3.8 2.8 19.5h18.4z" />
      <path d="M12 10v4.2" />
      <circle cx="12" cy="16.9" r="0.6" fill="currentColor" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13.5" rx="2" />
      <path d="M3 10h18M15.5 14.8h2" />
    </>
  ),
  bars: <path d="M6 19.5v-4M12 19.5v-8M18 19.5V7" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5s1.1-6.1 3.5-8.5z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r="0.6" fill="currentColor" />
    </>
  ),
};

// Draws one icon. `size` in px (24 by default); colour follows the text colour (currentColor).
export default function Icon({ name, size = 24, className = '' }) {
  const shapes = ICONS[name];
  if (!shapes) throw new Error(`Unknown icon "${name}"`);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {shapes}
    </svg>
  );
}
