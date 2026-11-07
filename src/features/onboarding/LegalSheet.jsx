// Shows the privacy notice or the terms (from GET /api/legal/current) in a sheet, in the app's language,
// or in English when that language isn't available yet. Drawn safely by MarkdownText (no HTML, no links).

import { useT } from '../../i18n/t.js';
import Sheet from '../../components/Sheet.jsx';
import MarkdownText from '../../components/MarkdownText.jsx';

// `legal`: the GET /api/legal/current answer. `doc`: 'privacy' | 'terms' | null (closed).
export default function LegalSheet({ legal, doc, onClose }) {
  const { t, language } = useT();
  const text = doc ? (legal?.documents?.[language]?.[doc] ?? legal?.documents?.en?.[doc] ?? '') : '';
  return (
    <Sheet open={Boolean(doc)} title={doc ? t(`legal.${doc}`) : ''} onClose={onClose}>
      <MarkdownText text={text} />
    </Sheet>
  );
}
