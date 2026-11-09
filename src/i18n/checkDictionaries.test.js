// Tests for the check:i18n rules, using small broken dictionaries.
import { describe, expect, it } from 'vitest';
import { checkDictionaries } from './checkDictionaries.js';

const forms = ['one', 'other'];
const en = (dictionary) => ({ tag: 'en', status: 'complete', dictionary, pluralForms: forms });
const tw = (dictionary, status = 'draft') => ({ tag: 'tw', status, dictionary, pluralForms: forms });
const plural = { 'a.one': '{count} record', 'a.other': '{count} records' };

describe('checkDictionaries', () => {
  it('accepts matching dictionaries', () => {
    expect(checkDictionaries([en({ x: 'X', ...plural }), tw({ x: 'Y', ...plural })]).problems).toEqual([]);
  });
  it('fails when English is missing a plural form', () => {
    expect(checkDictionaries([en({ 'a.one': '{count} record' })]).problems.join()).toContain('"a" is missing its "other" form');
  });
  it('fails when a draft language has only half a plural', () => {
    expect(checkDictionaries([en(plural), tw({ 'a.one': '{count} krataa' })]).problems.join()).toContain('tw: plural "a" is missing its "other" form');
  });
  it('lets a draft language miss a whole plural, listing it', () => {
    const out = checkDictionaries([en(plural), tw({})]);
    expect(out.problems).toEqual([]);
    expect(out.notes.join()).toContain('a.one');
  });
  it('fails when a complete language misses a key', () => {
    expect(checkDictionaries([en({ x: 'X' }), tw({}, 'complete')]).problems.join()).toContain('tw (complete): missing "x"');
  });
  it('fails when a plural form loses {count}', () => {
    expect(checkDictionaries([en(plural), tw({ 'a.one': 'krataa', 'a.other': '{count} nkrataa' })]).problems.join()).toContain('placeholders differ');
  });
  it('fails on a key English lacks, and on an empty text', () => {
    const problems = checkDictionaries([en({ x: 'X' }), tw({ x: ' ', y: 'Y' })]).problems.join();
    expect(problems).toContain('tw: empty "x"');
    expect(problems).toContain('"y" is not an English key');
  });
  it('fails when code counts a text with no plural forms, or uses a plural without a count', () => {
    const usage = { plural: ['x'], plain: ['a'] };
    const problems = checkDictionaries([en({ x: 'X', ...plural })], usage).problems.join();
    expect(problems).toContain(`t('x', { count })`);
    expect(problems).toContain(`t('a') without a count`);
  });
});
