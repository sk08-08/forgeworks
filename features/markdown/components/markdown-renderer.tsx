"use client";

import React, { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

// ---------------------------------------------------------------------------
// MarkdownRenderer
// Renders GFM markdown safely with proper styling
// ---------------------------------------------------------------------------

export type MarkdownHeading = {
  level: 1 | 2;
  title: string;
  id: string;
  line: number;
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
  headingIdPrefix?: string;
}

interface MarkdownInlineRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

function injectColorLinks(md: string) {
  return md.replace(
    /\[([\s\S]*?)\]\{#([0-9a-fA-F]{3,6})\}/g,
    "[$1](#color-$2)",
  );
}

function plainHeadingText(value: string) {
  return value
    .replace(/\[([^\]]+)\]\{#[0-9a-fA-F]{3,6}\}/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]+/g, "")
    .replace(/\\([\\`*_{}\[\]()#+.!>|-])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyHeading(value: string) {
  const slug = plainHeadingText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "section";
}

export function extractMarkdownHeadings(
  content: string,
  prefix = "",
): MarkdownHeading[] {
  const counts = new Map<string, number>();
  const safePrefix = prefix
    ? `${slugifyHeading(prefix)}--`
    : "";

  return String(content || "")
    .split(/\r?\n/)
    .map((line, index) => {
      const match = line.match(/^\s{0,3}(#{1,2})\s+(.+?)\s*#*\s*$/);
      if (!match) return null;

      const level = match[1].length as 1 | 2;
      const title = plainHeadingText(match[2]);
      if (!title) return null;

      const base = slugifyHeading(title);
      const occurrence = (counts.get(base) || 0) + 1;
      counts.set(base, occurrence);

      return {
        level,
        title,
        id: `${safePrefix}${base}${occurrence > 1 ? `-${occurrence}` : ""}`,
        line: index + 1,
      } satisfies MarkdownHeading;
    })
    .filter((heading): heading is MarkdownHeading => Boolean(heading));
}

function reactNodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(reactNodeText).join("");
  }

  if (React.isValidElement(node)) {
    return reactNodeText((node.props as { children?: React.ReactNode }).children);
  }

  return "";
}

export function MarkdownRenderer({
  content,
  className = "",
  style,
  headingIdPrefix,
}: MarkdownRendererProps) {
  if (!content?.trim()) return null;

  const [copiedHeadingId, setCopiedHeadingId] = useState<string | null>(null);

  const renderedContent = injectColorLinks(content);
  const headings = headingIdPrefix
    ? extractMarkdownHeadings(content, headingIdPrefix)
    : [];
  const headingByLine = new Map(
    headings.map((heading) => [heading.line, heading]),
  );

  const copyHeadingLink = async (id: string) => {
    if (typeof window === "undefined") return;

    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${id}`;
    window.history.replaceState(null, "", `#${id}`);

    try {
      await navigator.clipboard.writeText(url);
      setCopiedHeadingId(id);
      window.setTimeout(() => {
        setCopiedHeadingId((current) => (current === id ? null : current));
      }, 1400);
    } catch {
      setCopiedHeadingId(null);
    }
  };

  const resolveHeading = (
    node: any,
    children: React.ReactNode,
    level: 1 | 2,
  ) => {
    const line = node?.position?.start?.line;
    const extracted = typeof line === "number" ? headingByLine.get(line) : undefined;

    if (extracted) return extracted;

    const title = reactNodeText(children).trim();
    return {
      level,
      title,
      id: headingIdPrefix
        ? `${slugifyHeading(headingIdPrefix)}--${slugifyHeading(title)}`
        : "",
      line: typeof line === "number" ? line : -1,
    };
  };

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "min-w-0 w-full overflow-hidden",
        "wrap-anywhere",
        className,
      )}
      style={style}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize as any]}
        components={{
          h1: ({ children, node, ...props }: any) => {
            const heading = resolveHeading(node, children, 1);

            return (
              <h1
                id={headingIdPrefix ? heading.id : undefined}
                data-changelog-section={
                  headingIdPrefix ? "true" : undefined
                }
                data-changelog-section-level={
                  headingIdPrefix ? "1" : undefined
                }
                className="text-xl font-bold mt-4 mb-2"
                {...props}
              >
                <span className="fw-changelog-heading-text">{children}</span>
                {headingIdPrefix && heading.id && (
                  <button
                    type="button"
                    className="fw-changelog-heading-link"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void copyHeadingLink(heading.id);
                    }}
                    aria-label={`Copy link to ${heading.title}`}
                    title={
                      copiedHeadingId === heading.id
                        ? "Link copied"
                        : "Copy section link"
                    }
                  >
                    {copiedHeadingId === heading.id ? (
                      <Check size={14} />
                    ) : (
                      <Link2 size={14} />
                    )}
                  </button>
                )}
              </h1>
            );
          },
          h2: ({ children, node, ...props }: any) => {
            const heading = resolveHeading(node, children, 2);

            return (
              <h2
                id={headingIdPrefix ? heading.id : undefined}
                data-changelog-section={
                  headingIdPrefix ? "true" : undefined
                }
                data-changelog-section-level={
                  headingIdPrefix ? "2" : undefined
                }
                className="text-lg font-bold mt-3 mb-1.5"
                {...props}
              >
                <span className="fw-changelog-heading-text">{children}</span>
                {headingIdPrefix && heading.id && (
                  <button
                    type="button"
                    className="fw-changelog-heading-link"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void copyHeadingLink(heading.id);
                    }}
                    aria-label={`Copy link to ${heading.title}`}
                    title={
                      copiedHeadingId === heading.id
                        ? "Link copied"
                        : "Copy section link"
                    }
                  >
                    {copiedHeadingId === heading.id ? (
                      <Check size={14} />
                    ) : (
                      <Link2 size={14} />
                    )}
                  </button>
                )}
              </h2>
            );
          },
          h3: ({ children, ...props }: any) => (
            <h3 className="text-base font-semibold mt-2 mb-1" {...props}>
              {children}
            </h3>
          ),
          p: ({ children, ...props }: any) => (
            <p className="mb-2 leading-relaxed" {...props}>
              {children}
            </p>
          ),
          img: ({ src, alt, title, ...props }: any) => {
            const value = String(src || "").trim();

            if (!value) {
              return null;
            }

            let allowed = false;

            try {
              const imageUrl = new URL(value);

              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

              if (supabaseUrl) {
                const base = new URL(supabaseUrl);

                allowed =
                  imageUrl.origin === base.origin &&
                  imageUrl.pathname.includes(
                    "/storage/v1/object/public/markdown-assets/",
                  );
              }
            } catch {
              allowed = false;
            }

            if (!allowed) {
              return (
                <span className="my-2 block rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Image unavailable
                  {alt ? `: ${alt}` : ""}
                </span>
              );
            }

            return (
              <img
                src={value}
                alt={alt || ""}
                title={title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className={cn(
                  "my-3 block",
                  "max-h-[32rem] w-auto max-w-full",
                  "rounded-xl border object-contain shadow-sm",
                )}
                {...props}
              />
            );
          },
          a: ({ children, href, ...props }: any) => {
            if (href?.startsWith("#color-")) {
              const color = "#" + href.replace("#color-", "");
              return <span style={{ color }}>{children}</span>;
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors break-all wrap-anywhere"
                {...props}
              >
                {children}
              </a>
            );
          },
          strong: ({ children, ...props }: any) => (
            <strong className="font-bold" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }: any) => (
            <em className="italic" {...props}>
              {children}
            </em>
          ),
          del: ({ children, ...props }: any) => (
            <del
              className="text-muted-foreground line-through decoration-2"
              {...props}
            >
              {children}
            </del>
          ),
          ul: ({ children, ...props }: any) => (
            <ul className="list-disc pl-5 mb-2 space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }: any) => (
            <ol className="list-decimal pl-5 mb-2 space-y-1" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }: any) => (
            <li className="leading-relaxed" {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }: any) => (
            <blockquote
              className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-2"
              {...props}
            >
              {children}
            </blockquote>
          ),
          pre: ({ children, ...props }: any) => (
            <pre
              className={cn(
                "mb-2 max-w-full overflow-hidden rounded-lg bg-muted p-4",
                "whitespace-pre-wrap break-words text-sm",
                "[&_code]:bg-transparent",
                "[&_code]:p-0",
                "[&_code]:text-inherit",
                "[&_code]:whitespace-pre-wrap",
                "[&_code]:break-words",
              )}
              {...props}
            >
              {children}
            </pre>
          ),

          code: ({ children, className: codeClass, ...props }: any) => (
            <code
              className={cn(
                "font-mono",
                "rounded bg-muted px-1.5 py-0.5 text-sm",
                "wrap-anywhere",
                codeClass,
              )}
              {...props}
            >
              {children}
            </code>
          ),
          hr: (props: any) => <hr className="border-border my-4" {...props} />,
          table: ({ children, ...props }: any) => (
            <div className="overflow-x-auto mb-2">
              <table
                className="min-w-full border-collapse border border-border text-sm"
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }: any) => (
            <thead className="bg-muted/50" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }: any) => (
            <th
              className="border border-border px-3 py-2 text-left font-semibold"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }: any) => (
            <td className="border border-border px-3 py-2" {...props}>
              {children}
            </td>
          ),
        }}
      >
        {renderedContent}
      </ReactMarkdown>
    </div>
  );
}

export function MarkdownInlineRenderer({
  content,
  className = "",
  style,
}: MarkdownInlineRendererProps) {
  if (!content?.trim()) return null;

  const renderedContent = injectColorLinks(content);

  return (
    <span
      className={cn("min-w-0 max-w-full wrap-anywhere", className)}
      style={style}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize as any]}
        components={{
          p: ({ children }) => <>{children}</>,
          img: () => null,
          ul: ({ children }) => <>{children}</>,
          ol: ({ children }) => <>{children}</>,
          li: ({ children }) => <>{children}</>,
          blockquote: ({ children }) => <>{children}</>,
          h1: ({ children }) => <>{children}</>,
          h2: ({ children }) => <>{children}</>,
          h3: ({ children }) => <>{children}</>,
          a: ({ children, href, ...props }: any) => {
            if (href?.startsWith("#color-")) {
              const color = "#" + href.replace("#color-", "");
              return <span style={{ color }}>{children}</span>;
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 break-all wrap-anywhere"
                {...props}
              >
                {children}
              </a>
            );
          },
          strong: ({ children }) => (
            <strong className="font-bold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 font-mono">
              {children}
            </code>
          ),
          del: ({ children }) => (
            <del className="text-muted-foreground line-through">{children}</del>
          ),
        }}
      >
        {renderedContent}
      </ReactMarkdown>
    </span>
  );
}
