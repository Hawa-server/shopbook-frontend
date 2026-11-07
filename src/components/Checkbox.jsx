// A big tick box with its words (used for "I accept the privacy notice and terms").
// A real <input type="checkbox">, drawn at 28px inside a row at least 48px tall, so it's easy to tap.
// `children` may contain buttons (e.g. links that open the terms); tapping them doesn't tick the box.

import { useId } from 'react';
import Icon from './Icon.jsx';

export default function Checkbox({ checked, onChange, error, children }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-tap items-start gap-3">
        <span className="relative mt-1 size-7 shrink-0">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`peer absolute inset-0 size-7 cursor-pointer appearance-none rounded-md border-2 bg-paper checked:border-primary checked:bg-primary
              ${error ? 'border-danger' : 'border-input-line'}`}
          />
          <Icon name="check" size={22} className="pointer-events-none absolute left-[3px] top-[3px] hidden text-paper peer-checked:block" />
        </span>
        <label htmlFor={id} className="pt-1 text-body">
          {children}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-secondary font-semibold text-danger">
          <Icon name="warning" size={18} className="mt-px" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
