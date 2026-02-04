import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "~/renderer/components/ui/scroll-area";

export const ComposerResult = ({ result }: { result: string }) => {
  return (
    <>
      {result && (
        <ScrollArea className="h-[80vh] w-full">
          <div className="prose prose-sm max-w-none prose-invert pr-4">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  return !inline ? (
                    <pre className="bg-gray-800 text-gray-200 p-4 rounded-lg overflow-x-auto text-sm">
                      <code {...props}>{children}</code>
                    </pre>
                  ) : (
                    <code className="bg-gray-800 text-gray-200 px-1 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  );
                },
                h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold text-white mb-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-medium text-white mb-2">{children}</h3>,
                p: ({ children }) => <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside text-gray-300 mb-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside text-gray-300 mb-3 space-y-1">{children}</ol>,
                table: ({ children }) => <table className="border-collapse border border-gray-600 w-full mb-4">{children}</table>,
                thead: ({ children }) => <thead className="bg-gray-800">{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => <tr className="border-b border-gray-600">{children}</tr>,
                th: ({ children }) => <th className="border border-gray-600 px-3 py-2 text-left text-white font-semibold">{children}</th>,
                td: ({ children }) => <td className="border border-gray-600 px-3 py-2 text-gray-300">{children}</td>,
              }}
            >
              {result}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      )}
    </>
  );
};
