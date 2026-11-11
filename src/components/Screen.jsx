// The frame of one screen: its header, then the app's notices (AppNotices), then its scrolling content with
// room at the bottom, so nothing is ever hidden behind the bottom tabs or a fixed main button (design.md §7.6).
// `action`: an optional main button, fixed just above the bottom tabs, within thumb reach (design.md §4).

import Header from './Header.jsx';
import AppNotices from './AppNotices.jsx';

export default function Screen({ title, subtitle, back, action, children }) {
  return (
    <>
      <Header title={title} subtitle={subtitle} back={back} />
      <main
        className={`flex flex-col gap-3 px-4 pt-4 ${
          action ? 'pb-[calc(var(--spacing-tabs)+env(safe-area-inset-bottom)+6rem)]' : 'pb-[calc(var(--spacing-tabs)+env(safe-area-inset-bottom)+1.5rem)]'
        }`}
      >
        <AppNotices />
        {children}
      </main>
      {action && (
        <div className="fixed inset-x-0 z-10 mx-auto max-w-120 px-4 bottom-[calc(var(--spacing-tabs)+env(safe-area-inset-bottom)+0.75rem)]">
          {action}
        </div>
      )}
    </>
  );
}
