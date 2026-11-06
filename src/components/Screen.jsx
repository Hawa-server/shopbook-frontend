// The frame of one screen: its header, then its scrolling content with room at the bottom, so nothing
// is ever hidden behind the bottom tabs or a fixed main button (docs/design.md §7.6).

import Header from './Header.jsx';

export default function Screen({ title, subtitle, back, children }) {
  return (
    <>
      <Header title={title} subtitle={subtitle} back={back} />
      <main className="flex flex-col gap-3 px-4 pt-4 pb-[calc(var(--spacing-tabs)+env(safe-area-inset-bottom)+1.5rem)]">
        {children}
      </main>
    </>
  );
}
