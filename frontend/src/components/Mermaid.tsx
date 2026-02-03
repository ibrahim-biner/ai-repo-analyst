/**
 * Mermaid diyagramlarını render eden bileşen.
 * Hata durumunda kullanıcıya bilgi gösterir.
 */
import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { AlertTriangle } from 'lucide-react';

// Mermaid'i bir kez yapılandır
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'ui-monospace, monospace',
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#1e40af',
    lineColor: '#64748b',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    background: '#0f172a',
    mainBkg: '#1e293b',
    nodeBorder: '#3b82f6',
    clusterBkg: '#1e293b',
    titleColor: '#f8fafc',
    edgeLabelBackground: '#1e293b',
  },
});

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !chart.trim()) return;

    const renderChart = async () => {
      try {
        setError(null);

        // Önceki içeriği temizle
        containerRef.current!.innerHTML = '';

        // Benzersiz ID oluştur
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Chart'ı temizle (baştaki/sondaki boşlukları kaldır)
        const cleanChart = chart.trim();

        // Mermaid ile render et
        const { svg } = await mermaid.render(id, cleanChart);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        setError(err.message || 'Diyagram oluşturulamadı');
        
        // Hata durumunda container'ı temizle
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-300 text-sm">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-medium">Diyagram gösterilemiyor</p>
          <p className="text-xs text-orange-400/70 mt-1">Syntax hatası veya desteklenmeyen format</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="flex justify-center items-center min-h-[100px] overflow-x-auto"
    />
  );
}