/**
 * Ana uygulama bileşeni.
 * Repo analizi, sohbet ve kullanıcı oturum yönetimi.
 */
import { useEffect, useState, useRef } from 'react';
import { Send, Github, Loader2, Database, Terminal, Cpu, AlertCircle, LogOut, User, Clock, ChevronRight, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import remarkGfm from 'remark-gfm';



import Toast from './components/Toast';
import ResetPasswordModal from './components/ResetPasswordModal';
import NotFound from './components/NotFound';
import Auth from './pages/Auth';
import { indexRepo, chatWithRepo, getUserRepos, saveMessage, getChatHistory, deleteRepo } from './services/api';
import type { UserRepo } from './services/api';
import { supabase } from './supabase';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

function App() {
  // Şifre sıfırlama modalı için state
  const [showResetModal, setShowResetModal] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const isRecoveryMode = useRef(false);
  const [show404, setShow404] = useState(false);
  
  const [repoUrl, setRepoUrl] = useState('');
  const [activeRepo, setActiveRepo] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [repoList, setRepoList] = useState<UserRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{text: string, type: 'success' | 'error'}>({text: '', type: 'success'});

  useEffect(() => {
    // Pathname kontrolü - SPA için sadece root kabul
    const pathname = window.location.pathname;
    if (pathname !== '/' && pathname !== '/index.html') {
      console.log('Invalid pathname detected:', pathname);
      setShow404(true);
      setLoadingSession(false);
      return;
    }

    // İlk olarak URL hash kontrolü - şifre sıfırlama linki mi?
    const hash = window.location.hash;
    
    // Hash'te recovery varsa hemen işaretle
    if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
      console.log('Recovery mode detected from URL hash');
      isRecoveryMode.current = true;
      setShowResetModal(true);
      setLoadingSession(false);
    }

    // Supabase oturum ve auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth event:', event);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY event received');
        isRecoveryMode.current = true;
        setShowResetModal(true);
        setLoadingSession(false);
        return;
      }

      if (event === 'SIGNED_IN' && isRecoveryMode.current) {
        // Recovery modunda SIGNED_IN gelirse modal'ı açık tut
        console.log('SIGNED_IN during recovery mode - keeping modal open');
        setShowResetModal(true);
        setLoadingSession(false);
        return;
      }

      // Normal session güncelleme (recovery mode değilse)
      if (!isRecoveryMode.current) {
        setSession(currentSession);
        if (currentSession?.user?.id) fetchRepos(currentSession.user.id);
        setLoadingSession(false);
      }
    });

    // İlk session kontrolü (recovery mode değilse)
    const initSession = async () => {
      if (isRecoveryMode.current) {
        return;
      }

      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!isRecoveryMode.current) {
          setSession(initialSession);
          if (initialSession?.user?.id) fetchRepos(initialSession.user.id);
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        if (!isRecoveryMode.current) {
          setLoadingSession(false);
        }
      }
    };

    if (!isRecoveryMode.current) {
      initSession();
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchRepos = async (userId: string) => {
    setLoadingRepos(true);
    try {
        const repos = await getUserRepos(userId);
        setRepoList(repos);
    } catch (error) {
        console.error("Repo listesi çekilemedi:", error);
    } finally {
        setLoadingRepos(false);
    }
  };

  const loadRepoFromHistory = async (repoName: string) => {
    if (!session?.user?.id) return;
    setActiveRepo(repoName);
    setError(null);
    setStatus('');
    setMessages([{ role: 'ai', content: '⏳ Geçmiş konuşmalar yükleniyor...' }]);

    try {
        const history = await getChatHistory(session.user.id, repoName);
        if (history && history.length > 0) {
            const formattedMessages = history.map((msg: any) => ({
                role: msg.role,
                content: msg.content
            }));
            setMessages(formattedMessages);
        } else {
            setMessages([{ role: 'ai', content: `📂 **${repoName}** arşivi açıldı. Kaldığımız yerden devam edebiliriz!` }]);
        }
    } catch (err) {
        console.error("Geçmiş yüklenemedi", err);
        setMessages([{ role: 'ai', content: `📂 **${repoName}** açıldı ama geçmiş yüklenirken bir hata oldu.` }]);
    }
  };

  const promptDelete = (e: React.MouseEvent, repoName: string) => {
      e.stopPropagation();
      setRepoToDelete(repoName);
      setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
      if (!repoToDelete || !session?.user?.id) return;
      
      setDeleting(true);
      try {
          await deleteRepo(session.user.id, repoToDelete);
          
          setRepoList(prev => prev.filter(r => r.repo_name !== repoToDelete));
          if (activeRepo === repoToDelete) {
              setActiveRepo(null);
              setMessages([]);
          }
          
          setShowDeleteModal(false);
          setRepoToDelete(null);
      } catch (err) {
          alert("Silme işlemi başarısız oldu.");
      } finally {
          setDeleting(false);
      }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessages([]);
    setActiveRepo(null);
    setRepoList([]);
  };

  const handleIndex = async () => {
    if (!repoUrl) return;
    if (!session?.user?.id) {
        setError("Oturum süresi dolmuş, lütfen tekrar giriş yapın.");
        return;
    }

    const isUpdating = repoList.some(r => repoUrl.includes(r.repo_name));
    
    if (repoList.length >= 3 && !isUpdating) {
        setError("⚠️ Maksimum 3 repo limitine ulaştın! Yeni bir tane eklemek için önce listeden birini silmelisin.");
        return;
    }

    setIndexing(true);
    setStatus('Repo inceleniyor...');
    setError(null);
    try {
      const result = await indexRepo(repoUrl, session.user.id);
      
      setActiveRepo(result.repo_name);
      
      setStatus('');
      setToastMessage({text: `${result.repo_name} başarıyla analiz edildi!`, type: 'success'});
      setShowToast(true);

      setMessages([{ role: 'ai', content: `**${result.repo_name}** reposunu inceledim. Bana kodlarla ilgili istediğini sorabilirsin!` }]);
      


      fetchRepos(session.user.id);
      setRepoUrl('');
      
    } catch (err: any) {
      // Backend'den gelen 400 hatasını (Limit dolu) burada yakalar
      setError(err.response?.data?.detail || err.message || 'Bir hata oluştu');
      setStatus('');
    } finally {
      setIndexing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeRepo) return;
    if (!session?.user?.id) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setThinking(true);

    saveMessage(session.user.id, activeRepo, 'user', userMsg);
    let fullAiResponse = "";

    try {
      await chatWithRepo(activeRepo, userMsg, session.user.id, (chunk) => {
        fullAiResponse += chunk;
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg.role === 'ai') {
            return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + chunk }];
          } else {
            return [...prev, { role: 'ai', content: chunk }];
          }
        });
      });
      
      if (fullAiResponse) {
          saveMessage(session.user.id, activeRepo, 'ai', fullAiResponse);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Günlük hakkınız doldu')) {
        setToastMessage({text: err.message, type: 'error'});
        setShowToast(true);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: '⚠️ Üzgünüm, cevap üretirken bir hata oluştu.' }]);
      }
    } finally {
      setThinking(false);
    }
  };

  // Modal kapatma handler
  const handleResetModalClose = async () => {
    setShowResetModal(false);
    isRecoveryMode.current = false;
    // Hash'i temizle
    window.history.replaceState(null, '', window.location.pathname);
    // Çıkış yap ve login'e yönlendir
    await supabase.auth.signOut();
    setSession(null);
  };

  // 404 sayfasına yönlendirme handler
  const handleGoHome = () => {
    setShow404(false);
    window.history.replaceState(null, '', '/');
  };

  // 404 sayfası göster
  if (show404) {
    return <NotFound onGoHome={handleGoHome} />;
  }

  // Şifre sıfırlama modalı açıksa, sadece modal göster
  if (showResetModal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
        <ResetPasswordModal 
          open={true} 
          onClose={handleResetModalClose} 
        />
      </div>
    );
  }

  // Oturum yükleniyorsa loading göster
  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
          <span className="text-slate-400 text-sm">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  // Oturum yoksa login ekranı göster
  if (!session) return <Auth onLoginSuccess={() => {}} />;

  return (
    <>
      <ResetPasswordModal open={showResetModal} onClose={() => setShowResetModal(false)} />
      <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      
      
      {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl transform scale-100 transition-all">
                  <div className="flex items-center gap-3 text-red-400 mb-4">
                      <div className="p-3 bg-red-500/10 rounded-full">
                          <Trash2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-white">Emin misin?</h3>
                  </div>
                  
                  <p className="text-slate-300 text-sm mb-6">
                      <span className="font-bold text-white">{repoToDelete}</span> reposunu ve tüm sohbet geçmişini silmek üzeresin. Bu işlem geri alınamaz.
                  </p>
                  
                  <div className="flex gap-3">
                      <button 
                          onClick={() => setShowDeleteModal(false)}
                          disabled={deleting}
                          className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium border border-slate-700"
                      >
                          Vazgeç
                      </button>
                      <button 
                          onClick={confirmDelete}
                          disabled={deleting}
                          className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                      >
                          {deleting ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Evet, Sil'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col h-full">
        <div className="p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 text-blue-400 mb-6">
            <Terminal className="w-8 h-8" />
            <h1 className="text-xl font-bold tracking-tight text-white">AI Repo Analyst</h1>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Yeni Repo Ekle
                </label>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${repoList.length >= 3 ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-slate-400 border-slate-700 bg-slate-800'}`}>
                    Limit: {repoList.length}/3
                </span>
              </div>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
              />
            </div>
            
            <button
              onClick={handleIndex}
              disabled={indexing || !repoUrl}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
            >
              {indexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
              {indexing ? 'Analiz Ediliyor...' : 'Analiz Et'}
            </button>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-2 items-start text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            {status && !error && (
              <div className="text-xs text-green-400 text-center py-2 bg-green-500/10 rounded-lg border border-green-500/20">
                {status}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="flex items-center gap-2 text-slate-500 mb-3 px-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Geçmiş Analizler</span>
            </div>

            {loadingRepos ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-600"/></div>
            ) : repoList.length === 0 ? (
                <div className="text-center text-slate-600 text-sm py-4 italic">Henüz repo yok.</div>
            ) : (
                <div className="space-y-2">
                    {repoList.map((repo) => (
                        <div
                            key={repo.id}
                            onClick={() => loadRepoFromHistory(repo.repo_name)}
                            className={`w-full text-left p-3 rounded-lg border transition-all group relative flex items-center gap-3 cursor-pointer
                                ${activeRepo === repo.repo_name 
                                    ? 'bg-blue-500/10 border-blue-500/30 text-white' 
                                    : 'bg-slate-800/30 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }
                            `}
                        >
                            <Database className={`w-4 h-4 shrink-0 ${activeRepo === repo.repo_name ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{repo.repo_name}</div>
                                <div className="text-[10px] opacity-60 truncate">{new Date(repo.created_at).toLocaleDateString()}</div>
                            </div>
                            
                            <button 
                                onClick={(e) => promptDelete(e, repo.repo_name)}
                                className={`p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-all
                                    ${activeRepo === repo.repo_name ? 'text-slate-500' : 'opacity-0 group-hover:opacity-100 text-slate-600'}
                                `}
                                title="Repoyu Sil"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            
                            {activeRepo === repo.repo_name && <ChevronRight className="w-4 h-4 text-blue-500" />}
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-900">
          <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700">
             <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 border border-blue-500/30">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs text-slate-400">Giriş Yapıldı</span>
                  <span className="text-xs font-medium text-white truncate max-w-[120px]">
                    {session.user.email}
                  </span>
                </div>
             </div>
             <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-400 transition-colors p-1"
                title="Çıkış Yap"
             >
                <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4 relative z-10">
            <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 shadow-xl rotate-3">
              <Cpu className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-lg font-medium">
                {activeRepo ? `${activeRepo} hakkında soru sor...` : 'Listeden bir repo seç veya yeni analiz başlat.'}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 scroll-smooth">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-xl border ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white border-blue-500 rounded-tr-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-800 rounded-tl-sm'
                  }`}
                >
                  <div className={`prose prose-invert max-w-none text-sm 
                    prose-table:border-collapse prose-table:w-full prose-table:border prose-table:border-slate-700
                    prose-th:bg-slate-800 prose-th:text-blue-400 prose-th:p-3 prose-th:border prose-th:border-slate-700
                    prose-td:p-3 prose-td:border prose-td:border-slate-700
                  `}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {thinking && (
               <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-xs text-slate-400">AI düşünüyor...</span>
                  </div>
               </div>
            )}
          </div>
        )}

        <div className="p-6 border-t border-slate-800 bg-slate-900/30 backdrop-blur-sm relative z-20">
          <div className="max-w-4xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={activeRepo ? "Soru sor..." : "Önce bir repo seçmelisin..."}
              disabled={!activeRepo || thinking}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-4 pr-12 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-600"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !activeRepo || thinking}
              className="absolute right-3 top-3 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all disabled:opacity-0 disabled:scale-75 shadow-lg shadow-blue-900/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </div>
      {showToast && (
        <Toast 
          message={toastMessage.text} 
          type={toastMessage.type}
          onClose={() => setShowToast(false)} 
        />
      )}
    </>
  );
}

export default App;