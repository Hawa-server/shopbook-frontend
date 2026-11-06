// The app's button (docs/design.md §6): primary, secondary, danger and quiet variants.
// Main actions are 56px tall; nothing tappable is smaller than 48px. Heights use min-height in rem,
// so a button grows with the phone's larger text instead of cutting its words off.

const VARIANTS = {
  primary: 'bg-primary text-paper active:bg-primary-pressed',
  secondary: 'bg-paper text-primary border-2 border-primary active:bg-primary-soft',
  danger: 'bg-paper text-danger border-2 border-danger active:bg-danger-soft',
  quiet: 'bg-transparent text-primary active:bg-primary-soft',
};

const SIZES = {
  main: 'min-h-main px-5 text-body', // 56px
  md: 'min-h-[3.25rem] px-5 text-body', // 52px secondary
  sm: 'min-h-tap px-4 text-body', // 48px, the smallest allowed
};

// A real <button> (never a tappable div), so it works with keyboards and screen readers.
// `full` makes it full width (main actions at the bottom of a screen).
export default function Button({ variant = 'primary', size = 'main', full = false, className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-card font-bold leading-tight
        ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''}
        disabled:opacity-40 disabled:pointer-events-none ${className}`}
      {...props}
    />
  );
}
