/**
 * Bildirim bileşeni. Başarı/hata mesajlarını sağ altta gösterir.
 */
import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2800);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-slide-in-right">
      <div className={`flex items-center gap-4 bg-slate-800 border-l-4 px-6 py-4 rounded-lg shadow-2xl min-w-[320px] ${type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
        <div className={type === 'error' ? 'text-red-400' : 'text-green-400'}>
          {type === 'error' ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M15 9L9 15M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div className="flex flex-col">
          <span className={`font-bold text-sm ${type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{type === 'error' ? 'Hata' : 'İşlem Başarılı'}</span>
          <span className="text-slate-300 text-xs">{message}</span>
        </div>
      </div>
    </div>
  );
};

export default Toast;