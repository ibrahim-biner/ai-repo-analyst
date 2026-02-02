/**
 * Kullanım Koşulları ve Gizlilik Politikası modal penceresi.
 */
import { X } from 'lucide-react';

export type LegalType = 'terms' | 'privacy';

interface LegalModalProps {
  type: LegalType;
  onClose: () => void;
}

const termsContent = (
  <div className="space-y-5 text-slate-300 text-sm leading-relaxed">
    <p className="text-slate-400 italic">
      Bu uygulama, bir yazılım mühendisliği portfolyo projesi kapsamında geliştirilmiş deneysel bir araçtır. 
      Kayıt olarak aşağıdaki şartları peşinen kabul etmiş sayılırsınız.
    </p>
    
    <section>
      <h3 className="font-semibold text-blue-400 mb-2">Sorumluluk Reddi (AI Çıktıları)</h3>
      <p>
        Bu sistem, Google Gemini yapay zeka modellerini kullanarak kod analizi yapmaktadır. Yapay zeka, teknik konularda 
        hatalı, eksik veya yanıltıcı bilgiler (halüsinasyon) üretebilir. Sağlanan kod önerilerinin veya analizlerin 
        doğruluğu garanti edilmez; bu bilgilerin uygulanması sonucunda oluşabilecek veri kaybı, güvenlik açığı veya 
        sistem arızalarından geliştirici sorumlu tutulamaz.
      </p>
    </section>

    <section>
      <h3 className="font-semibold text-blue-400 mb-2">Hizmet Niteliği</h3>
      <p>
        Bu araç &quot;olduğu gibi&quot; (as-is) sunulmaktadır. Geliştirici, sistemin kesintisiz çalışacağını veya 
        her zaman erişilebilir olacağını taahhüt etmez.
      </p>
    </section>

    <section>
      <h3 className="font-semibold text-blue-400 mb-2">Kullanım Amacı</h3>
      <p>
        Kullanıcılar sadece kendi yetkisine sahip oldukları veya &quot;Public&quot; (herkese açık) GitHub depolarını 
        analiz etmelidir. Telif hakkı içeren veya gizli ticari sır barındıran kodların sisteme yüklenmesi durumunda 
        sorumluluk tamamen kullanıcıya aittir.
      </p>
    </section>

    <section>
      <h3 className="font-semibold text-blue-400 mb-2">Kötüye Kullanım</h3>
      <p>
        Sistemin API sınırlarını zorlayacak otomatik bot kullanımı, tersine mühendislik çalışmaları veya platformun 
        kaynaklarını kasten tüketecek faaliyetler yasaktır. Geliştirici, bu tür durumlarda kullanıcı erişimini 
        kısıtlama hakkını saklı tutar.
      </p>
    </section>
  </div>
);

const privacyContent = (
  <div className="space-y-5 text-slate-300 text-sm leading-relaxed">
    <p className="text-slate-400 italic">
      Bu politika, AI Repo Analyst projesi tarafından verilerinizin nasıl işlendiğini açıklar.
    </p>

    <section>
      <h3 className="font-semibold text-blue-400 mb-2">Toplanan Veriler</h3>
      <p>
        Kayıt işlemi için e-posta adresiniz (Supabase Auth üzerinden), analiz ettiğiniz GitHub depo URL&apos;leri 
        ve yapay zeka ile olan sohbet geçmişiniz toplanmaktadır.
      </p>
    </section>

    <section>
      <h3 className="font-semibold text-blue-400 mb-2">Veri İşleme ve Depolama</h3>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>Kodlarınız analiz edilmek üzere vektör verilerine (3072 boyutlu embedding) dönüştürülür ve Supabase üzerinde güvenli bir şekilde saklanır.</li>
        <li>Analiz işlemleri için verileriniz geçici olarak Google (Gemini API) servislerine gönderilir.</li>
      </ul>
    </section>

    <section>
      <h3 className="font-semibold text-blue-400 mb-2">Kullanım Amacı</h3>
      <p>
        Verileriniz sadece size özel analiz hizmeti sunmak ve sohbet geçmişinizi saklamak amacıyla kullanılır. 
        Verileriniz üçüncü taraflara satılmaz veya pazarlama amacıyla paylaşılmaz.
      </p>
    </section>

    <section>
      <h3 className="font-semibold text-blue-400 mb-2">Veri Silme Hakkı</h3>
      <p>
        Kullanıcılar istedikleri zaman analiz ettikleri repoları ve ilgili sohbet geçmişini sistem üzerinden 
        temizleme hakkına sahiptir.
      </p>
    </section>

    <section>
      <h3 className="font-semibold text-blue-400 mb-2">Güvenlik</h3>
      <p>
        Proje, yetkisiz erişimi engellemek için Row Level Security (RLS) ve Service Role Key gibi endüstri 
        standardı güvenlik katmanlarını kullanmaktadır.
      </p>
    </section>
  </div>
);

export default function LegalModal({ type, onClose }: LegalModalProps) {
  const isTerms = type === 'terms';
  const title = isTerms ? 'Kullanım Koşulları' : 'Gizlilik Politikası';
  const content = isTerms ? termsContent : privacyContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 custom-scrollbar">
          {content}
        </div>
      </div>
    </div>
  );
}
