import React, { useRef, useState } from 'react';
import { RPMResult, QuestionType, DifficultyLevel, CognitiveLevel, SoalConfig } from '../types';
import { Copy, Download, ArrowLeft, FileText, ClipboardList, X, Loader2, Sparkles, Sliders, Image as ImageIcon } from 'lucide-react';
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
      alert("Konten berhasil disalin!");
    } catch (err) {
      alert('Gagal menyalin otomatis. Silakan seleksi manual.');
    }
  };

  const handleDownloadPDF = (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if(!element) return;

    const opt = {
      margin:       [10, 10, 20, 10] as [number, number, number, number], 
      filename:     filename,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true }, 
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf()
      .from(element)
      .set(opt)
      .toPdf()
      .get('pdf')
      .then((pdf: any) => {
        const totalPages = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          const leftText = `RPM ${data.subject} Kelas ${data.classLevel}`;
          pdf.text(leftText, 10, pageHeight - 10); 
          const rightText = `Halaman ${i} dari ${totalPages}`;
          pdf.text(rightText, pageWidth - 30, pageHeight - 10); 
        }
        pdf.save(filename);
      });
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
        let content = '';
        if (type === 'lkpd') content = await generateLKPD(data, apiKey);
        setModalContent(content);
    } catch (e) {
        setModalContent('<p class="text-red-500 text-center font-bold">Gagal menghasilkan konten. Pastikan kuota API mencukupi.</p>');
    } finally {
        setIsGenerating(false);
    }
  };

  const startGenerateSoal = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return alert("API Key tidak ditemukan.");

    setIsGenerating(true);
    setIsConfiguringSoal(false);
    setModalContent('');

    try {
      const content = await generateSoal(data, apiKey, soalConfig);
      setModalContent(content);
    } catch (e) {
      setModalContent('<p class="text-red-500 text-center font-bold">Gagal menghasilkan soal. Pastikan kuota API mencukupi.</p>');
    } finally {
      setIsGenerating(false);
    }
  };

  const TARGET_TEACHER = "Teguh Firmansyah Apriliana, S.Pd";
  const SIGNATURE_URL = "https://i.ibb.co.com/KctJSrRC/ttd-gue.png";
  const shouldShowSignature = data.teacherName.trim() === TARGET_TEACHER;
  const downloadFileName = `RPM_${data.subject}_Kelas ${data.classLevel}_${data.teacherName}_${data.documentDate}.pdf`;

  return (
    <div className="max-w-5xl mx-auto pb-20 relative">
      {/* Action Bar - Formal Dark Navy */}
      <div className="sticky top-4 z-40 flex flex-wrap gap-3 justify-between items-center bg-[#1e293b] text-white p-4 rounded shadow-lg mb-8 no-print">
        <button onClick={onReset} className="flex items-center gap-2 hover:bg-slate-700 px-3 py-2 rounded transition font-bold uppercase text-xs tracking-wider">
          <ArrowLeft size={16} /> Kembali
        </button>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleGenerateExtra('lkpd')} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition">
             <FileText size={16} /> LKPD
          </button>
          <button onClick={() => handleGenerateExtra('soal')} className="bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition">
             <ClipboardList size={16} /> Soal
          </button>
          <div className="w-px h-8 bg-slate-600 mx-1 hidden sm:block"></div>
          <button onClick={() => handleCopyToDocs('rpm-content')} className="bg-white text-slate-900 hover:bg-slate-100 px-4 py-2 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition">
            <Copy size={16} /> Salin
          </button>
          <button onClick={() => handleDownloadPDF('rpm-content', downloadFileName)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Document Content - Clean Paper Look */}
      <div id="rpm-content" ref={contentRef} className="bg-white p-12 shadow-sm border border-slate-200 min-h-screen text-black">
        <style>
            {`
              #rpm-content { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #000; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid black; }
              th { background-color: #f1f5f9; color: black; font-weight: bold; border: 1px solid black; padding: 8px; text-align: left; text-transform: uppercase; font-size: 10pt; }
              td { padding: 8px; border: 1px solid black; vertical-align: top; font-size: 11pt; }
              .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double black; padding-bottom: 10px; margin-bottom: 20px; }
              .section-title { font-weight: bold; text-transform: uppercase; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid black; display: inline-block; padding-bottom: 2px; }
              ul, ol { margin: 0; padding-left: 20px; }
              img { max-width: 100%; height: auto; display: block; margin: 10px auto; }
            `}
        </style>

        {/* Kop Surat Formal */}
        <div className="header-container">
            <div style={{ width: '15%' }}><img src="https://i.ibb.co.com/1fQ81J6v/LOGO-PEKAYON-09.jpg" alt="Logo" style={{ height: '70px' }} /></div>
            <div style={{ width: '70%', textAlign: 'center' }}>
                <h1 style={{ fontWeight: 'bold', fontSize: '16pt', textTransform: 'uppercase', marginBottom: '5px' }}>SDN Pekayon 09 Jakarta Timur</h1>
                <p style={{ fontSize: '10pt', margin: 0 }}>Jl. Pendidikan Rt 04 Rw 09 Kel. Pekayon Kec. Pasar Rebo</p>
                <h2 style={{ fontWeight: 'bold', fontSize: '14pt', marginTop: '15px', textDecoration: 'underline' }}>RENCANA PEMBELAJARAN MENDALAM</h2>
            </div>
            <div style={{ width: '15%', textAlign: 'right' }}><img src="https://i.ibb.co.com/fz9ttjq6/Logo-of-Ministry-of-Education-and-Culture-of-Republic-of-Indonesia-svg.png" alt="Logo" style={{ height: '70px' }} /></div>
        </div>

        {/* Content Body */}
        <div className="section-title">I. Identitas Modul</div>
        <table>
          <tbody>
            <tr><td width="20%">Satuan Pendidikan</td><td>SDN Pekayon 09</td><td width="20%">Mata Pelajaran</td><td>{data.subject}</td></tr>
            <tr><td>Kelas / Semester</td><td>{data.classLevel} / {data.semester}</td><td>Alokasi Waktu</td><td>{data.duration}</td></tr>
          </tbody>
        </table>

        <div className="section-title">II. Komponen Inti</div>
        <table>
            <tbody>
                <tr><td width="25%">Capaian Pembelajaran</td><td>{data.cp}</td></tr>
                <tr><td>Tujuan Pembelajaran</td><td style={{whiteSpace: 'pre-line'}}>{data.tp}</td></tr>
                <tr><td>Materi Pokok</td><td>{data.materi}</td></tr>
            </tbody>
        </table>

        {/* Dynamic Content */}
        <div className="section-title">III. Kegiatan Pembelajaran</div>
        <table>
            <thead><tr><th>Tahap</th><th>Deskripsi Kegiatan</th></tr></thead>
            <tbody>
                <tr><td><strong>Pendahuluan</strong></td><td dangerouslySetInnerHTML={{ __html: data.learningExperiences.memahami }}></td></tr>
                <tr><td><strong>Inti</strong></td><td dangerouslySetInnerHTML={{ __html: data.learningExperiences.mengaplikasi }}></td></tr>
                <tr><td><strong>Penutup</strong></td><td dangerouslySetInnerHTML={{ __html: data.learningExperiences.refleksi }}></td></tr>
            </tbody>
        </table>

        <div className="section-title">IV. Asesmen</div>
        <table>
            <thead><tr><th>Diagnostik</th><th>Formatif</th><th>Sumatif</th></tr></thead>
            <tbody>
                <tr>
                    <td dangerouslySetInnerHTML={{ __html: data.assessments.initial }}></td>
                    <td dangerouslySetInnerHTML={{ __html: data.assessments.process }}></td>
                    <td dangerouslySetInnerHTML={{ __html: data.assessments.final }}></td>
                </tr>
            </tbody>
        </table>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', pageBreakInside: 'avoid' }}>
            <div style={{ textAlign: 'center', width: '40%' }}>
                <p>Mengetahui,</p><p>Kepala SDN Pekayon 09</p>
                <div style={{ height: '80px' }}></div>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{data.principalName}</p>
                <p>NIP. {data.principalNIP}</p>
            </div>
            <div style={{ textAlign: 'center', width: '40%' }}>
                <p>Jakarta, {formatDate(data.documentDate)}</p><p>Guru Kelas</p>
                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {shouldShowSignature && <img src={SIGNATURE_URL} alt="TTD" style={{ height: '70px' }} />}
                </div>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{data.teacherName}</p>
                <p>NIP. {data.teacherNIP}</p>
            </div>
        </div>
      </div>

      {/* Modal - Formal Style */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                 {activeModal === 'lkpd' ? <FileText size={18} /> : <ClipboardList size={18} />}
                 {activeModal === 'lkpd' ? 'Generator LKPD (Bergambar)' : 'Generator Instrumen Soal (Bergambar)'}
              </h3>
              <button onClick={() => { setActiveModal('none'); setModalContent(''); setIsConfiguringSoal(false); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 custom-scrollbar">
               {activeModal === 'soal' && isConfiguringSoal ? (
                 <div className="max-w-md mx-auto bg-white p-6 rounded border border-slate-200 shadow-sm animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 text-slate-700">
                        <Sliders size={18} />
                        <h4 className="text-xs font-bold uppercase tracking-widest">Konfigurasi Instrumen & Visual</h4>
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
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded text-[10px] text-blue-800 flex items-start gap-2">
                            <ImageIcon size={14} className="mt-0.5" />
                            <p>Sistem akan otomatis menghasilkan <strong>gambar ilustrasi (stimulus)</strong> yang relevan untuk soal yang membutuhkan visualisasi.</p>
                        </div>
                        <button onClick={startGenerateSoal} className="w-full mt-4 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold py-3 rounded text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition"><Sparkles size={14} /> Proses Dengan AI Visual</button>
                    </div>
                 </div>
               ) : isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center gap-6 text-slate-500">
                     <div className="relative">
                        <Loader2 size={48} className="animate-spin text-[#1e3a8a]" />
                        <Sparkles size={20} className="absolute -top-2 -right-2 text-yellow-500 animate-pulse" />
                     </div>
                     <div className="text-center space-y-2">
                        <p className="text-sm font-bold uppercase tracking-widest text-slate-800">Sedang Menyusun Konten...</p>
                        <p className="text-xs text-slate-400">AI sedang membuat teks dan <span className="text-blue-600 font-bold">menghasilkan gambar ilustrasi</span>.</p>
                        <p className="text-[10px] text-slate-400 italic">(Proses ini mungkin memakan waktu hingga 30 detik)</p>
                     </div>
                  </div>
               ) : (
                  <div id="extra-content" className="bg-white p-10 border border-slate-300 min-h-full mx-auto max-w-4xl text-black shadow-sm" dangerouslySetInnerHTML={{ __html: modalContent }} />
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