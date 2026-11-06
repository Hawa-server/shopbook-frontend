// What a list shows when it has nothing in it yet (docs/design.md §6 EmptyState):
// one line saying what's missing and, when there is one, one button to fix it.

import Icon from './Icon.jsx';
import Button from './Button.jsx';

export default function EmptyState({ icon, message, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-summary bg-paper px-5 py-10 text-center">
      {icon && (
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon name={icon} size={28} />
        </span>
      )}
      <p className="text-body text-ink-2">{message}</p>
      {actionLabel && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
