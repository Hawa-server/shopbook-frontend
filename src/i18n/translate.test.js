// Tests for translate(): picking the language, filling in {words}, and falling back safely.
import { describe, expect, it } from 'vitest';
import { translate } from './translate.js';

describe('translate', () => {
  it('returns the text in the chosen language', () => {
    expect(translate('en', 'nav.sell')).toBe('Sell');
    expect(translate('tw', 'nav.sell')).toBe('Tɔn');
  });
  it('fills in placeholders', () => {
    expect(translate('en', 'sync.notSentCount', { n: 2 })).toBe('2 not sent');
  });
  it('leaves an unknown placeholder visible rather than hiding it', () => {
    expect(translate('en', 'sync.notSentCount', {})).toBe('{n} not sent');
  });
  it('falls back to English for an unknown language', () => {
    expect(translate('fr', 'nav.sell')).toBe('Sell');
  });
  it('shows English for a key a draft language does not have yet', async () => {
    const { default: tw } = await import('./tw.js');
    const saved = tw['nav.sell'];
    delete tw['nav.sell'];
    try {
      expect(translate('tw', 'nav.sell')).toBe('Sell');
    } finally {
      tw['nav.sell'] = saved;
    }
  });
  it('shows the key itself when it is missing everywhere', () => {
    expect(translate('en', 'no.such.key')).toBe('no.such.key');
  });
});
