import React, { useMemo, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const SECTION_META = {
  'Perioada de Chat':                     { icon: '📅', accent: '#6366f1' },
  'Număr de Mesaje per Persoană':         { icon: '💬', accent: '#8b5cf6' },
  'Medie Mesaje pe Zi':                   { icon: '📈', accent: '#ec4899' },
  'Activitate de Vârf':                   { icon: '⚡', accent: '#f59e0b' },
  'Subiecte Favorite per Conversator':    { icon: '🎯', accent: '#10b981' },
  'Cele Mai Multe Link-uri Distribuite':  { icon: '🔗', accent: '#06b6d4' },
  'Subiecte Generale de Conversație':     { icon: '💭', accent: '#8b5cf6' },
  'Deductii Amuzante':                    { icon: '😂', accent: '#ec4899' },
  'Analiză Cuprinzătoare':                { icon: '🔍', accent: '#6366f1' },
};

function parseMarkdownSections(markdown) {
  const lines = markdown.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.slice(3).trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  return sections.map((s) => ({
    title: s.title,
    content: s.lines.join('\n').trim(),
  }));
}

export default function KnowledgeBase({ markdown }) {
  const sections = useMemo(() => parseMarkdownSections(markdown || ''), [markdown]);
  const [openSet, setOpenSet] = useState(() => new Set([0, 1, 3]));

  const toggle = (idx) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (!sections.length) return null;

  return (
    <div className="kb-accordion">
      {sections.map((section, idx) => {
        const meta = SECTION_META[section.title] || { icon: '📝', accent: '#6366f1' };
        const isOpen = openSet.has(idx);
        const html = DOMPurify.sanitize(marked.parse(section.content));

        return (
          <div key={idx} className={`kb-item${isOpen ? ' kb-item--open' : ''}`}>
            <button className="kb-header" onClick={() => toggle(idx)} aria-expanded={isOpen}>
              <span
                className="kb-icon"
                style={{ background: `${meta.accent}18`, color: meta.accent }}
              >
                {meta.icon}
              </span>
              <span className="kb-title">{section.title}</span>
              <svg
                className={`kb-chevron${isOpen ? ' kb-chevron--open' : ''}`}
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className={`kb-body${isOpen ? ' kb-body--open' : ''}`}>
              <div
                className="kb-content knowledge-content"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
