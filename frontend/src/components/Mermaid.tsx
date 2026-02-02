/**
 * Mermaid diyagram render bileşeni. AI yanıtlarındaki diyagramları çizer.
 */
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

interface MermaidProps {
  chart: string;
}

const Mermaid = ({ chart }: MermaidProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        mermaid.render(id, chart).then((result) => {
          if (ref.current) {
            ref.current.innerHTML = result.svg;
          }
        });
      } catch (error) {
        console.error("Diyagram çizilemedi:", error);
      }
    }
  }, [chart]);

  return (
    <div className="my-6 p-4 bg-slate-950 rounded-lg border border-slate-700 overflow-x-auto flex justify-center">
      <div ref={ref} />
    </div>
  );
};

export default Mermaid;