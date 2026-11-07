// The PIN entry: four boxes that fill as digits are typed, and a big on-screen number pad
// (keys at least 64px). Used to set a PIN and to unlock the app. When the 4th digit is typed it calls
// onComplete(pin) and clears itself, so the digits never stay on screen or in memory longer than needed.
// The boxes show dots, never the digits.

import { useState } from 'react';
import { useT } from '../i18n/t.js';
import { PIN_LENGTH } from '../crypto/pin.js';
import Icon from './Icon.jsx';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function PinPad({ onComplete, busy = false }) {
  const { t } = useT();
  const [digits, setDigits] = useState('');

  // Adds one digit; on the 4th, hands the PIN over and starts again.
  function press(key) {
    if (busy) return;
    if (key === 'del') {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    const next = digits + key;
    if (next.length < PIN_LENGTH) {
      setDigits(next);
    } else {
      setDigits('');
      onComplete(next);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-4" aria-label={t('pin.entered', { n: digits.length })} role="img">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className={`flex size-12 items-center justify-center rounded-input border-2 ${
              i < digits.length ? 'border-primary bg-primary-soft' : 'border-input-line bg-paper'
            }`}
          >
            {i < digits.length && <span className="size-3.5 rounded-full bg-primary" />}
          </span>
        ))}
      </div>
      <div className="grid w-full max-w-80 grid-cols-3 gap-3">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => press(key)}
              aria-label={key === 'del' ? t('pin.delete') : key}
              className="min-h-16 rounded-card bg-paper text-[1.75rem] font-bold text-ink active:bg-primary-soft disabled:opacity-40"
            >
              {key === 'del' ? <Icon name="backspace" size={30} className="mx-auto" /> : key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
