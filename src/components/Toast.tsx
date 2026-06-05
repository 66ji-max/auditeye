import React, { useEffect, useState } from 'react';
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export const toast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};

type ToastMsg = { id: string; message: string; type: 'info' | 'success' | 'warning' | 'error' };

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const handleToast = (e: any) => {
      const { message, type } = e.detail;
      const id = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="animate-in slide-in-from-right-8 fade-in flex items-center gap-2 px-4 py-3 bg-[#242424] border border-[#333333] shadow-lg rounded pointer-events-auto text-xs font-medium text-gray-200 min-w-[240px]">
          {t.type === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
          {t.type === 'primary' && <Info className="w-4 h-4 text-[#D4AF37]" />}
          {t.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
          {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
          {t.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))} className="text-gray-500 hover:text-gray-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
