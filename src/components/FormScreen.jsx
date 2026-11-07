// The frame for a screen without bottom tabs (sign in, create account, PIN, account changes):
// the header, the scrolling content, and the main action fixed at the bottom within thumb reach.
// The content has bottom padding as tall as the action area, so nothing is ever hidden behind it
// (docs/design.md §7.6). Wrap it in a <form> by passing onSubmit, so the keyboard's Go key works.

import Header from './Header.jsx';

export default function FormScreen({ title, subtitle, back, onSubmit, actions, children }) {
  const Wrapper = onSubmit ? 'form' : 'div';
  return (
    <div className="mx-auto min-h-dvh max-w-120 bg-ground">
      <Header title={title} subtitle={subtitle} back={back} />
      <Wrapper
        noValidate={onSubmit ? true : undefined}
        onSubmit={
          onSubmit
            ? (e) => {
                e.preventDefault();
                onSubmit();
              }
            : undefined
        }
      >
        <main className="flex flex-col gap-4 px-4 pt-4 pb-[calc(10rem+env(safe-area-inset-bottom))]">{children}</main>
        {actions && (
          <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-120 flex-col gap-2 border-t border-line bg-paper px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {actions}
          </div>
        )}
      </Wrapper>
    </div>
  );
}
