import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { ScrollArea } from "~/renderer/components/ui/scroll-area";

export const ComposerResult = ({ result, footer }: { result: string; footer?: ReactNode }) => {
  if (!result) return null;

  return (
    <div className="relative h-full w-full">
      <ScrollArea className="h-full w-full" scrollbarClassName="data-[orientation=vertical]:w-2.5 data-[orientation=vertical]:py-32">
        <div className="mx-auto min-h-full max-w-2xl px-8 pr-14 pt-2 pb-6 flex flex-col">
          <div className="prose prose-sm max-w-none text-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeHighlight]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  return !inline ? (
                    <pre className="overflow-x-auto rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground">
                      <code {...props}>{children}</code>
                    </pre>
                  ) : (
                    <code className="rounded bg-muted px-1 py-0.5 text-sm text-foreground" {...props}>
                      {children}
                    </code>
                  );
                },
                h1: ({ children }) => <h1 className="mb-4 text-2xl font-bold text-foreground">{children}</h1>,
                h2: ({ children }) => <h2 className="mb-3 text-xl font-semibold text-foreground">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-2 text-lg font-medium text-foreground">{children}</h3>,
                p: ({ children }) => <p className="mb-3 leading-relaxed text-foreground">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                a: ({ children, href }) => (
                  <a href={href} className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer">
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="mb-3 list-inside list-disc space-y-1 text-foreground">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 list-inside list-decimal space-y-1 text-foreground">{children}</ol>,
                blockquote: ({ children }) => (
                  <blockquote className="mb-3 border-l-2 border-border pl-3 text-muted-foreground italic">{children}</blockquote>
                ),
                table: ({ children }) => <table className="mb-4 w-full border-collapse border border-border">{children}</table>,
                thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
                th: ({ children }) => (
                  <th className="border border-border px-3 py-2 text-left font-semibold text-foreground">{children}</th>
                ),
                td: ({ children }) => <td className="border border-border px-3 py-2 text-foreground">{children}</td>,
              }}
            >
              {result}
            </ReactMarkdown>
          </div>
          {footer && <div className="mt-auto pt-6">{footer}</div>}
        </div>
      </ScrollArea>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-linear-to-b from-background via-background/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-linear-to-t from-background via-background/70 to-transparent"
      />
    </div>
  );
};
