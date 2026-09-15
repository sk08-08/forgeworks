"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Terminal, Copy, Check } from "lucide-react";

function decodeTerminalEntities(value: string) {
  return value
    .replace(/&gt;/gi, ">")
    .replace(/&lt;/gi, "<")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_match, code) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

type TerminalLine = {
  text: string;
  prompt: boolean;
};

function normalizeTerminalLines(content: string): TerminalLine[] {
  return String(content || "")
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("```"))
    .map((line) => {
      let text = decodeTerminalEntities(line)
        .replace(/^\s{0,3}#{1,6}\s+/, "")
        .replace(/^\s*[-*]\s+/, "")
        .replace(/\*\*/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\\([\\`*_{}\[\]()#+.!>|-])/g, "$1");

      const hadPrompt = /^\s*>/.test(text);

      text = text.replace(/^\s*(?:>\s*)+/, "");

      const trimmed = text.trim();

      const isOutput =
        trimmed.startsWith("✓") ||
        trimmed.startsWith("+") ||
        trimmed.startsWith("!");

      return {
        text,
        prompt: hadPrompt && !isOutput,
      };
    });
}

export function TechnicalTerminal({
  content,
  label = "release output",
}: {
  content: string;
  label?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => normalizeTerminalLines(content), [content]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.28 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!content.trim()) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        lines.map((line) => line.text).join("\n"),
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="fw-changelog-terminal"
      data-visible={visible ? "true" : "false"}
    >
      <div className="fw-changelog-terminal-chrome">
        <div className="fw-changelog-terminal-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span>
          <Terminal size={13} />
          FORGEWORKS // {label.toUpperCase()}
        </span>
        <button
          type="button"
          className="cursor-pointer"
          onClick={copy}
          aria-label="Copy technical notes"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      <div className="fw-changelog-terminal-screen" aria-label="Technical notes">
        <div className="fw-changelog-terminal-grid" aria-hidden="true" />
        {lines.map((line, index) => {
          const trimmed = line.text.trim();
          const command =
            index === 0 || trimmed.startsWith("$") || line.prompt;
          const success =
            trimmed.startsWith("✓") ||
            trimmed.startsWith("+") ||
            /(^|\s)(done|success|passed|complete)(\s|$)/i.test(trimmed);
          const warning =
            trimmed.startsWith("!") || /\bwarning\b/i.test(trimmed);

          return (
            <div
              key={`${index}-${line.text}`}
              className="fw-changelog-terminal-line"
              data-command={command ? "true" : undefined}
              data-success={success ? "true" : undefined}
              data-warning={warning ? "true" : undefined}
              data-empty={trimmed ? undefined : "true"}
              style={
                {
                  "--terminal-delay": `${Math.min(index * 70, 980)}ms`,
                } as React.CSSProperties
              }
            >
              {line.text || "\u00a0"}
            </div>
          );
        })}
        <span className="fw-changelog-terminal-cursor" aria-hidden="true" />
      </div>
    </div>
  );
}
