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
  it('picks the plural form from the count, in both languages', () => {
    expect(translate('en', 'pin.wrong', { count: 1 })).toBe('Wrong PIN. 1 try left.');
    expect(translate('en', 'pin.wrong', { count: 3 })).toBe('Wrong PIN. 3 tries left.');
    expect(translate('en', 'wipe.unsentLost', { count: 1 })).toBe("1 record that wasn't sent was removed. Tell the shop owner.");
    expect(translate('en', 'wipe.unsentLost', { count: 2 })).toBe("2 records that weren't sent were removed. Tell the shop owner.");
    expect(translate('tw', 'wipe.unsentLost', { count: 1 })).toContain('krataa 1');
    expect(translate('tw', 'wipe.unsentLost', { count: 2 })).toContain('nkrataa 2');
  });
  it('treats zero as the "other" form', () => {
    expect(translate('en', 'pin.wrong', { count: 0 })).toBe('Wrong PIN. 0 tries left.');
  });
  it('shows the English form when a language lacks that plural', async () => {
    const { default: tw } = await import('./tw.js');
    const one = tw['pin.wrong.one'];
    delete tw['pin.wrong.one'];
    try {
      expect(translate('tw', 'pin.wrong', { count: 1 })).toBe('Wrong PIN. 1 try left.');
    } finally {
      tw['pin.wrong.one'] = one;
    }
  });
  it('shows the key itself when it is missing everywhere', () => {
    expect(translate('en', 'no.such.key')).toBe('no.such.key');
  });
});
