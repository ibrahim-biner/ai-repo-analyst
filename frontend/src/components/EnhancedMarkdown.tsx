/**
 * Zengin Markdown render bileşeni.
 * Mermaid diyagramları, syntax highlighting ve emoji desteği.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import Mermaid from './Mermaid';
import { Copy, Check, Code } from 'lucide-react';

interface EnhancedMarkdownProps {
  content: string;
}

export default function EnhancedMarkdown({ content }: EnhancedMarkdownProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Kod bloğunu kopyala
  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // İçeriği parse et ve render et
  const renderContent = () => {
    const parts: ReactElement[] = [];
    let keyIndex = 0;

    // Kod bloklarını ayır (``` ile başlayıp biten)
    const blocks = content.split(/(```[\s\S]*?```)/g);

    blocks.forEach((block) => {
      if (block.startsWith('```')) {
        // Kod bloğu türünü belirle
        const firstLine = block.split('\n')[0].replace('```', '').trim().toLowerCase();
        const codeContent = block
          .replace(/^```\w*\n?/, '')
          .replace(/```$/, '')
          .trim();

        if (firstLine === 'mermaid') {
          // Mermaid bloğu - sadece geçerli içerik varsa render et
          if (codeContent && codeContent.length > 5) {
            parts.push(
              <div key={keyIndex++} className="my-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
                <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                  <Code className="h-3 w-3" />
                  <span>Diyagram</span>
                </div>
                <Mermaid chart={codeContent} />
              </div>
            );
          }
        } else {
          // Normal kod bloğu
          const lang = firstLine || 'text';
          const currentIndex = keyIndex++;
          
          parts.push(
            <div key={currentIndex} className="my-3 relative group">
              <div className="flex items-center justify-between bg-slate-800 rounded-t-lg px-4 py-2 border border-slate-700/50 border-b-0">
                <span className="text-xs text-slate-400 font-mono">{lang}</span>
                <button
                  onClick={() => copyCode(codeContent, currentIndex)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  title="Kopyala"
                >
                  {copiedIndex === currentIndex ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <pre className="bg-slate-900 rounded-b-lg p-4 overflow-x-auto border border-slate-700/50 border-t-0">
                <code className="text-sm text-slate-300 font-mono whitespace-pre">{codeContent}</code>
              </pre>
            </div>
          );
        }
      } else {
        // Normal markdown
        if (block.trim()) {
          parts.push(
            <div key={keyIndex++} className="markdown-content">
              {renderMarkdown(block)}
            </div>
          );
        }
      }
    });

    return parts;
  };

  // Markdown'ı render et
  const renderMarkdown = (text: string) => {
    let html = text
      // Headers
      .replace(/^#### (.*$)/gim, '<h4 class="text-base font-semibold text-slate-200 mt-3 mb-2">$1</h4>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-5 mb-3 pb-2 border-b border-slate-700/50">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>')
      // Bold & Italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold text-white"><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 text-sm font-mono">$1</code>')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500/50 pl-4 py-1 my-2 text-slate-400 italic bg-slate-800/30 rounded-r">$1</blockquote>')
      // Horizontal rule
      .replace(/^---$/gim, '<hr class="border-slate-700 my-4" />')
      // Unordered lists
      .replace(/^[\-\*] (.*$)/gim, '<li class="ml-4 text-slate-300 list-disc list-inside">$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 text-slate-300 list-decimal list-inside">$1</li>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br />');

    // Emoji styling
    const emojiStyles: Record<string, string> = {
      '💡': 'bg-yellow-500/20 text-yellow-300',
      '⚠️': 'bg-orange-500/20 text-orange-300',
      '✅': 'bg-green-500/20 text-green-300',
      '❌': 'bg-red-500/20 text-red-300',
      '🔍': 'bg-blue-500/20 text-blue-300',
      '📁': 'bg-slate-500/20 text-slate-300',
      '🚀': 'bg-purple-500/20 text-purple-300',
      '🔒': 'bg-red-500/20 text-red-300',
      '📊': 'bg-indigo-500/20 text-indigo-300',
      '🎯': 'bg-pink-500/20 text-pink-300',
    };

    Object.entries(emojiStyles).forEach(([emoji, style]) => {
      html = html.replace(
        new RegExp(emoji, 'g'),
        `<span class="inline-flex items-center justify-center w-6 h-6 rounded ${style} text-sm mx-0.5">${emoji}</span>`
      );
    });

    return (
      <div 
        className="text-slate-300 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    );
  };

  return (
    <div className="enhanced-markdown space-y-2">
      {renderContent()}
    </div>
  );
}
