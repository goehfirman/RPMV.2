import React, { useRef, useState } from 'react';
import { RPMResult, QuestionType, DifficultyLevel, CognitiveLevel, SoalConfig } from '../types';
import { Copy, Download, ArrowLeft, FileText, ClipboardList, X, Loader2, Sparkles, Sliders, Printer } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { generateLKPD, generateSoal } from '../services/geminiService';

interface RPMPreviewProps {
  data: RPMResult;
  onReset: () => void;
}

const RPMPreview: React.FC<RPMPreviewProps> = ({ data, onReset }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeModal, setActiveModal] = useState<'none' | 'lkpd' | 'soal'>('none');
  const [modalContent, setModalContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfiguringSoal, setIsConfiguringSoal] = useState(false);

  const [soalConfig, setSoalConfig] = useState<SoalConfig>({
    type: QuestionType.PG,
    count: 5,
    difficulty: DifficultyLevel.Sedang,
    cognitive: CognitiveLevel.MOTS
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleCopyToDocs = async (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
      const blob = new Blob([element.innerHTML], { type: 'text/html' });
      // @ts-ignore
      const clipboardItem = new ClipboardItem({ 'text/html': blob });
      // @ts-ignore
      await navigator.clipboard.write([clipboardItem]);
      alert("Konten disalin ke papan klip.");
    } catch (err) {
      alert('Gagal menyalin. Silakan gunakan cara manual.');
    }
  };

  const handleDownloadPDF = (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if(!element) return;
    const opt = {
      margin: [10, 10, 20, 10], 
      filename: filename,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).toPdf().get('pdf').then((pdf: any) => {
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Dokumen RPM SDN Pekayon 09 - Hal ${i}/${totalPages}`, 10, pdf.internal.pageSize.getHeight() - 10);
      }
      pdf.save(filename);
    });
  };

  const startGenerateSoal = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return alert("API Key tidak ditemukan.");
    setIsGenerating(true);
    setIsConfiguringSoal(false);
    try {
      const content = await generateSoal(data, apiKey, soalConfig);
      setModalContent(content);
    } catch (e) {
      setModalContent('<p class="text-red-600 font-bold p-10 text-center">Gagal menghasilkan soal. Coba beberapa saat lagi.</p>');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateExtra = async (type: 'lkpd' | 'soal') => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return alert("API Key tidak ditemukan.");
    if (type === 'soal') {
      setActiveModal('soal');
      setIsConfiguringSoal(true);
      return;
    }
    setIsGenerating(true);
    setActiveModal(type);
    setModalContent('');
    try {
      const content = await generateLKPD(data, apiKey);
      setModalContent(content);
    } catch (e) {
      setModalContent('<p class="text-red-600 font-bold p-10 text-center">Terjadi kesalahan.</p>');
    } finally {
      setIsGenerating(false);
    }
  };

  const TARGET_TEACHER = "Teguh Firmansyah Apriliana, S.Pd";
  const SIGNATURE_URL = "https://i.ibb.co.com/KctJSrRC/ttd-gue.png";
  const shouldShowSignature = data.teacherName.trim() === TARGET_TEACHER;

  return (
    <div className="max-w-5xl mx-auto pb-20 relative animate-fade-in">
      {/* Action Bar - Formal Dark Version */}
      <div className="sticky top-20 z-40 flex flex-wrap gap-3 justify-between items-center bg-[#1e293b] text-white p-3 rounded shadow-xl mb-8 no-print">
        <button onClick={onReset} className="flex items-center gap-2 hover:bg-slate-700 px-3 py-1.5 rounded transition font-bold uppercase text-[10px] tracking-wider">
          <ArrowLeft size={14} /> Kembali
        </button>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleGenerateExtra('lkpd')} className="bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
             <FileText size={14} /> LKPD
          </button>
          <button onClick={() => handleGenerateExtra('soal')} className="bg-slate-600 hover:bg-slate-700 px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
             <ClipboardList size={14} /> SOAL
          </button>
          <div className="w-px h-6 bg-slate-600 mx-1"></div>
          <button onClick={() => handleCopyToDocs('rpm-content')} className="bg-slate-100 text-slate-900 hover:bg-white px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <Copy size={14} /> Salin
          </button>
          <button onClick={() => handleDownloadPDF('rpm-content', `RPM_${data.subject}.pdf`)} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      <div id="rpm-content" ref={contentRef} className="bg-white p-12 shadow-sm border border-slate-200 min-h-screen text-black">
        <style>
            {`
              #rpm-content { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1.5px solid black; }
              th { background-color: #f1f5f9; color: black; font-weight: bold; border: 1px solid black; padding: 8px; text-align: left; }
              td { padding: 8px; border: 1px solid black; vertical-align: top; }
              .doc-title { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 5px; text-transform: uppercase; }
              .doc-subtitle { text-align: center; font-weight: bold; font-size: 12pt; margin-bottom: 25px; }
              .sec-title { font-weight: bold; margin: 15px 0 10px 0; border-bottom: 1px solid black; padding-bottom: 2px; }
              ul, ol { margin: 0; padding-left: 20px; }
            `}
        </style>
        
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
            <img src="https://i.ibb.co.com/1fQ81J6v/LOGO-PEKAYON-09.jpg" alt="Logo" style={{ height: '70px' }} />
            <div className="text-center flex-1 px-4">
                <h1 className="doc-title">SDN Pekayon 09 Jakarta Timur</h1>
                <p className="text-xs">Alamat: Jl. Pendidikan Rt 04 Rw 09 Kel. Pekayon Kec. Pasar Rebo</p>
            </div>
            <img src="https://i.ibb.co.com/fz9ttjq6/Logo-of-Ministry-of-Education-and-Culture-of-Republic-of-Indonesia-svg.png" alt="Logo" style={{ height: '70px' }} />
        </div>

        <h2 className="doc-subtitle">RENCANA PEMBELAJARAN MENDALAM (RPM)</h2>

        <div className="sec-title">I. IDENTITAS MODUL</div>
        <table>
          <tbody>
            <tr><td width="25%">Mata Pelajaran</td><td width="30%">{data.subject}</td><td width="20%">Kelas / Semester</td><td width="25%">{data.classLevel} / {data.semester}</td></tr>
            <tr><td>Materi Pokok</td><td colSpan={3}>{data.materi}</td></tr>
            <tr><td>Alokasi Waktu</td><td colSpan={3}>{data.duration} ({data.meetingCount} Pertemuan)</td></tr>
          </tbody>
        </table>

        <div className="sec-title">II. TUJUAN PEMBELAJARAN</div>
        <div className="border border-black p-4 mb-5" style={{ whiteSpace: 'pre-line' }}>{data.tp}</div>

        <div className="sec-title">III. PROFIL PELAJAR PANCASILA</div>
        <div className="mb-5 italic">{data.dimensions.join(", ")}</div>

        <div className="sec-title">IV. KEGIATAN PEMBELAJARAN</div>
        <table>
          <thead>
            <tr><th width="20%">Tahap</th><th>Deskripsi Kegiatan</th></tr>
          </thead>
          <tbody>
            <tr><td>Pendahuluan</td><td dangerouslySetInnerHTML={{ __html: data.learningExperiences.memahami }}></td></tr>
            <tr><td>Inti</td><td dangerouslySetInnerHTML={{ __html: data.learningExperiences.mengaplikasi }}></td></tr>
            <tr><td>Penutup</td><td dangerouslySetInnerHTML={{ __html: data.learningExperiences.refleksi }}></td></tr>
          </tbody>
        </table>

        <div className="sec-title">V. ASESMEN</div>
        <table>
          <thead>
            <tr><th>Awal (Diagnostik)</th><th>Proses (Formatif)</th><th>Akhir (Sumatif)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td dangerouslySetInnerHTML={{ __html: data.assessments.initial }}></td>
              <td dangerouslySetInnerHTML={{ __html: data.assessments.process }}></td>
              <td dangerouslySetInnerHTML={{ __html: data.assessments.final }}></td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-between mt-20" style={{ pageBreakInside: 'avoid' }}>
            <div className="text-center w-52">
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala SDN Pekayon 09</p>
                <div style={{ height: '80px' }}></div>
                <p className="font-bold underline">{data.principalName}</p>
                <p className="text-xs">NIP. {data.principalNIP}</p>
            </div>
            <div className="text-center w-52">
                <p>Jakarta, {formatDate(data.documentDate)}</p>
                <p className="font-bold">Guru Kelas</p>
                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {shouldShowSignature && <img src={SIGNATURE_URL} alt="TTD" crossOrigin="anonymous" style={{ height: '70px' }} />}
                </div>
                <p className="font-bold underline">{data.teacherName}</p>
                <p className="text-xs">NIP. {data.teacherNIP}</p>
            </div>
        </div>
      </div>

      {/* MODALS - Formal Styled */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                 <div className="p-1.5 bg-[#1e3a8a] text-white rounded">
                    {activeModal === 'lkpd' ? <FileText size={16} /> : <ClipboardList size={16} />}
                 </div>
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                    {activeModal === 'lkpd' ? 'Lembar Kerja Peserta Didik' : 'Generator Instrumen Penilaian'}
                 </h3>
              </div>
              <button onClick={() => { setActiveModal('none'); setModalContent(''); setIsConfiguringSoal(false); }} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
               {activeModal === 'soal' && isConfiguringSoal ? (
                 <div className="max-w-md mx-auto bg-white p-6 rounded border border-slate-200 shadow-sm animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 text-slate-700">
                        <Sliders size={18} />
                        <h4 className="text-xs font-bold uppercase tracking-widest">Konfigurasi Instrumen</h4>
                    </div>
                    <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Tipe Soal</label>
                          <select value={soalConfig.type} onChange={(e) => setSoalConfig({...soalConfig, type: e.target.value as QuestionType})} className="w-full px-3 py-2 border border-slate-300 rounded text-xs outline-none focus:border-blue-600">{Object.values(QuestionType).map(v => <option key={v} value={v}>{v}</option>)}</select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Jumlah (Butir)</label>
                          <input type="number" value={soalConfig.count} onChange={(e) => setSoalConfig({...soalConfig, count: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-slate-300 rounded text-xs outline-none focus:border-blue-600" min="1" max="50" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Kesulitan</label>
                            <select value={soalConfig.difficulty} onChange={(e) => setSoalConfig({...soalConfig, difficulty: e.target.value as DifficultyLevel})} className="w-full px-3 py-2 border border-slate-300 rounded text-xs outline-none focus:border-blue-600">{Object.values(DifficultyLevel).map(v => <option key={v} value={v}>{v}</option>)}</select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Level Kognitif</label>
                            <select value={soalConfig.cognitive} onChange={(e) => setSoalConfig({...soalConfig, cognitive: e.target.value as CognitiveLevel})} className="w-full px-3 py-2 border border-slate-300 rounded text-xs outline-none focus:border-blue-600">{Object.values(CognitiveLevel).map(v => <option key={v} value={v}>{v}</option>)}</select>
                          </div>
                        </div>
                        <button onClick={startGenerateSoal} className="w-full mt-4 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold py-3 rounded text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition"><Sparkles size={14} /> Proses Dengan AI</button>
                    </div>
                 </div>
               ) : isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500">
                     <Loader2 size={40} className="animate-spin text-[#1e3a8a]" />
                     <p className="text-xs font-bold uppercase tracking-[0.2em]">Memproses Data...</p>
                  </div>
               ) : (
                  <div id="extra-content" className="bg-white p-10 border border-slate-300 min-h-full mx-auto max-w-4xl text-black" dangerouslySetInnerHTML={{ __html: modalContent }} />
               )}
            </div>

            {!isConfiguringSoal && !isGenerating && modalContent && (
              <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-white">
                <button onClick={() => setIsConfiguringSoal(true)} className="text-[10px] font-bold text-[#1e3a8a] hover:underline uppercase tracking-widest">Atur Ulang</button>
                <div className="flex gap-2">
                  <button onClick={() => handleCopyToDocs('extra-content')} className="bg-slate-100 border border-slate-200 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Copy size={14} /> Salin
                  </button>
                  <button onClick={() => handleDownloadPDF('extra-content', `OUTPUT_${activeModal.toUpperCase()}.pdf`)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Download size={14} /> PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RPMPreview;