import React, { useRef, useState } from 'react';
import { RPMResult, QuestionType, DifficultyLevel, CognitiveLevel, SoalConfig } from '../types';
import { Copy, Download, ArrowLeft, FileText, ClipboardList, X, Loader2, Sparkles, Sliders } from 'lucide-react';
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
  
  // Konfigurasi Soal State
  const [soalConfig, setSoalConfig] = useState<SoalConfig>({
    type: QuestionType.PG,
    count: 5,
    difficulty: DifficultyLevel.Sedang,
    cognitive: CognitiveLevel.MOTS
  });
  
  const [isConfiguringSoal, setIsConfiguringSoal] = useState(false);

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
      console.error(err);
      alert('Gagal menyalin otomatis.');
    }
  };

  const handleDownloadPDF = (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if(!element) return;
    const opt = {
      margin: [10, 10, 20, 10] as [number, number, number, number], 
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };
    html2pdf().from(element).set(opt).toPdf().get('pdf').then((pdf: any) => {
      const totalPages = pdf.internal.getNumberOfPages();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`RPM ${data.subject} - Kelas ${data.classLevel}`, 10, pageHeight - 10); 
        pdf.text(`Halaman ${i} dari ${totalPages}`, pageWidth - 30, pageHeight - 10); 
      }
      pdf.save(filename);
    });
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
      setModalContent('<p class="text-red-500">Gagal menghasilkan soal. Coba lagi nanti.</p>');
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
      setModalContent('<p class="text-red-500">Gagal menghasilkan konten.</p>');
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
      {/* Action Bar */}
      <div className="sticky top-4 z-40 flex flex-wrap gap-3 justify-between items-center bg-white/80 backdrop-blur-xl border border-purple-200 p-4 rounded-xl shadow-lg shadow-purple-200/50 mb-8 no-print text-slate-900">
        <button onClick={onReset} className="flex items-center gap-2 text-slate-500 hover:text-purple-600 font-bold transition uppercase text-xs tracking-wider">
          <ArrowLeft size={16} /> Ubah Data
        </button>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleGenerateExtra('lkpd')} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition text-indigo-700 shadow-sm">
             <FileText size={16} /> Buat LKPD
          </button>
          <button onClick={() => handleGenerateExtra('soal')} className="flex items-center gap-2 bg-pink-50 border border-pink-200 hover:bg-pink-100 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition text-pink-700 shadow-sm">
             <ClipboardList size={16} /> Buat Soal
          </button>
          <div className="w-px h-8 bg-slate-300 mx-1 hidden sm:block"></div>
          <button onClick={() => handleCopyToDocs('rpm-content')} className="flex items-center gap-2 bg-white border border-purple-200 hover:bg-purple-50 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition text-purple-700 shadow-sm">
            <Copy size={16} />
          </button>
          <button onClick={() => handleDownloadPDF('rpm-content', downloadFileName)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white border border-purple-600 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition shadow-md shadow-purple-500/30">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div id="rpm-content" ref={contentRef} className="bg-white p-8 md:p-12 shadow-2xl min-h-screen border border-slate-200">
        <style>
            {`
              #rpm-content { font-family: 'Inter', sans-serif; font-size: 10pt; line-height: 1.5; color: #000000 !important; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 2px solid #000000; background-color: #fff; }
              th { background-color: #000000; color: white; font-weight: 700; text-transform: uppercase; font-size: 9pt; padding: 12px 14px; text-align: left; letter-spacing: 0.5px; }
              td { padding: 12px 14px; border-bottom: 1px solid #000000; vertical-align: top; font-size: 10pt; color: #000000; }
              tr:nth-child(even) td { background-color: #f8fafc; }
              tr:last-child td { border-bottom: none; }
              .section-header { display: flex; align-items: center; gap: 12px; margin-top: 30px; margin-bottom: 15px; border-bottom: 3px solid #000000; padding-bottom: 8px; }
              .section-number { background-color: #000000; color: white; font-weight: 800; font-size: 12pt; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
              .section-title-text { font-weight: 800; font-size: 13pt; color: #000000; text-transform: uppercase; letter-spacing: 1px; }
              .label-cell { font-weight: 700; color: #000000; background-color: #f1f5f9; width: 25%; border-right: 1px solid #000000; }
              .header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 35px; padding-bottom: 25px; border-bottom: 5px solid #000000; }
            `}
        </style>

        <div className="header-container">
            <div style={{ width: '15%', display: 'flex', justifyContent: 'flex-start' }}>
                <img src="https://i.ibb.co.com/1fQ81J6v/LOGO-PEKAYON-09.jpg" alt="Logo" crossOrigin="anonymous" style={{ height: '80px' }} />
            </div>
            <div style={{ width: '70%', textAlign: 'center' }}>
                <h1 style={{ fontWeight: '900', fontSize: '17pt', textTransform: 'uppercase' }}>RPM SDN Pekayon 09</h1>
                <p>Jakarta Timur</p>
            </div>
            <div style={{ width: '15%', display: 'flex', justifyContent: 'flex-end' }}>
                <img src="https://i.ibb.co.com/fz9ttjq6/Logo-of-Ministry-of-Education-and-Culture-of-Republic-of-Indonesia-svg.png" alt="Kemendikbud" crossOrigin="anonymous" style={{ height: '80px' }} />
            </div>
        </div>

        <div className="section-header">
            <div className="section-number">1</div>
            <div className="section-title-text">Identitas</div>
        </div>
        <table>
          <tbody>
            <tr><td className="label-cell">Mata Pelajaran</td><td>{data.subject}</td><td className="label-cell">Kelas</td><td>{data.classLevel}</td></tr>
            <tr><td className="label-cell">Materi</td><td colSpan={3}>{data.materi}</td></tr>
          </tbody>
        </table>

        {/* ... RPM Details Rendered Here (truncated for brevity but full in original) ... */}
        <div dangerouslySetInnerHTML={{ __html: data.studentCharacteristics }}></div>

        <div className="signature-box" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px' }}>
            <div style={{ textAlign: 'center', width: '40%' }}>
                <p>Mengetahui,</p><p>Kepala SDN Pekayon 09</p>
                <div style={{ height: '100px' }}></div>
                <p>{data.principalName}</p>
            </div>
            <div style={{ textAlign: 'center', width: '40%' }}>
                <p>Jakarta, {formatDate(data.documentDate)}</p><p>Guru Kelas</p>
                <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {shouldShowSignature && <img src={SIGNATURE_URL} alt="TTD" crossOrigin="anonymous" style={{ height: '80px' }} />}
                </div>
                <p>{data.teacherName}</p>
            </div>
        </div>
      </div>

      {/* MODAL SYSTEM */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-purple-100 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {activeModal === 'lkpd' ? <FileText size={20} /> : <ClipboardList size={20} />}
                {activeModal === 'lkpd' ? 'Generator LKPD' : 'Generator Soal sesuai RPM'}
              </h3>
              <button onClick={() => setActiveModal('none')} className="p-2 hover:bg-slate-200 rounded-full">
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
               {activeModal === 'soal' && isConfiguringSoal ? (
                 /* CONFIGURATION UI FOR SOAL */
                 <div className="max-w-xl mx-auto space-y-6 animate-fade-in-up">
                    <div className="bg-white p-8 rounded-xl border border-purple-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-6 text-purple-600">
                        <Sliders size={20} />
                        <h4 className="font-bold uppercase tracking-widest text-sm">Konfigurasi Soal</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Bentuk Soal</label>
                          <select 
                            value={soalConfig.type} 
                            onChange={(e) => setSoalConfig({...soalConfig, type: e.target.value as QuestionType})}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-purple-400"
                          >
                            {Object.values(QuestionType).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Jml. Soal (Butir)</label>
                          <input 
                            type="number" 
                            value={soalConfig.count} 
                            onChange={(e) => setSoalConfig({...soalConfig, count: parseInt(e.target.value)})}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-purple-400"
                            min="1" max="50"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Tingkat Kesulitan</label>
                            <select 
                              value={soalConfig.difficulty} 
                              onChange={(e) => setSoalConfig({...soalConfig, difficulty: e.target.value as DifficultyLevel})}
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-purple-400"
                            >
                              {Object.values(DifficultyLevel).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">HOTS / LOTS</label>
                            <select 
                              value={soalConfig.cognitive} 
                              onChange={(e) => setSoalConfig({...soalConfig, cognitive: e.target.value as CognitiveLevel})}
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-purple-400"
                            >
                              {Object.values(CognitiveLevel).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                        </div>

                        <button 
                          onClick={startGenerateSoal}
                          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition uppercase text-xs tracking-widest"
                        >
                          <Sparkles size={16} /> Preview Soal
                        </button>
                      </div>
                    </div>
                 </div>
               ) : isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-purple-600">
                     <Loader2 size={48} className="animate-spin" />
                     <p className="font-medium animate-pulse">AI sedang berpikir...</p>
                  </div>
               ) : (
                  <div id="extra-content" className="bg-white p-8 shadow-lg border border-slate-200 min-h-full">
                     <div dangerouslySetInnerHTML={{ __html: modalContent }} />
                  </div>
               )}
            </div>

            {/* Modal Footer */}
            {!isGenerating && !isConfiguringSoal && modalContent && (
              <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white">
                <button 
                  onClick={() => setIsConfiguringSoal(true)}
                  className="text-xs font-bold text-purple-600 hover:underline uppercase tracking-widest px-4"
                >
                  Atur Ulang
                </button>
                <div className="flex gap-3">
                  <button onClick={() => handleCopyToDocs('extra-content')} className="px-5 py-2.5 bg-white border border-purple-200 text-purple-700 font-bold text-xs rounded-lg hover:bg-purple-50 flex items-center gap-2">
                    <Copy size={16} /> Salin
                  </button>
                  <button onClick={() => handleDownloadPDF('extra-content', `HASIL_${activeModal.toUpperCase()}.pdf`)} className="px-5 py-2.5 bg-purple-600 text-white font-bold text-xs rounded-lg hover:bg-purple-700 flex items-center gap-2">
                    <Download size={16} /> Unduh PDF
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