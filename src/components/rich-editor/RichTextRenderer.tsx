"use client";

import { useId, useMemo } from "react";

interface RichTextRendererProps {
  html: string;
  className?: string;
}

function hasManualNumbering(html: string): boolean {
  const match = html.match(/<ol[^>]*>([\s\S]*?)<\/ol>/);
  if (!match) return false;
  const liTexts = match[1].match(/<li[^>]*>([\s\S]*?)<\/li>/g);
  if (!liTexts) return false;
  return liTexts.some((li) => /^\s*(?:\d+[.)]\s*)/.test(li.replace(/<[^>]+>/g, "")));
}

export default function RichTextRenderer({ html, className }: RichTextRendererProps) {
  const uid = useId();
  const wrapperClass = `rtr-${uid.replace(/[:$]/g, "")}`;
  const manualNumbers = useMemo(() => hasManualNumbering(html), [html]);

  return (
    <>
      <style>{`
        .${wrapperClass} ol { list-style-type: ${manualNumbers ? "none" : "decimal"}; list-style-position: inside; margin: 0; padding: 0; }
        .${wrapperClass} ul { list-style-type: disc; list-style-position: inside; margin: 0; padding: 0; }
        .${wrapperClass} li { color: inherit; }
        .${wrapperClass} li p { margin: 0; }
      `}</style>
      <div
        className={`${wrapperClass} ${className ?? ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
