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

  useEffect(() => {
    const isUpperClass = formData.classLevel === ClassLevel.Kelas5 || formData.classLevel === ClassLevel.Kelas6;
    if (!isUpperClass && formData.subject === Subject.KodingDanKA) {
      setFormData(prev => ({ ...prev, subject: Subject.BahasaIndonesia }));
    }
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
    <div className="mb-6 mt-10 pb-3 border-b border-slate-200 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded text-slate-700"><Icon size={18} /></div>
        <h3 className="text-base font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
      </div>
    </div>
  );

  const InputLabel = ({ label, required }: { label: string, required?: boolean }) => (
    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">{label} {required && "*"}</label>
  );

  // Formal Style Classes
  const InputClasses = "w-full px-4 py-2.5 bg-white border border-slate-300 rounded text-sm font-medium text-slate-900 focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none transition-all shadow-sm";
  const SelectClasses = "w-full px-4 py-2.5 bg-white border border-slate-300 rounded text-sm font-medium text-slate-900 focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none appearance-none cursor-pointer transition-all shadow-sm";

  const renderSuggestionInput = (field: 'cp' | 'tp' | 'materi', label: string, rows: number, placeholder: string) => {
    const isMultiSelect = field === 'tp' || field === 'materi';
    let helperText = "";
    if (field === 'tp' && !formData.cp) helperText = "Isi CP dahulu";
    if (field === 'materi' && !formData.tp) helperText = "Isi TP dahulu";

    return (
      <div className="relative group space-y-2 p-5 bg-white border border-slate-200 rounded-lg hover:border-slate-400 transition-all duration-300">
          <div className="flex justify-between items-center mb-1">
               <InputLabel label={label} required />
               <div className="flex items-center gap-2">
                 {helperText && <span className="text-[10px] text-red-500 font-semibold uppercase">{helperText}</span>}
                 <button 
                    type="button" 
                    onClick={() => handleGetSuggestion(field)}
                    disabled={loadingField === field}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[#1e3a8a] rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
                 >
                    {loadingField === field ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {loadingField === field ? 'Memproses...' : 'Asisten AI'}
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
                className={`${InputClasses} resize-none leading-relaxed`}
                placeholder={placeholder} 
            />
          </div>
          
          {activeField === field && suggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 w-full bg-white border border-slate-300 shadow-xl rounded-lg mt-1 overflow-hidden animate-fade-in">
                   <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={12} />
                        {isMultiSelect ? 'Pilih Opsi (Bisa Lebih dari satu)' : 'Pilih Satu Opsi'}
                      </span>
                      <button type="button" onClick={() => setActiveField(null)} className="text-slate-400 hover:text-red-600 transition">
                          <X size={16} />
                      </button>
                   </div>
                   
                   <ul className="max-h-60 overflow-y-auto">
                      {suggestions.map((s, idx) => {
                          const isSelected = selectedSuggestions.includes(s);
                          return (
                            <li 
                                key={idx} 
                                onClick={() => isMultiSelect ? handleToggleSuggestion(s) : handleSelectSuggestion(s)} 
                                className={`px-4 py-3 text-sm border-b border-slate-100 last:border-0 cursor-pointer transition-all flex items-start gap-3 leading-relaxed ${
                                  isSelected ? 'bg-blue-50 text-blue-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                {isMultiSelect && (
                                  <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-[#1e3a8a] border-[#1e3a8a] text-white' : 'border-slate-300 bg-white'}`}>
                                    {isSelected && <Check size={10} strokeWidth={3} />}
                                  </div>
                                )}
                                <span className="flex-1">{s}</span>
                            </li>
                          );
                      })}
                   </ul>

                   {isMultiSelect && (
                     <div className="p-3 border-t border-slate-200 bg-slate-50">
                       <button
                         type="button"
                         onClick={handleApplySelected}
                         disabled={selectedSuggestions.length === 0}
                         className="w-full py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-bold uppercase tracking-widest rounded transition-all shadow-sm disabled:opacity-50"
                       >
                         Gunakan {selectedSuggestions.length} Pilihan
                       </button>
                     </div>
                   )}
              </div>
          )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-8 md:p-10 max-w-5xl mx-auto rounded shadow-sm">
      
      {/* Otorisasi Sistem */}
      <div className="bg-slate-50 rounded p-5 border border-slate-200 mb-10">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
               Gemini API Key
             </label>
             <div className="relative">
               <input 
                 type={showApiKey ? "text" : "password"} 
                 value={apiKey} 
                 onChange={(e) => { setApiKey(e.target.value); localStorage.setItem('gemini_api_key', e.target.value); }}
                 placeholder="Tempel Kunci API di sini..." 
                 className="w-full bg-white border border-slate-300 focus:border-[#1e3a8a] rounded px-4 py-2 text-sm font-mono text-slate-800 outline-none transition-all"
               />
             </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 pt-4 md:pt-0">
             <button 
                 type="button"
                 onClick={() => setShowApiKey(!showApiKey)}
                 className="text-slate-400 hover:text-slate-600 transition-colors"
               >
                 {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
             </button>
             <div className="h-6 w-px bg-slate-300 mx-2"></div>
             <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noreferrer" 
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-100 transition-all uppercase"
             >
               Dapatkan Key
             </a>
          </div>
        </div>
      </div>

      {/* 1. Informasi Pendidik */}
      <section>
        <SectionTitle title="1. Informasi Pendidik" icon={User} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <InputLabel label="Nama Satuan Pendidikan" />
            <input type="text" value="SDN Pekayon 09" disabled className={`${InputClasses} bg-slate-100 text-slate-500 border-slate-200 font-semibold`} />
          </div>
          <DatePicker 
            label="Tanggal Dokumen" 
            required 
            value={formData.documentDate} 
            onChange={(date) => setFormData(prev => ({ ...prev, documentDate: date }))} 
          />
          <div><InputLabel label="Nama Guru" required /><input required name="teacherName" value={formData.teacherName} onChange={handleChange} className={InputClasses} placeholder="Nama Lengkap & Gelar" /></div>
          <div><InputLabel label="NIP Guru" required /><input required name="teacherNIP" value={formData.teacherNIP} onChange={handleChange} className={InputClasses} placeholder="NIP" /></div>
          <div>
            <InputLabel label="Nama Kepala Sekolah" />
            <input name="principalName" value={formData.principalName} disabled className={`${InputClasses} bg-slate-100 text-slate-500 border-slate-200 font-semibold`} />
          </div>
          <div>
            <InputLabel label="NIP Kepala Sekolah" />
            <input name="principalNIP" value={formData.principalNIP} disabled className={`${InputClasses} bg-slate-100 text-slate-500 border-slate-200 font-semibold`} />
          </div>
        </div>
      </section>

      {/* 2. Kurikulum & Materi */}
      <section>
        <SectionTitle title="2. Kurikulum & Materi" icon={BookOpen} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div><InputLabel label="Kelas" /><select name="classLevel" value={formData.classLevel} onChange={handleChange} className={SelectClasses}>{Object.values(ClassLevel).map(c => <option key={c} value={c}>Kelas {c}</option>)}</select></div>
          <div><InputLabel label="Semester" /><select name="semester" value={formData.semester} onChange={handleChange} className={SelectClasses}>{Object.values(Semester).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div>
            <InputLabel label="Mata Pelajaran" />
            <select name="subject" value={formData.subject} onChange={handleChange} className={SelectClasses}>
              {Object.values(Subject)
                .filter(s => {
                  if (s === Subject.KodingDanKA) return formData.classLevel === ClassLevel.Kelas5 || formData.classLevel === ClassLevel.Kelas6;
                  if (s === Subject.IPAS) return formData.classLevel === ClassLevel.Kelas3 || formData.classLevel === ClassLevel.Kelas4 || formData.classLevel === ClassLevel.Kelas5 || formData.classLevel === ClassLevel.Kelas6;
                  return true;
                })
                .map(s => <option key={s} value={s}>{s}</option>)
              }
            </select>
          </div>
        </div>

        <div className="space-y-4">
             {renderSuggestionInput('cp', 'Capaian Pembelajaran (CP)', 3, 'Tulis CP atau gunakan Asisten AI...')}
             {renderSuggestionInput('tp', 'Tujuan Pembelajaran (TP)', 2, 'Tulis TP atau gunakan Asisten AI...')}
             {renderSuggestionInput('materi', 'Materi Pelajaran', 2, 'Tulis Materi atau gunakan Asisten AI...')}
        </div>
      </section>

      {/* 3. Strategi Pertemuan */}
      <section>
        <SectionTitle title="3. Strategi Pertemuan" icon={Calendar} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div><InputLabel label="Jumlah Pertemuan" /><select name="meetingCount" value={formData.meetingCount} onChange={(e) => setFormData(p => ({...p, meetingCount: parseInt(e.target.value)}))} className={SelectClasses}>{[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Pertemuan</option>)}</select></div>
          <div><InputLabel label="Alokasi Waktu" /><input name="duration" value={formData.duration} onChange={handleChange} className={InputClasses} placeholder="Contoh: 2 x 35 menit" /></div>
        </div>
        <div className="space-y-3">
          <InputLabel label="Model Pembelajaran per Pertemuan" />
          {formData.meetings.map((m, idx) => (
            <div key={idx} className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] font-bold text-slate-500 uppercase w-20">P{m.meetingNumber}</span>
              <select 
                value={m.pedagogy} 
                onChange={(e) => handlePedagogyChange(idx, e.target.value as PedagogicalPractice)}
                className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#1e3a8a] transition-colors"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.values(GraduateDimension).map((dim) => (
            <label key={dim} className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-all ${formData.dimensions.includes(dim) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
              <input type="checkbox" checked={formData.dimensions.includes(dim)} onChange={() => handleDimensionChange(dim)} className="hidden" />
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.dimensions.includes(dim) ? 'bg-[#1e3a8a] border-[#1e3a8a]' : 'bg-white border-slate-300'}`}>
                {formData.dimensions.includes(dim) && <Check size={10} className="text-white" strokeWidth={4} />}
              </div>
              <span className={`text-xs ${formData.dimensions.includes(dim) ? 'text-[#1e3a8a] font-bold' : 'text-slate-600'}`}>{dim}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Tombol Buat */}
      <div className="pt-10">
        <button type="submit" disabled={isLoading} className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold py-4 rounded shadow-sm flex justify-center items-center gap-3 transition-all uppercase tracking-widest disabled:opacity-50">
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Memproses Data...</span>
            </>
          ) : (
            <>
              <span>Buat Dokumen RPM</span>
              <Sparkles size={18} />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default InputForm;