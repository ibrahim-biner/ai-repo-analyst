/**
 * 404 - Sayfa Bulunamadı bileşeni.
 * Site temasına uygun tasarım ile kullanıcıyı ana sayfaya yönlendirir.
 */
import { useState, useEffect } from 'react';
import { Home, AlertTriangle, ArrowLeft } from 'lucide-react';

interface NotFoundProps {
  onGoHome: () => void;
}

export default function NotFound({ onGoHome }: NotFoundProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // 5 saniye geri sayım sonra ana sayfaya yönlendir
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onGoHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onGoHome]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-slate-900/80 p-8 shadow-2xl border border-slate-800/50 backdrop-blur-xl relative overflow-hidden text-center">
        
        {/* Arka plan ışık efekti */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* 404 İkonu */}
        <div className="relative z-10">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600/20 to-orange-900/30 ring-1 ring-red-500/30 shadow-lg shadow-red-500/20 backdrop-blur-sm mb-6">
            <AlertTriangle className="h-12 w-12 text-red-400" />
          </div>
          
          <h1 className="text-7xl font-bold text-white mb-2">404</h1>
          <h2 className="text-xl font-semibold text-slate-300 mb-2">Sayfa Bulunamadı</h2>
          <p className="text-sm text-slate-400 mb-6">
            Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          </p>

          {/* Geri sayım */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 mb-6">
            <p className="text-slate-400 text-sm">
              <span className="text-blue-400 font-bold text-lg">{countdown}</span> saniye içinde ana sayfaya yönlendirileceksiniz...
            </p>
          </div>

          {/* Butonlar */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onGoHome}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg shadow-blue-900/30 active:scale-95"
            >
              <Home className="h-4 w-4" />
              Ana Sayfaya Git
            </button>
            
            <button
              onClick={() => window.history.back()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Geri Dön
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
