import React, { useState, useEffect } from 'react';
import InputForm from './components/InputForm';
import RPMPreview from './components/RPMPreview';
import { FormData, RPMResult } from './types';
import { generateRPM } from './services/geminiService';
import { Cpu, Zap, Clock, Calendar, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

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
         alert("⚠️ KUOTA HABIS ⚠️\n\nGoogle membatasi penggunaan API Key Anda karena terlalu sering melakukan permintaan dalam waktu singkat.\n\nSOLUSI:\n1. Tunggu 1-2 menit, lalu coba tekan tombol 'Buat RPM' lagi.\n2. Jika terus berulang, gunakan Akun Google lain untuk membuat API Key baru.");
      } else {
         alert("Terjadi kesalahan teknis. Pastikan koneksi internet stabil dan API Key Anda valid.");
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
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white/90 backdrop-blur border border-green-200 py-1.5 pl-1.5 pr-4 rounded-full shadow-xl hover:shadow-green-200/50 hover:-translate-y-1 transition-all duration-300 no-print group"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-green-400 rounded-full blur opacity-20 group-hover:opacity-50 transition-opacity duration-300"></div>
        <img 
          src="https://pngimg.com/d/whatsapp_PNG21.png" 
          alt="WhatsApp" 
          className="w-8 h-8 relative z-10"
        />
      </div>
      <span className="font-bold text-slate-700 text-xs group-hover:text-green-700 transition-colors">
        Tanya Pengembang
      </span>
    </a>
  );

  // Render Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex items-center justify-center p-4 relative">
        <div className="min-h-screen w-full fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/60 via-slate-50 to-slate-50 z-0"></div>
        
        <div className="relative z-10 w-full max-w-md animate-fade-in-up">
          <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-8 rounded-2xl shadow-2xl ring-1 ring-purple-100">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 bg-purple-50 rounded-full mb-4 shadow-inner">
                <ShieldCheck size={40} className="text-purple-600" />
              </div>
              <h1 className="text-2xl font-tech font-bold text-slate-900 uppercase tracking-wide">
                Selamat Datang
              </h1>
              <p className="text-slate-500 text-sm mt-2">
                Masukkan kata sandi untuk mengakses Generator RPM SDN Pekayon 09.
              </p>
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
                    className={`w-full pl-10 pr-4 py-3 bg-white border rounded-lg text-sm font-medium outline-none transition-all shadow-sm
                      ${authError 
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 text-red-900 placeholder:text-red-300' 
                        : 'border-slate-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 text-slate-900'
                      }`}
                    placeholder="Masukan password..."
                    autoFocus
                  />
                </div>
                {authError && (
                  <p className="text-red-500 text-xs mt-2 font-medium animate-pulse">
                    Kata sandi salah. Silakan coba lagi.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-lg flex justify-center items-center gap-2 transition-all transform active:scale-95 group"
              >
                <span>Buka Akses</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
               <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
                 SDN Pekayon 09 Jakarta Timur
               </p>
            </div>
          </div>
        </div>
        
        {/* Floating WhatsApp Button on Login Screen */}
        <WhatsAppButton />
      </div>
    );
  }

  // Main App Render
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-purple-200 selection:text-purple-900 relative">
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100/40 via-transparent to-transparent">
        
        {/* Modern White Glossy Header */}
        <header className="sticky top-0 z-40 border-b border-purple-200/50 bg-white/70 backdrop-blur-xl shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="https://i.ibb.co.com/1fQ81J6v/LOGO-PEKAYON-09.jpg" 
                alt="Logo SDN Pekayon 09" 
                className="w-10 h-10 object-contain hover:scale-110 transition-transform duration-300 drop-shadow-sm" 
              />
               <div>
                 <h1 className="text-xl font-tech font-bold text-slate-800 tracking-wider flex items-center gap-2">
                   RPM <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-fuchsia-600">GENERATOR</span>
                 </h1>
                 <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold mt-0.5">SDN Pekayon 09</p>
               </div>
            </div>

            {/* Date & Time Display */}
            <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-600 bg-white/50 px-4 py-1.5 rounded-full border border-purple-100 shadow-sm">
               <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                  <Calendar size={14} className="text-purple-500" />
                  <span>{dateTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
               </div>
               <div className="flex items-center gap-2 pl-1">
                  <Clock size={14} className="text-purple-500" />
                  <span className="tabular-nums font-bold text-purple-900">{dateTime.toLocaleTimeString('id-ID')}</span>
               </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 md:p-12 max-w-6xl mx-auto">
          {!rpmResult ? (
            <div className="animate-fade-in-up">
               {/* Hero Section */}
               <div className="text-center space-y-6 mb-16 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-200/30 rounded-full blur-[80px] pointer-events-none"></div>
                  
                  <div className="inline-flex items-center justify-center p-4 mb-2 relative group">
                    <div className="absolute inset-0 bg-purple-100 rounded-full blur-md group-hover:bg-purple-200 transition-all duration-500"></div>
                    <Cpu size={48} strokeWidth={1.5} className="text-purple-600 relative z-10" />
                  </div>
                  
                  <h2 className="text-4xl md:text-6xl font-tech font-bold text-slate-900 tracking-tight leading-tight uppercase">
                    Rencana <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 animate-gradient-x neon-text-glow">Pembelajaran</span>
                  </h2>
                  <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed font-light">
                    Hasilkan dokumen RPM terstruktur dengan kecerdasan buatan. <br/>
                    <span className="font-medium text-purple-700">Otomatis, Akurat, dan Profesional.</span>
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
        <footer className="mt-20 py-8 text-center no-print border-t border-purple-100 bg-white/40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-2">
            <Zap size={16} className="text-purple-400" />
            <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">
               &copy; {new Date().getFullYear()} Sistem Digital SDN Pekayon 09
            </p>
            <p className="text-slate-400 text-[10px] font-medium tracking-wide">
               Dikembangkan oleh: Teguh Firmansyah Apriliana <span className="text-purple-500">@goehfirmaan</span>
            </p>
          </div>
        </footer>
      </div>

      {/* Floating WhatsApp Button on Main App */}
      <WhatsAppButton />
    </div>
  );
};

export default App;