import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Lock, CheckCircle, Loader2, KeyRound, AlertTriangle } from "lucide-react";

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
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    let retryCount = 0;
    const maxRetries = 15; // 7.5 saniye (15 x 500ms)

    const checkSession = async (): Promise<boolean> => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session check error:', error);
        }

        if (session && mounted) {
          console.log('✅ Session ready:', session.user?.email);
          setSessionReady(true);
          setCheckingSession(false);
          return true;
        }

        return false;
      } catch (e) {
        console.error('❌ Session check exception:', e);
        return false;
      }
    };

    const waitForSession = async () => {
      // İlk kontrol
      const hasSession = await checkSession();
      if (hasSession) return;

      console.log('⏳ Session not ready, starting retry...');

      // Session yoksa, retry ile bekle
      const retryInterval = setInterval(async () => {
        retryCount++;
        console.log(`⏳ Retry ${retryCount}/${maxRetries}...`);
        
        const hasSession = await checkSession();
        
        if (hasSession || retryCount >= maxRetries) {
          clearInterval(retryInterval);
          
          if (!hasSession && mounted) {
            console.log('❌ Max retries reached, no session');
            setError('Oturum başlatılamadı. Şifre sıfırlama linkinin süresi dolmuş olabilir. Lütfen yeni bir link talep edin.');
            setCheckingSession(false);
          }
        }
      }, 500);

      return () => clearInterval(retryInterval);
    };

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Modal auth event:', event);
      
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && mounted) {
        console.log('✅ Session received via auth state:', session.user?.email);
        setSessionReady(true);
        setCheckingSession(false);
      }
    });

    waitForSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [open]);

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
      const { error: updateError } = await supabase.auth.updateUser({ password });
      
      if (updateError) {
        let errorMessage = updateError.message;
        
        if (errorMessage.includes('Auth session missing')) {
          errorMessage = 'Oturum süresi dolmuş. Lütfen yeni bir şifre sıfırlama linki talep edin.';
        } else if (errorMessage.includes('Password should be')) {
          errorMessage = 'Şifre en az 6 karakter olmalıdır.';
        } else if (errorMessage.includes('same password')) {
          errorMessage = 'Yeni şifre mevcut şifrenizle aynı olamaz.';
        }
        
        throw new Error(errorMessage);
      }
      
      setDone(true);
      
      // 2.5 saniye sonra çıkış yap ve modal'ı kapat
      setTimeout(async () => {
        await supabase.auth.signOut();
        onClose();
      }, 2500);
      
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
        // Başarılı
        <div className="text-center py-8 relative z-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600/20 to-green-900/30 ring-1 ring-green-500/30 shadow-lg shadow-green-500/20 mb-6">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Şifreniz Güncellendi!</h3>
          <p className="text-slate-400 text-sm">Yeni şifrenizle giriş yapabilirsiniz.</p>
          <p className="text-slate-500 text-xs mt-4">Giriş ekranına yönlendiriliyorsunuz...</p>
        </div>
      ) : checkingSession ? (
        // Session bekleniyor
        <div className="text-center py-8 relative z-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-900/30 ring-1 ring-blue-500/30 shadow-lg shadow-blue-500/20 mb-6">
            <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Oturum Doğrulanıyor...</h3>
          <p className="text-slate-400 text-sm">Lütfen bekleyin.</p>
        </div>
      ) : error && !sessionReady ? (
        // Hata durumu
        <div className="text-center py-8 relative z-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600/20 to-red-900/30 ring-1 ring-red-500/30 shadow-lg shadow-red-500/20 mb-6">
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Oturum Hatası</h3>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 text-sm font-semibold text-white hover:from-blue-500 hover:to-blue-400 transition-all"
          >
            Giriş Ekranına Dön
          </button>
        </div>
      ) : (
        <div className="relative z-10">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-900/30 ring-1 ring-blue-500/30 shadow-lg shadow-blue-500/20 mb-6">
              <Lock className="h-10 w-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Yeni Şifre Belirle</h3>
            <p className="text-slate-400 text-sm mt-2">Hesabınız için yeni bir şifre oluşturun.</p>
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
              disabled={loading || password !== confirmPassword}
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
