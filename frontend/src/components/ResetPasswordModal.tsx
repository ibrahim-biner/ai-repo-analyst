import { useState } from "react";
import { supabase } from "../supabase";

export default function ResetPasswordModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setDone(true);
    else setError(error.message);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-lg border border-slate-700 min-w-[320px]">
        {done ? (
          <div className="text-green-400 font-semibold">Şifreniz başarıyla değiştirildi. Giriş yapabilirsiniz.</div>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-4 text-white">Yeni Şifre Belirle</h2>
            <input
              type="password"
              placeholder="Yeni şifre"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full mb-2 p-2 rounded border bg-slate-800 text-white"
              required
            />
            {error && <div className="text-red-400 text-xs mb-2">{error}</div>}
            <button className="w-full bg-blue-600 text-white rounded p-2 mt-2">Şifreyi Güncelle</button>
            <button type="button" onClick={onClose} className="w-full mt-2 text-xs text-slate-400">Kapat</button>
          </>
        )}
      </form>
    </div>
  );
}
