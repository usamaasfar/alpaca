import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { ScrollArea } from "~/renderer/components/ui/scroll-area";

export const ComposerResult = ({ result, footer }: { result: string; footer?: ReactNode }) => {
  if (!result) return null;

  return (
    <div className="relative h-full w-full">
      <ScrollArea className="h-full w-full" scrollbarClassName="data-[orientation=vertical]:w-2 data-[orientation=vertical]:py-32">
        <div className="mx-auto min-h-full max-w-3xl px-12 pr-16 pt-4 pb-8 flex flex-col">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  return !inline ? (
                    <pre className="overflow-x-auto rounded-lg bg-muted/50 px-4 py-3 my-4 text-[13px] leading-relaxed font-mono">
                      <code {...props}>{children}</code>
                    </pre>
                  ) : (
                    <code className="rounded px-1.5 py-0.5 bg-muted/60 text-[13px] font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                h1: ({ children }) => <h1 className="mb-6 mt-8 text-3xl font-semibold tracking-tight first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="mb-4 mt-8 text-2xl font-semibold tracking-tight first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-3 mt-6 text-xl font-medium tracking-tight first:mt-0">{children}</h3>,
                h4: ({ children }) => <h4 className="mb-2 mt-4 text-base font-medium first:mt-0">{children}</h4>,
                p: ({ children }) => <p className="mb-4 leading-7 text-foreground/90">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                a: ({ children, href }) => (
                  <a
                    href={href}
                    className="text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground/60 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      if (href) {
                        window.electronAPI.openExternalLink(href);
                      }
                    }}
                  >
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="mb-4 space-y-2 list-disc list-outside ml-5 marker:text-foreground/40">{children}</ul>,
                ol: ({ children }) => (
                  <ol className="mb-4 space-y-2 list-decimal list-outside ml-5 marker:text-foreground/40">{children}</ol>
                ),
                li: ({ children }) => <li className="leading-7 text-foreground/90 pl-1">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="mb-4 border-l-2 border-foreground/20 pl-4 py-0.5 italic text-foreground/70">{children}</blockquote>
                ),
                hr: () => <hr className="my-8 border-0 h-px bg-border/50" />,
                table: ({ children }) => (
                  <div className="my-6 overflow-x-auto">
                    <table className="w-full border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
                tbody: ({ children }) => <tbody className="divide-y divide-border/50">{children}</tbody>,
                tr: ({ children }) => <tr>{children}</tr>,
                th: ({ children }) => <th className="px-4 py-3 text-left text-sm font-semibold text-foreground/90">{children}</th>,
                td: ({ children }) => <td className="px-4 py-3 text-sm text-foreground/80">{children}</td>,
              }}
            >
              {result}
            </ReactMarkdown>
          </div>
          {footer && <div className="mt-auto pt-8">{footer}</div>}
        </div>
      </ScrollArea>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-linear-to-b from-background to-transparent" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-background to-transparent"
      />
    </div>
  );
};
