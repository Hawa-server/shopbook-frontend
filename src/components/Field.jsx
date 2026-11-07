// A labelled input (docs/design.md §6 Field): label (15/600) above, a 52px input, then a hint or an
// error (14px) below. Errors are in words with a warning icon, never colour alone, and are tied to the
// input (aria-describedby) so screen readers read them. Password fields get a "Show" / "Hide" button.

import { useId, useState } from 'react';
import { useT } from '../i18n/t.js';
import Icon from './Icon.jsx';

export default function Field({ label, error, hint, type = 'text', className = '', ...inputProps }) {
  const { t } = useT();
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[0.9375rem] font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && shown ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`min-h-[3.25rem] w-full rounded-input border-[1.5px] bg-paper px-4 text-body text-ink
            ${error ? 'border-danger' : 'border-input-line'} ${isPassword ? 'pr-24' : ''}`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-pressed={shown}
            className="absolute inset-y-0 right-0 min-w-tap rounded-r-input px-4 text-secondary font-bold text-primary"
          >
            {shown ? t('field.hide') : t('field.show')}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-secondary text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-secondary font-semibold text-danger">
          <Icon name="warning" size={18} className="mt-px" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
