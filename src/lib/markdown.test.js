// Tests for the safe Markdown reader: the structure it finds, and that it can never produce a link
// (in particular a javascript: link) or anything other than plain text spans.
import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from './markdown.js';

// Collects every span in a parsed document, so tests can check all of them at once.
function allSpans(blocks) {
  return blocks.flatMap((b) => (b.type === 'list' ? b.items.flat() : b.spans));
}

describe('parseMarkdown structure', () => {
  it('reads headings, paragraphs and lists', () => {
    const blocks = parseMarkdown('# Terms\n\nFirst line\ncontinues here.\n\n- one\n- two\n\n1. first\n2. second');
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'list', 'list']);
    expect(blocks[0]).toMatchObject({ level: 1 });
    expect(blocks[1].spans).toEqual([{ type: 'text', text: 'First line continues here.' }]);
    expect(blocks[2]).toMatchObject({ ordered: false });
    expect(blocks[2].items).toHaveLength(2);
    expect(blocks[3]).toMatchObject({ ordered: true });
  });
  it('reads bold and italic', () => {
    expect(parseInline('We **never** sell *your* data')).toEqual([
      { type: 'text', text: 'We ' },
      { type: 'strong', text: 'never' },
      { type: 'text', text: ' sell ' },
      { type: 'em', text: 'your' },
      { type: 'text', text: ' data' },
    ]);
  });
});

describe('links are never clickable', () => {
  it('drops a javascript: link, keeping only its words', () => {
    const spans = parseInline('Click [here](javascript:alert(1)) now');
    expect(spans).toEqual([{ type: 'text', text: 'Click here now' }]);
    expect(JSON.stringify(spans)).not.toMatch(/javascript:/i);
  });
  it('drops other unsafe addresses too', () => {
    for (const address of ['JavaScript:alert(1)', 'data:text/html,<script>', 'http://example.com', 'vbscript:x']) {
      const text = JSON.stringify(parseInline(`[x](${address})`));
      expect(text).not.toContain(address.split('(')[0]);
    }
  });
  it('shows an https: address as plain text after the words', () => {
    expect(parseInline('Read [the law](https://example.org/act)')).toEqual([
      { type: 'text', text: 'Read the law (https://example.org/act)' },
    ]);
  });
  it('only ever produces text, strong, em, heading, paragraph and list nodes (no links, no HTML)', () => {
    const blocks = parseMarkdown('# A [x](javascript:void(0))\n\n<script>alert(1)</script> [y](https://a.b)\n\n- [z](javascript:1)');
    expect(blocks.every((b) => ['heading', 'paragraph', 'list'].includes(b.type))).toBe(true);
    const spans = allSpans(blocks);
    expect(spans.every((s) => ['text', 'strong', 'em'].includes(s.type))).toBe(true);
    expect(spans.some((s) => 'href' in s || 'url' in s)).toBe(false);
    expect(JSON.stringify(blocks)).not.toMatch(/javascript:/i);
    // HTML stays as text: React will show it, not run it.
    expect(spans.some((s) => s.text.includes('<script>'))).toBe(true);
  });
});
