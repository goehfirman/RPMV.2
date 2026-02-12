import React, { useState, useEffect } from 'react';
import { 
  ClassLevel, Semester, Subject, PedagogicalPractice, 
  GraduateDimension, FormData
} from '../types';
import { getFieldSuggestions } from '../services/geminiService';
import DatePicker from './DatePicker';
import { Loader2, Check, X, Sparkles, Eye, EyeOff, BookOpen, User, Calendar, BrainCircuit, Activity } from 'lucide-react';

interface InputFormProps {
  onSubmit: (data: FormData, apiKey: string) => void;
  isLoading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<FormData>({
    teacherName: '',
    teacherNIP: '',
    principalName: 'Veria Wulandari, S.Pd', 
    principalNIP: '198102012008012028',
    classLevel: ClassLevel.Kelas1,
    semester: Semester.Ganjil,
    subject: Subject.BahasaIndonesia,
    cp: '',
    tp: '',
    materi: '',
    meetingCount: 1,
    duration: '2 x 35 menit',
    meetings: [{ meetingNumber: 1, pedagogy: PedagogicalPractice.InkuiriDiscovery }],
    dimensions: [],
    documentDate: today
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeField, setActiveField] = useState<'cp' | 'tp' | 'materi' | null>(null);
  const [loadingField, setLoadingField] = useState<'cp' | 'tp' | 'materi' | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  // Effect: Menangani perubahan jumlah pertemuan
  useEffect(() => {
    setFormData(prev => {
      const currentCount = prev.meetings.length;
      const targetCount = prev.meetingCount;
      if (currentCount === targetCount) return prev;
      let newMeetings = [...prev.meetings];
      if (targetCount > currentCount) {
        for (let i = currentCount + 1; i <= targetCount; i++) {
          newMeetings.push({ meetingNumber: i, pedagogy: PedagogicalPractice.InkuiriDiscovery });
        }
      } else {
        newMeetings = newMeetings.slice(0, targetCount);
      }
      return { ...prev, meetings: newMeetings };
    });
  }, [formData.meetingCount]);

  // Effect: Reset Mata Pelajaran jika Kelas diubah
  useEffect(() => {
    // Logic Koding (Kelas 5 & 6 only)
    const isUpperClass = formData.classLevel === ClassLevel.Kelas5 || formData.classLevel === ClassLevel.Kelas6;
    if (!isUpperClass && formData.subject === Subject.KodingDanKA) {
      setFormData(prev => ({ ...prev, subject: Subject.BahasaIndonesia }));
    }

    // Logic IPAS (Kelas 3, 4, 5, 6 only)
    const isLowerClass = formData.classLevel === ClassLevel.Kelas1 || formData.classLevel === ClassLevel.Kelas2;
    if (isLowerClass && formData.subject === Subject.IPAS) {
      setFormData(prev => ({ ...prev, subject: Subject.BahasaIndonesia }));
    }
  }, [formData.classLevel]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDimensionChange = (dim: GraduateDimension) => {
    setFormData(prev => {
      const exists = prev.dimensions.includes(dim);
      return { ...prev, dimensions: exists ? prev.dimensions.filter(d => d !== dim) : [...prev.dimensions, dim] };
    });
  };

  const handlePedagogyChange = (index: number, value: PedagogicalPractice) => {
    const newMeetings = [...formData.meetings];
    newMeetings[index].pedagogy = value;
    setFormData(prev => ({ ...prev, meetings: newMeetings }));
  };

  const handleGetSuggestion = async (field: 'cp' | 'tp' | 'materi') => {
    if (!apiKey) {
      alert("Mohon masukkan API Key terlebih dahulu.");
      return;
    }

    // Validasi Dependensi: CP -> TP -> Materi
    if (field === 'tp' && !formData.cp.trim()) {
      alert("Harap isi Capaian Pembelajaran (CP) terlebih dahulu agar TP yang disarankan sesuai.");
      return;
    }
    
    if (field === 'materi' && !formData.tp.trim()) {
      alert("Harap isi Tujuan Pembelajaran (TP) terlebih dahulu agar Materi yang disarankan sesuai.");
      return;
    }

    setLoadingField(field);
    setSuggestions([]);
    setSelectedSuggestions([]);
    setActiveField(null);
    
    // Context yang lebih spesifik
    let context = "";
    if (field === 'tp') {
      context = formData.cp;
    } else if (field === 'materi') {
      context = formData.tp;
    }

    const opts = await getFieldSuggestions(field, formData.subject, formData.classLevel, apiKey, context);
    setSuggestions(opts);
    setActiveField(field);
    setLoadingField(null);
  };

  const handleSelectSuggestion = (val: string) => {
    if (activeField) {
        setFormData(prev => ({ ...prev, [activeField]: val }));
        setActiveField(null);
        setSuggestions([]);
        setSelectedSuggestions([]);
    }
  };

  const handleToggleSuggestion = (val: string) => {
    setSelectedSuggestions(prev => {
      if (prev.includes(val)) {
        return prev.filter(item => item !== val);
      } else {
        return [...prev, val];
      }
    });
  };

  const handleApplySelected = () => {
    if (activeField && selectedSuggestions.length > 0) {
      setFormData(prev => ({ ...prev, [activeField]: selectedSuggestions.join('\n') }));
      setActiveField(null);
      setSuggestions([]);
      setSelectedSuggestions([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) return alert("API Key wajib diisi.");
    onSubmit(formData, apiKey);
  };

  const SectionTitle = ({ title, icon: Icon }: { title: string, icon: any }) => (
    <div className="mb-8 mt-12 pb-4 border-b border-purple-200 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-50 rounded-lg border border-purple-200 shadow-sm text-purple-600"><Icon size={18} /></div>
        <h3 className="text-lg font-tech font-bold text-slate-800 tracking-wider uppercase">{title}</h3>
      </div>
    </div>
  );

  const InputLabel = ({ label, required }: { label: string, required?: boolean }) => (
    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">{label} {required && "*"}</label>
  );

  const InputClasses = "w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all shadow-sm";
  const SelectClasses = "w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none appearance-none cursor-pointer transition-all shadow-sm";

  const renderSuggestionInput = (field: 'cp' | 'tp' | 'materi', label: string, rows: number, placeholder: string) => {
    const isMultiSelect = field === 'tp' || field === 'materi';
    
    // Helper text untuk panduan user
    let helperText = "";
    if (field === 'tp' && !formData.cp) helperText = "Isi CP dulu untuk membuka saran AI";
    if (field === 'materi' && !formData.tp) helperText = "Isi TP dulu untuk membuka saran AI";

    return (
      <div className="relative group space-y-2 p-6 bg-white/50 border border-purple-100 rounded-xl hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100 transition-all duration-300">
          <div className="flex justify-between items-center mb-1">
               <InputLabel label={label} required />
               <div className="flex items-center gap-2">
                 {helperText && <span className="text-[9px] text-red-400 font-semibold uppercase tracking-wider">{helperText}</span>}
                 <button 
                    type="button" 
                    onClick={() => handleGetSuggestion(field)}
                    disabled={loadingField === field}
                    className="px-3 py-1.5 bg-white border border-purple-200 hover:border-purple-400 hover:bg-purple-50 text-purple-600 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {loadingField === field ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {loadingField === field ? 'Memproses...' : 'Saran AI'}
                 </button>
               </div>
          </div>
          <div className="relative">
            <textarea 
                required 
                name={field} 
                value={formData[field]} 
                onChange={handleChange} 
                rows={rows} 
                className={`${InputClasses} resize-none leading-relaxed bg-white/80`}
                placeholder={placeholder} 
            />
          </div>
          
          {activeField === field && suggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 w-full bg-white border border-purple-200 shadow-2xl rounded-xl mt-2 overflow-hidden animate-fade-in-up backdrop-blur-xl ring-1 ring-purple-100">
                   <div className="px-4 py-3 bg-purple-50/50 border-b border-purple-100 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={12} />
                        {isMultiSelect ? 'Pilih Beberapa' : 'Pilih Satu'}
                      </span>
                      <button type="button" onClick={() => setActiveField(null)} className="text-slate-400 hover:text-purple-600 transition">
                          <X size={16} />
                      </button>
                   </div>
                   
                   <ul className="max-h-72 overflow-y-auto custom-scrollbar">
                      {suggestions.map((s, idx) => {
                          const isSelected = selectedSuggestions.includes(s);
                          return (
                            <li 
                                key={idx} 
                                onClick={() => isMultiSelect ? handleToggleSuggestion(s) : handleSelectSuggestion(s)} 
                                className={`px-5 py-4 text-sm border-b border-slate-50 last:border-0 cursor-pointer transition-all flex items-start gap-4 leading-relaxed ${
                                  isSelected ? 'bg-purple-50 text-purple-800 font-medium' : 'hover:bg-slate-50 text-slate-600 hover:text-purple-600'
                                }`}
                            >
                                {isMultiSelect && (
                                  <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-300 bg-white'}`}>
                                    {isSelected && <Check size={12} strokeWidth={3} />}
                                  </div>
                                )}
                                <span className="flex-1">{s}</span>
                            </li>
                          );
                      })}
                   </ul>

                   {isMultiSelect && (
                     <div className="p-4 border-t border-purple-100 bg-purple-50/30">
                       <button
                         type="button"
                         onClick={handleApplySelected}
                         disabled={selectedSuggestions.length === 0}
                         className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all shadow-lg disabled:opacity-50"
                       >
                         Konfirmasi {selectedSuggestions.length} Pilihan
                       </button>
                     </div>
                   )}
              </div>
          )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/60 backdrop-blur-xl border border-white/40 p-8 md:p-12 max-w-5xl mx-auto rounded-2xl shadow-xl ring-1 ring-purple-100">
      
      {/* Otorisasi Sistem */}
      <div className="bg-white rounded-xl p-6 border border-purple-100 shadow-sm mb-10 relative group">
        <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
          <div className="flex-1">
             <label className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-2 block flex items-center gap-2">
               Otorisasi Sistem: Gemini API Key
             </label>
             <div className="relative">
               <input 
                 type={showApiKey ? "text" : "password"} 
                 value={apiKey} 
                 onChange={(e) => { setApiKey(e.target.value); localStorage.setItem('gemini_api_key', e.target.value); }}
                 placeholder="Tempel Kunci di Sini..." 
                 className="w-full bg-slate-50 border border-slate-200 focus:border-purple-400 rounded-lg px-4 py-3 text-sm font-mono text-slate-700 placeholder:text-slate-400 outline-none transition-all"
               />
             </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
             <button 
                 type="button"
                 onClick={() => setShowApiKey(!showApiKey)}
                 className="text-slate-400 hover:text-purple-600 transition-colors"
               >
                 {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
             </button>
             <div className="h-8 w-px bg-slate-200"></div>
             <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noreferrer" 
              className="px-5 py-2.5 bg-white border border-purple-200 text-purple-600 text-xs font-bold rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all uppercase tracking-wide shadow-sm"
             >
               Buat Kunci
             </a>
          </div>
        </div>
      </div>

      {/* 1. Informasi Pendidik */}
      <section>
        <SectionTitle title="1. Informasi Pendidik" icon={User} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <InputLabel label="Nama Satuan Pendidikan" />
            <input type="text" value="SDN Pekayon 09" disabled className={`${InputClasses} bg-slate-50 font-semibold text-slate-400`} />
          </div>
          <DatePicker 
            label="Tanggal Dokumen" 
            required 
            value={formData.documentDate} 
            onChange={(date) => setFormData(prev => ({ ...prev, documentDate: date }))} 
          />
          <div><InputLabel label="Nama Guru" required /><input required name="teacherName" value={formData.teacherName} onChange={handleChange} className={InputClasses} placeholder="Nama Lengkap & Gelar" /></div>
          <div><InputLabel label="NIP Guru" required /><input required name="teacherNIP" value={formData.teacherNIP} onChange={handleChange} className={InputClasses} placeholder="NIP tanpa spasi" /></div>
          <div>
            <InputLabel label="Nama Kepala Sekolah" />
            <input name="principalName" value={formData.principalName} disabled className={`${InputClasses} bg-slate-50 font-semibold text-slate-400`} />
          </div>
          <div>
            <InputLabel label="NIP Kepala Sekolah" />
            <input name="principalNIP" value={formData.principalNIP} disabled className={`${InputClasses} bg-slate-50 font-semibold text-slate-400`} />
          </div>
        </div>
      </section>

      {/* 2. Kurikulum & Materi */}
      <section>
        <SectionTitle title="2. Kurikulum & Materi" icon={BookOpen} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div><InputLabel label="Kelas" /><select name="classLevel" value={formData.classLevel} onChange={handleChange} className={SelectClasses}>{Object.values(ClassLevel).map(c => <option key={c} value={c}>Kelas {c}</option>)}</select></div>
          <div><InputLabel label="Semester" /><select name="semester" value={formData.semester} onChange={handleChange} className={SelectClasses}>{Object.values(Semester).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div>
            <InputLabel label="Mata Pelajaran" />
            <select name="subject" value={formData.subject} onChange={handleChange} className={SelectClasses}>
              {Object.values(Subject)
                .filter(s => {
                  // Filter: Koding hanya untuk Kelas 5 dan 6
                  if (s === Subject.KodingDanKA) {
                    return formData.classLevel === ClassLevel.Kelas5 || formData.classLevel === ClassLevel.Kelas6;
                  }
                  // Filter: IPAS hanya untuk Kelas 3, 4, 5, 6
                  if (s === Subject.IPAS) {
                     return formData.classLevel === ClassLevel.Kelas3 || formData.classLevel === ClassLevel.Kelas4 || formData.classLevel === ClassLevel.Kelas5 || formData.classLevel === ClassLevel.Kelas6;
                  }
                  return true;
                })
                .map(s => <option key={s} value={s}>{s}</option>)
              }
            </select>
          </div>
        </div>

        <div className="space-y-6">
             {renderSuggestionInput('cp', 'Capaian Pembelajaran (CP)', 3, 'Tulis CP atau gunakan tombol AI...')}
             {renderSuggestionInput('tp', 'Tujuan Pembelajaran (TP)', 2, 'Tulis TP atau gunakan tombol AI...')}
             {renderSuggestionInput('materi', 'Materi Pelajaran', 2, 'Tulis Materi atau gunakan tombol AI...')}
        </div>
      </section>

      {/* 3. Strategi Pertemuan */}
      <section>
        <SectionTitle title="3. Strategi Pertemuan" icon={Calendar} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div><InputLabel label="Jumlah Pertemuan" /><select name="meetingCount" value={formData.meetingCount} onChange={(e) => setFormData(p => ({...p, meetingCount: parseInt(e.target.value)}))} className={SelectClasses}>{[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Pertemuan</option>)}</select></div>
          <div><InputLabel label="Alokasi Waktu (Contoh: 2 x 35 menit)" /><input name="duration" value={formData.duration} onChange={handleChange} className={InputClasses} placeholder="2 x 35 menit" /></div>
        </div>
        <div className="space-y-4">
          <InputLabel label="Model Pembelajaran per Pertemuan" />
          {formData.meetings.map((m, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-lg shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase w-24">Pertemuan {m.meetingNumber}</span>
              <select 
                value={m.pedagogy} 
                onChange={(e) => handlePedagogyChange(idx, e.target.value as PedagogicalPractice)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-purple-300"
              >
                {Object.values(PedagogicalPractice).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Profil Lulusan */}
      <section>
        <SectionTitle title="4. Profil Lulusan" icon={BrainCircuit} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(GraduateDimension).map((dim) => (
            <label key={dim} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.dimensions.includes(dim) ? 'bg-purple-50 border-purple-300 shadow-sm' : 'bg-white border-slate-100 hover:border-purple-200'}`}>
              <input type="checkbox" checked={formData.dimensions.includes(dim)} onChange={() => handleDimensionChange(dim)} className="hidden" />
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.dimensions.includes(dim) ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300'}`}>
                {formData.dimensions.includes(dim) && <Check size={12} className="text-white" strokeWidth={4} />}
              </div>
              <span className={`text-sm ${formData.dimensions.includes(dim) ? 'text-purple-900 font-semibold' : 'text-slate-600'}`}>{dim}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Tombol Buat */}
      <div className="pt-12">
        <button type="submit" disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-tech font-bold py-5 rounded-lg shadow-lg flex justify-center items-center gap-4 transition-all uppercase tracking-[0.2em] disabled:opacity-50 group">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin" size={24} />
              <span>Menghasilkan RPM...</span>
            </div>
          ) : (
            <>
              <span>Buat RPM Sekarang</span>
              <Sparkles size={20} className="group-hover:scale-125 transition-transform" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default InputForm;