/**
 * Zengin Markdown render bileşeni.
 * Mermaid diyagramları, syntax highlighting ve emoji desteği.
 */
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import remarkGfm from 'remark-gfm';
import Mermaid from './Mermaid';
import { Copy, Check } from 'lucide-react';

interface EnhancedMarkdownProps {
  content: string;
}

export default function EnhancedMarkdown({ content }: EnhancedMarkdownProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [processedContent, setProcessedContent] = useState<{type: 'markdown' | 'mermaid', content: string}[]>([]);

  // Kod bloğunu kopyala
  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // İçeriği parse et - mermaid bloklarını ayır
  useEffect(() => {
    const parts: {type: 'markdown' | 'mermaid', content: string}[] = [];
    
    // Mermaid bloklarını regex ile bul ve ayır
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = mermaidRegex.exec(content)) !== null) {
      // Mermaid'den önceki markdown kısmı
      if (match.index > lastIndex) {
        const markdownPart = content.slice(lastIndex, match.index);
        if (markdownPart.trim()) {
          parts.push({ type: 'markdown', content: markdownPart });
        }
      }
      
      // Mermaid bloğu
      parts.push({ type: 'mermaid', content: match[1].trim() });
      lastIndex = match.index + match[0].length;
    }

    // Kalan markdown kısmı
    if (lastIndex < content.length) {
      const remainingMarkdown = content.slice(lastIndex);
      if (remainingMarkdown.trim()) {
        parts.push({ type: 'markdown', content: remainingMarkdown });
      }
    }

    // Eğer hiç mermaid yoksa, tüm içeriği markdown olarak ekle
    if (parts.length === 0) {
      parts.push({ type: 'markdown', content: content });
    }

    setProcessedContent(parts);
  }, [content]);

  // Kod bloğu için özel bileşen
  const CodeBlock = ({ className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';
    const codeString = String(children).replace(/\n$/, '');
    const index = Math.random(); // Basit index

    // Mermaid ise atla (ayrı handle ediliyor)
    if (language === 'mermaid') {
      return null;
    }

    return (
      <div className="my-3 relative group">
        <div className="flex items-center justify-between bg-slate-800 rounded-t-lg px-4 py-2 border border-slate-700/50 border-b-0">
          <span className="text-xs text-slate-400 font-mono">{language}</span>
          <button
            onClick={() => copyCode(codeString, index as number)}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title="Kopyala"
          >
            {copiedIndex === index ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
        <pre className="bg-slate-900 rounded-b-lg p-4 overflow-x-auto border border-slate-700/50 border-t-0 m-0">
          <code className="text-sm text-slate-300 font-mono whitespace-pre">{codeString}</code>
        </pre>
      </div>
    );
  };

  // Inline code için özel bileşen
  const InlineCode = ({ children, ...props }: any) => {
    return (
      <code className="px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 text-sm font-mono" {...props}>
        {children}
      </code>
    );
  };

  return (
    <div className="enhanced-markdown space-y-4">
      {processedContent.map((part, idx) => {
        if (part.type === 'mermaid') {
          return (
            <div key={idx} className="my-4">
              <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                <span>📊 Diyagram</span>
              </div>
              <Mermaid chart={part.content} />
            </div>
          );
        }

        return (
          <div key={idx} className="prose prose-invert max-w-none text-sm 
            prose-headings:text-white prose-headings:font-semibold
            prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-700/50
            prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
            prose-p:text-slate-300 prose-p:leading-relaxed
            prose-strong:text-white prose-strong:font-semibold
            prose-em:text-slate-300
            prose-ul:text-slate-300 prose-ol:text-slate-300
            prose-li:text-slate-300
            prose-blockquote:border-l-blue-500/50 prose-blockquote:bg-slate-800/30 prose-blockquote:rounded-r prose-blockquote:text-slate-400
            prose-hr:border-slate-700
            prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
            prose-table:border-collapse prose-table:w-full prose-table:border prose-table:border-slate-700
            prose-th:bg-slate-800 prose-th:text-blue-400 prose-th:p-3 prose-th:border prose-th:border-slate-700
            prose-td:p-3 prose-td:border prose-td:border-slate-700
          ">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ inline, className, children, ...props }: any) => {
                  if (inline) {
                    return <InlineCode {...props}>{children}</InlineCode>;
                  }
                  return <CodeBlock className={className} {...props}>{children}</CodeBlock>;
                },
              }}
            >
              {part.content}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}
