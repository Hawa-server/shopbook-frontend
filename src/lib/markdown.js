// A tiny, safe reader for the privacy notice and terms, which the server sends as Markdown
// (GET /api/legal/current). No library and no HTML: it turns the text into a plain tree of blocks and
// spans, and components/MarkdownText.jsx draws that tree with ordinary React elements. React escapes
// all text, so any HTML inside the Markdown simply shows as text and can never run (the CSP rule).
//
// Links are NEVER clickable: "[words](address)" becomes plain text. An https: address is shown after
// the words, in brackets, so the reader can still see where it points; any other address
// (javascript:, data:, http:…) is dropped and only the words remain.
//
// Supported: # headings (1–3), paragraphs, "- " / "* " and "1. " lists, **bold**, *italic*.

// Splits one line of text into spans: text, strong (bold) and em (italic). Links become text.
export function parseInline(line) {
  // Links first: replace them with safe plain text.
  // The address may hold one level of brackets (e.g. "javascript:alert(1)") and an optional title.
  const withoutLinks = line.replace(/\[([^\]]*)\]\(((?:[^()\s]|\([^()]*\))*)(?:\s+[^)]*)?\)/g, (_m, words, address) =>
    /^https:\/\//i.test(address) ? `${words} (${address})` : words,
  );
  const spans = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(withoutLinks)) !== null) {
    if (match.index > last) spans.push({ type: 'text', text: withoutLinks.slice(last, match.index) });
    spans.push(match[1] !== undefined ? { type: 'strong', text: match[1] } : { type: 'em', text: match[2] });
    last = pattern.lastIndex;
  }
  if (last < withoutLinks.length) spans.push({ type: 'text', text: withoutLinks.slice(last) });
  return spans;
}

// Turns a whole Markdown document into a list of blocks:
//   { type: 'heading', level, spans } | { type: 'paragraph', spans } | { type: 'list', ordered, items: [spans] }
export function parseMarkdown(text) {
  const blocks = [];
  let paragraph = [];
  let list = null;

  // Ends the paragraph or list being collected, if any.
  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', spans: parseInline(paragraph.join(' ')) });
      paragraph = [];
    }
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (line === '') {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1].length, spans: parseInline(heading[2]) });
    } else if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (paragraph.length > 0 || (list && list.ordered !== ordered)) flush();
      if (!list) list = { type: 'list', ordered, items: [] };
      list.items.push(parseInline((bullet ?? numbered)[1]));
    } else {
      if (list) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
