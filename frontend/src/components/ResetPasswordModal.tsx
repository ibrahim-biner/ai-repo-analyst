import { useState } from "react";
import { supabase } from "../supabase";
import { Lock, CheckCircle, Loader2, KeyRound } from "lucide-react";

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ResetPasswordModal({ open, onClose }: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Şifreler birbiriyle uyuşmuyor!");
      return;
    }

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      
      // 2 saniye sonra modal'ı kapat ve login'e yönlendir
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Şifre güncellenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="w-full max-w-md rounded-2xl bg-slate-900/90 p-8 shadow-2xl border border-slate-800/50 backdrop-blur-xl relative overflow-hidden">
      
      {/* Arka plan ışık efekti */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {done ? (
        <div className="text-center py-8 relative z-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 ring-1 ring-green-500/30 mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Şifreniz Güncellendi!</h3>
          <p className="text-slate-400 text-sm">Yeni şifrenizle giriş yapabilirsiniz.</p>
        </div>
      ) : (
        <div className="relative z-10">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20 ring-1 ring-blue-500/30 mb-4">
              <Lock className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Yeni Şifre Belirle</h3>
            <p className="text-slate-400 text-sm mt-1">Hesabınız için yeni bir şifre oluşturun.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                placeholder="Yeni şifre"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="block w-full rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 pl-10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm outline-none transition-all"
              />
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <KeyRound className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                placeholder="Şifreyi tekrar gir"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className={`block w-full rounded-lg border bg-slate-800/50 p-3 pl-10 text-white placeholder-slate-500 focus:ring-1 sm:text-sm outline-none transition-all
                  ${confirmPassword && password !== confirmPassword ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 'border-slate-700/50 focus:border-blue-500 focus:ring-blue-500'}
                `}
              />
              {confirmPassword && password !== confirmPassword && (
                <span className="text-[10px] text-red-400 absolute right-3 top-3.5 font-medium">Uyuşmuyor</span>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-900/20 text-red-200 border border-red-800/50 p-3 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all shadow-lg shadow-blue-900/30 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Şifreyi Güncelle'}
            </button>
            
            <button 
              type="button" 
              onClick={onClose} 
              className="w-full text-sm text-slate-400 hover:text-blue-400 transition-colors"
            >
              Kapat
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
