// Draws the privacy notice or terms from the safe tree made by lib/markdown.js, using ordinary React
// elements only (no dangerouslySetInnerHTML), so nothing in the text can run as code, and links are
// never clickable.

import { parseMarkdown } from '../lib/markdown.js';

// Draws a list of spans (text, bold, italic).
function Spans({ spans }) {
  return spans.map((span, i) => {
    if (span.type === 'strong') return <strong key={i}>{span.text}</strong>;
    if (span.type === 'em') return <em key={i}>{span.text}</em>;
    return <span key={i}>{span.text}</span>;
  });
}

const HEADING_CLASS = { 1: 'text-title font-bold', 2: 'text-item font-bold', 3: 'text-body font-bold' };

export default function MarkdownText({ text }) {
  const blocks = parseMarkdown(text);
  return (
    <div className="flex flex-col gap-3 text-body leading-relaxed text-ink">
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          const Tag = `h${block.level + 2}`; // h3–h5: the sheet's own title is the h2
          return (
            <Tag key={i} className={HEADING_CLASS[block.level]}>
              <Spans spans={block.spans} />
            </Tag>
          );
        }
        if (block.type === 'list') {
          const List = block.ordered ? 'ol' : 'ul';
          return (
            <List key={i} className={`flex flex-col gap-1 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
              {block.items.map((spans, j) => (
                <li key={j}>
                  <Spans spans={spans} />
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={i}>
            <Spans spans={block.spans} />
          </p>
        );
      })}
    </div>
  );
}
