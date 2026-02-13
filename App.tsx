import React, { useState, useEffect } from 'react';
import InputForm from './components/InputForm';
import RPMPreview from './components/RPMPreview';
import { FormData, RPMResult } from './types';
import { generateRPM } from './services/geminiService';
import { Cpu, Zap, Clock, Calendar, Lock, ArrowRight, ShieldCheck, FileCheck } from 'lucide-react';

const App: React.FC = () => {
  const [rpmResult, setRpmResult] = useState<RPMResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateTime, setDateTime] = useState(new Date());
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'gajiguru') {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setPasswordInput(''); // Clear input on error
    }
  };

  const handleSubmit = async (data: FormData, apiKey: string) => {
    setIsLoading(true);
    try {
      const generatedContent = await generateRPM(data, apiKey);
      const fullResult: RPMResult = {
        ...data,
        ...generatedContent
      };
      setRpmResult(fullResult);
    } catch (error: any) {
      console.error(error);
      if (error.message === "QUOTA_EXCEEDED" || String(error?.message).includes("quota")) {
         alert("⚠️ KUOTA API HABIS ⚠️\n\nGoogle membatasi penggunaan API Key Anda. Tunggu beberapa saat atau gunakan Key lain.");
      } else {
         alert("Terjadi kesalahan teknis. Pastikan koneksi stabil.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Komponen Tombol WA (Reusable)
  const WhatsAppButton = () => (
    <a 
      href="https://wa.me/6283816186000?text=Halo,%20saya%20ingin%20menanyakan%20terkait%20RPM%20Generator."
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white border border-slate-200 py-2 px-4 rounded shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all no-print group"
    >
      <img src="https://pngimg.com/d/whatsapp_PNG21.png" alt="WA" className="w-6 h-6" />
      <span className="font-bold text-slate-700 text-xs uppercase tracking-wide">Bantuan Teknis</span>
    </a>
  );

  // Render Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="bg-white border border-slate-200 p-8 rounded shadow-xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-3 bg-slate-50 rounded-full mb-4 border border-slate-200">
                <ShieldCheck size={32} className="text-[#1e3a8a]" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 uppercase tracking-widest">Akses Terbatas</h1>
              <p className="text-slate-500 text-xs mt-2 uppercase font-medium">Sistem Generator RPM Pekayon 09</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if(authError) setAuthError(false);
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded text-sm outline-none transition-all
                      ${authError 
                        ? 'border-red-500 focus:border-red-600' 
                        : 'border-slate-300 focus:border-[#1e3a8a]'
                      }`}
                    placeholder="Masukkan sandi..."
                    autoFocus
                  />
                </div>
                {authError && (
                  <p className="text-red-500 text-[10px] mt-2 font-bold uppercase">
                    Sandi Salah!
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold py-2.5 rounded shadow flex justify-center items-center gap-2 transition-all uppercase text-xs tracking-widest"
              >
                <span>Buka Sistem</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>
        <WhatsAppButton />
      </div>
    );
  }

  // Main App Render - Formal Theme
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      
      {/* Formal Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="https://i.ibb.co.com/1fQ81J6v/LOGO-PEKAYON-09.jpg" 
              alt="Logo SDN Pekayon 09" 
              className="w-10 h-10 object-contain" 
            />
             <div>
               <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                 RPM GENERATOR
               </h1>
               <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">SDN Pekayon 09 Jakarta</p>
             </div>
          </div>

          {/* Date & Time Display - Minimalist */}
          <div className="hidden md:flex items-center gap-4 text-[10px] font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded border border-slate-200">
             <div className="flex items-center gap-2 border-r border-slate-300 pr-4">
                <Calendar size={14} className="text-[#1e3a8a]" />
                <span className="uppercase">{dateTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
             </div>
             <div className="flex items-center gap-2 pl-1">
                <Clock size={14} className="text-[#1e3a8a]" />
                <span className="tabular-nums">{dateTime.toLocaleTimeString('id-ID')}</span>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 md:p-10 max-w-6xl mx-auto">
        {!rpmResult ? (
          <div className="animate-fade-in-up">
             {/* Hero Section - Clean & Professional */}
             <div className="text-center space-y-4 mb-12">
                <div className="inline-flex items-center justify-center p-3 bg-white border border-slate-200 rounded shadow-sm mb-2">
                  <FileCheck size={32} className="text-[#1e3a8a]" />
                </div>
                
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight uppercase">
                  Sistem Perencanaan Pembelajaran
                </h2>
                <p className="text-slate-500 max-w-xl mx-auto text-sm font-medium">
                  Otomasi penyusunan dokumen RPM berbasis kecerdasan buatan untuk efisiensi administrasi guru.
                </p>
             </div>
             
             <InputForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        ) : (
          <div className="animate-fade-in">
            <RPMPreview data={rpmResult} onReset={() => setRpmResult(null)} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 py-10 border-t border-slate-200 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <p className="text-slate-500 text-[10px] font-bold tracking-[0.3em] uppercase">
             &copy; {new Date().getFullYear()} SDN PEKAYON 09 JAKARTA TIMUR
          </p>
          <p className="text-slate-400 text-[9px] font-medium tracking-wide uppercase">
             Dikembangkan secara mandiri untuk kemajuan pendidikan digital
          </p>
        </div>
      </footer>

      <WhatsAppButton />
    </div>
  );
};

export default App;