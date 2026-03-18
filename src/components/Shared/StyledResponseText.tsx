"use client";

import React from "react";

interface StyledResponseTextProps {
  content: string;
}

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={`${match.index}_strong`} className="font-semibold text-[#8f4317]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={`${match.index}_code`}
          className="rounded-md border border-orange-100/80 bg-orange-50/80 px-1.5 py-0.5 font-mono text-[0.92em] text-[#8f4317]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={`${match.index}_link`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#9d5423] underline decoration-orange-200 underline-offset-4 hover:text-[#7d3e15]"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function StyledResponseText({ content }: StyledResponseTextProps) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 1;
      const text = line.replace(/^#{1,3}\s/, "");
      const HeadingTag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      const headingClass =
        level === 1
          ? "text-[1.1rem] font-semibold tracking-tight text-zinc-950"
          : level === 2
            ? "text-base font-semibold tracking-tight text-zinc-900"
            : "text-sm font-semibold uppercase tracking-[0.16em] text-stone-500";

      blocks.push(
        <HeadingTag key={`heading_${i}`} className={headingClass}>
          {renderInline(text)}
        </HeadingTag>
      );
      i += 1;
      continue;
    }

    if (/^>\s/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s/, ""));
        i += 1;
      }

      blocks.push(
        <blockquote
          key={`quote_${i}`}
          className="rounded-2xl border border-orange-100/90 bg-[rgba(255,244,232,0.88)] px-4 py-3 text-sm leading-7 text-stone-700"
        >
          {quoteLines.map((quoteLine, quoteIndex) => (
            <p key={quoteIndex}>{renderInline(quoteLine)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s/, ""));
        i += 1;
      }

      blocks.push(
        <ul key={`ul_${i}`} className="space-y-2">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex items-start gap-3 text-sm leading-7 text-stone-700">
              <span className="mt-[0.72rem] h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i += 1;
      }

      blocks.push(
        <ol key={`ol_${i}`} className="space-y-2">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex items-start gap-3 text-sm leading-7 text-stone-700">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 font-mono text-[11px] text-[#8f4317]">
                {itemIndex + 1}
              </span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push(<div key={`divider_${i}`} className="h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent" />);
      i += 1;
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s/.test(lines[i].trim()) &&
      !/^>\s/.test(lines[i].trim()) &&
      !/^[-*]\s/.test(lines[i].trim()) &&
      !/^\d+\.\s/.test(lines[i].trim()) &&
      !/^---+$/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i].trim());
      i += 1;
    }

    blocks.push(
      <p key={`p_${i}`} className="text-[15px] leading-8 text-stone-700">
        {renderInline(paragraphLines.join(" "))}
      </p>
    );
  }

  return <div className="flex flex-col gap-4">{blocks}</div>;
}
