/**
 * Giriş ve kayıt ekranı. Supabase Auth kullanır.
 */
import { useState } from 'react';
import { Lock, Mail, Loader2, User, KeyRound, Terminal } from 'lucide-react';

import LegalModal, { type LegalType } from '../components/LegalModal';
import { supabase } from '../supabase';

interface AuthProps {
  onLoginSuccess: () => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [isSignUp, setIsSignUp] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [legalModal, setLegalModal] = useState<LegalType | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) throw new Error("Şifreler birbiriyle uyuşmuyor!");
        if (!firstName.trim() || !lastName.trim()) throw new Error("Lütfen isim ve soyisim alanlarını doldurun.");

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`,
            }
          }
        });

        if (error) throw error;
        setMsg({ type: 'success', text: 'Kayıt başarılı! Lütfen e-posta adresinizi doğrulayın.' });
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
        
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLoginSuccess();
      }
    } catch (error: any) {
      setMsg({ type: 'error', text: error.message || 'Bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-slate-900/80 p-8 shadow-2xl border border-slate-800/50 backdrop-blur-xl relative overflow-hidden">
        
        {/* Arka plan ışık efekti */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center relative z-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-900/30 ring-1 ring-blue-500/30 shadow-lg shadow-blue-500/20 backdrop-blur-sm mb-6 group hover:scale-105 transition-transform duration-300">
            <Terminal className="h-10 w-10 text-blue-400 group-hover:text-blue-300 transition-colors" />
          </div>
          
          <h2 className="text-3xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-200">
            {isSignUp ? 'Aramıza Katıl' : 'AI Repo Analyst'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {isSignUp ? 'Kodlarını yapay zeka ile keşfetmeye başla.' : 'Giriş yap ve analiz üssüne dön.'}
          </p>
        </div>

        <form className="mt-8 space-y-5 relative z-10" onSubmit={handleAuth}>
          
          {isSignUp && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="text"
                  required={isSignUp}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="block w-full rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 pl-10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm outline-none transition-all"
                  placeholder="Adın"
                />
              </div>
              <div className="relative">
                 <input
                  type="text"
                  required={isSignUp}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="block w-full rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm outline-none transition-all text-center"
                  placeholder="Soyadın"
                />
              </div>
            </div>
          )}

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 pl-10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm outline-none transition-all"
              placeholder="Email adresi"
            />
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 pl-10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm outline-none transition-all"
              placeholder="Şifre"
            />
          </div>

          {isSignUp && (
             <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required={isSignUp}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full rounded-lg border bg-slate-800/50 p-3 pl-10 text-white placeholder-slate-500 focus:ring-1 sm:text-sm outline-none transition-all
                    ${confirmPassword && password !== confirmPassword ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 'border-slate-700/50 focus:border-blue-500 focus:ring-blue-500'}
                  `}
                  placeholder="Şifreyi tekrar gir"
                />
                {confirmPassword && password !== confirmPassword && (
                    <span className="text-[10px] text-red-400 absolute right-3 top-3.5 font-medium">Uyuşmuyor</span>
                )}
             </div>
          )}

          {isSignUp && (
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              Kayıt olarak{' '}
              <button
                type="button"
                onClick={() => setLegalModal('terms')}
                className="text-blue-400 hover:text-blue-300 hover:underline underline-offset-2 transition-colors"
              >
                Kullanım Koşulları
              </button>
              {' ve '}
              <button
                type="button"
                onClick={() => setLegalModal('privacy')}
                className="text-blue-400 hover:text-blue-300 hover:underline underline-offset-2 transition-colors"
              >
                Gizlilik Politikası
              </button>
              &apos;nı kabul etmiş olursunuz.
            </p>
          )}

          {msg && (
            <div className={`rounded-lg p-3 text-sm flex items-center justify-center animate-pulse ${msg.type === 'error' ? 'bg-red-900/20 text-red-200 border border-red-800/50' : 'bg-green-900/20 text-green-200 border border-green-800/50'}`}>
              {msg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all shadow-lg shadow-blue-900/30 active:scale-95 hover:shadow-blue-500/25"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (isSignUp ? 'Hesap Oluştur' : 'Giriş Yap')}
          </button>
        </form>

        <div className="text-center text-sm relative z-10">
          <button
            onClick={() => { 
                setIsSignUp(!isSignUp); 
                setMsg(null); 
                setPassword(''); 
                setConfirmPassword('');
            }}
            className="font-medium text-blue-400 hover:text-blue-300 transition-colors hover:underline underline-offset-4"
          >
            {isSignUp ? 'Zaten hesabın var mı? Giriş yap' : 'Hesabın yok mu? Hemen kayıt ol'}
          </button>
        </div>
      </div>

      {legalModal && (
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </div>
  );
}