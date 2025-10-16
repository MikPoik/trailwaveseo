import React from 'react';

interface KeywordItem {
  keyword: string;
  count: number;
  density?: number; // percent (0-100) or relative score
  pages?: string[];
}

interface KeywordCloudProps {
  keywords: KeywordItem[];
  maxWords?: number;
  onClickKeyword?: (keyword: string) => void;
  className?: string;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Simple KeywordCloud component.
 * - sizes words by density (or count if density missing)
 * - accessible: renders a textual list as fallback
 */
export default function KeywordCloud({ keywords = [], maxWords = 40, onClickKeyword, className }: KeywordCloudProps) {
  const display = keywords.slice(0, maxWords);

  if (!display || display.length === 0) {
    return <div className={className}>No keywords available</div>;
  }

  // Determine min/max value for sizing
  const values = display.map(k => (k.density ?? k.count));
  const min = Math.min(...values);
  const max = Math.max(...values);

  const mapToFontSize = (value: number) => {
    // Map value in [min,max] to font size 12..36
    if (max === min) return 16;
    const ratio = (value - min) / (max - min);
    return Math.round(12 + ratio * (36 - 12));
  };

  return (
    <div className={`keyword-cloud ${className || ''}`}>
      <div className="sr-only" aria-hidden={false}>
        Top keywords: {display.map(k => `${k.keyword} (${Math.round((k.density ?? k.count) * 100) / 100})`).join(', ')}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {display.map((k, idx) => {
          const value = k.density ?? k.count;
          const fontSize = clamp(mapToFontSize(value), 12, 36);
          return (
            <button
              key={k.keyword + idx}
              onClick={() => onClickKeyword && onClickKeyword(k.keyword)}
              title={`${k.keyword} — ${k.count} occurrences${k.density ? ` — ${k.density.toFixed(2)}%` : ''}`}
              className="keyword-item text-gray-800 hover:text-blue-700"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1 }}
            >
              {k.keyword}
            </button>
          );
        })}
      </div>
    </div>
  );
}
