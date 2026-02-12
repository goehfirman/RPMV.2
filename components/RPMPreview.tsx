import React, { useRef, useState } from 'react';
import { RPMResult } from '../types';
import { Copy, Download, ArrowLeft, FileText, ClipboardList, X, Loader2 } from 'lucide-react';
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
      alert('Gagal menyalin otomatis. Silakan seleksi manual dan salin.');
    }
  };

  const handleDownloadPDF = (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if(!element) return;

    // Margin: [Top, Left, Bottom, Right] - Bottom agak besar untuk footer
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
          pdf.setTextColor(100, 100, 100); // Abu-abu
          
          // Kiri: RPM <Pelajaran> <Kelas>
          const leftText = `RPM ${data.subject} Kelas ${data.classLevel}`;
          pdf.text(leftText, 10, pageHeight - 10); 

          // Kanan: Halaman X dari Y
          const rightText = `Halaman ${i} dari ${totalPages}`;
          const textWidth = pdf.getStringUnitWidth(rightText) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
          pdf.text(rightText, pageWidth - 10 - textWidth, pageHeight - 10); 
        }
        pdf.save(filename);
      });
  };

  const handleGenerateExtra = async (type: 'lkpd' | 'soal') => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return alert("API Key tidak ditemukan. Harap login ulang.");

    setIsGenerating(true);
    setActiveModal(type);
    setModalContent(''); // Clear previous content

    try {
        let content = '';
        if (type === 'lkpd') {
            content = await generateLKPD(data, apiKey);
        } else {
            content = await generateSoal(data, apiKey);
        }
        setModalContent(content);
    } catch (e) {
        setModalContent('<p class="text-red-500">Gagal menghasilkan konten. Silakan coba lagi.</p>');
    } finally {
        setIsGenerating(false);
    }
  };

  const TARGET_TEACHER = "Teguh Firmansyah Apriliana, S.Pd";
  const SIGNATURE_URL = "https://i.ibb.co.com/KctJSrRC/ttd-gue.png";
  const shouldShowSignature = data.teacherName.trim() === TARGET_TEACHER;

  // Format Nama File: RPM_Pelajaran_Kelas_Nama guru_tanggal dokumen
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
            <span className="hidden sm:inline">Salin</span>
          </button>
          <button onClick={() => handleDownloadPDF('rpm-content', downloadFileName)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white border border-purple-600 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition shadow-md shadow-purple-500/30">
            <Download size={16} />
            <span className="hidden sm:inline">Unduh PDF</span>
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
              ul, ol { margin: 0; padding-left: 20px; color: #000000; }
              ul { list-style-type: disc; }
              ol { list-style-type: decimal; }
              li { margin-bottom: 4px; padding-left: 4px; color: #000000; }
              .header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 35px; padding-bottom: 25px; border-bottom: 5px solid #000000; }
            `}
        </style>

        {/* Kop Surat */}
        <div className="header-container">
            <div style={{ width: '15%', display: 'flex', justifyContent: 'flex-start' }}>
                <img src="https://i.ibb.co.com/1fQ81J6v/LOGO-PEKAYON-09.jpg" alt="Logo SDN Pekayon 09" crossOrigin="anonymous" style={{ height: '80px', width: 'auto' }} />
            </div>
            <div style={{ width: '70%', textAlign: 'center' }}>
                <h1 style={{ fontWeight: '900', fontSize: '17pt', marginBottom: '8px', color: '#000000', textTransform: 'uppercase', lineHeight: '1.2', letterSpacing: '1px' }}>
                  Rencana Pembelajaran Mendalam<br/>(RPM)
                </h1>
                <p style={{ fontSize: '9.5pt', color: '#000000', margin: 0, fontWeight: '500' }}>SDN Pekayon 09 Jakarta Timur</p>
                <p style={{ fontSize: '8.5pt', color: '#000000', margin: '4px 0 0 0' }}>Jl. Pendidikan Rt 04 Rw 09 Kel. Pekayon Kec. Pasar rebo</p>
            </div>
            <div style={{ width: '15%', display: 'flex', justifyContent: 'flex-end' }}>
                <img src="https://i.ibb.co.com/fz9ttjq6/Logo-of-Ministry-of-Education-and-Culture-of-Republic-of-Indonesia-svg.png" alt="Logo Kemendikbud" crossOrigin="anonymous" style={{ height: '80px', width: 'auto' }} />
            </div>
        </div>

        {/* 1. Identitas */}
        <div className="section-header">
            <div className="section-number">1</div>
            <div className="section-title-text">Identitas</div>
        </div>
        <table>
          <tbody>
            <tr>
              <td className="label-cell">Satuan Pendidikan</td>
              <td>SDN Pekayon 09</td>
              <td className="label-cell">Mata Pelajaran</td>
              <td>{data.subject}</td>
            </tr>
            <tr>
              <td className="label-cell">Kelas / Semester</td>
              <td>{data.classLevel} / {data.semester}</td>
              <td className="label-cell">Alokasi Waktu</td>
              <td>{data.duration} ({data.meetingCount} Pertemuan)</td>
            </tr>
          </tbody>
        </table>

        {/* 2. Identifikasi */}
        <div className="section-header">
            <div className="section-number">2</div>
            <div className="section-title-text">Identifikasi</div>
        </div>
        <table>
          <tbody>
            <tr>
              <td className="label-cell" style={{ width: '30%' }}>Karakteristik Siswa</td>
              <td dangerouslySetInnerHTML={{ __html: data.studentCharacteristics }}></td>
            </tr>
            <tr>
              <td className="label-cell">Materi Pelajaran</td>
              <td style={{ whiteSpace: 'pre-line' }}>{data.materi}</td>
            </tr>
            <tr>
              <td className="label-cell">Profil Lulusan</td>
              <td>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {data.dimensions.map((d, i) => (
                        <span key={i} style={{ backgroundColor: '#f1f5f9', color: '#000000', padding: '4px 10px', borderRadius: '4px', fontSize: '9pt', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                            {d}
                        </span>
                    ))}
                  </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 3. Desain Pembelajaran */}
        <div className="section-header">
            <div className="section-number">3</div>
            <div className="section-title-text">Desain Pembelajaran</div>
        </div>
        <table>
          <tbody>
            <tr>
              <td className="label-cell" style={{ width: '30%' }}>Capaian Pembelajaran (CP)</td>
              <td>{data.cp}</td>
            </tr>
            <tr>
              <td className="label-cell">Lintas Disiplin Ilmu</td>
              <td dangerouslySetInnerHTML={{ __html: data.crossDisciplinary }}></td>
            </tr>
            <tr>
              <td className="label-cell">Tujuan Pembelajaran (TP)</td>
              <td style={{ whiteSpace: 'pre-line' }}>{data.tp}</td>
            </tr>
            <tr>
              <td className="label-cell">Topik Pembelajaran</td>
              <td dangerouslySetInnerHTML={{ __html: data.topics }}></td>
            </tr>
            <tr>
              <td className="label-cell">Praktik Pedagogis</td>
              <td>
                <ul style={{ paddingLeft: '20px' }}>
                  {data.meetings.map((m, i) => (
                    <li key={i}>
                        <strong>Pertemuan {m.meetingNumber}:</strong> {m.pedagogy}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
            <tr>
              <td className="label-cell">Kemitraan Pembelajaran</td>
              <td dangerouslySetInnerHTML={{ __html: data.partnerships }}></td>
            </tr>
            <tr>
              <td className="label-cell">Lingkungan Pembelajaran</td>
              <td dangerouslySetInnerHTML={{ __html: data.environment }}></td>
            </tr>
            <tr>
              <td className="label-cell">Pemanfaatan Digital</td>
              <td dangerouslySetInnerHTML={{ __html: data.digitalTools }}></td>
            </tr>
          </tbody>
        </table>

        {/* 4. Pengalaman Belajar */}
        <div className="section-header">
            <div className="section-number">4</div>
            <div className="section-title-text">Pengalaman Belajar</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Tahapan Pembelajaran</th>
              <th style={{ width: '75%' }}>Deskripsi Kegiatan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="label-cell">Awal / Pembukaan (Memahami)</td>
              <td dangerouslySetInnerHTML={{ __html: data.learningExperiences.memahami }}></td>
            </tr>
            <tr>
              <td className="label-cell">Inti (Mengaplikasi)</td>
              <td dangerouslySetInnerHTML={{ __html: data.learningExperiences.mengaplikasi }}></td>
            </tr>
            <tr>
              <td className="label-cell">Penutup (Refleksi)</td>
              <td dangerouslySetInnerHTML={{ __html: data.learningExperiences.refleksi }}></td>
            </tr>
          </tbody>
        </table>

        {/* 5. Asesmen Pembelajaran */}
        <div className="section-header">
            <div className="section-number">5</div>
            <div className="section-title-text">Asesmen Pembelajaran</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '33%' }}>Asesmen Awal</th>
              <th style={{ width: '33%' }}>Asesmen Proses</th>
              <th style={{ width: '34%' }}>Asesmen Akhir</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td dangerouslySetInnerHTML={{ __html: data.assessments.initial }}></td>
              <td dangerouslySetInnerHTML={{ __html: data.assessments.process }}></td>
              <td dangerouslySetInnerHTML={{ __html: data.assessments.final }}></td>
            </tr>
          </tbody>
        </table>

        {/* 6. Rubrik Penilaian */}
        <div className="section-header">
            <div className="section-number">6</div>
            <div className="section-title-text">Rubrik Penilaian: {data.rubric.title}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{width: '20%'}}>Kriteria / Aspek</th>
              <th style={{width: '20%'}}>Sangat Baik (4)</th>
              <th style={{width: '20%'}}>Baik (3)</th>
              <th style={{width: '20%'}}>Cukup (2)</th>
              <th style={{width: '20%'}}>Perlu Bimbingan (1)</th>
            </tr>
          </thead>
          <tbody>
            {data.rubric.rows.map((row, index) => (
              <tr key={index}>
                <td style={{fontWeight: 'bold', backgroundColor: '#f8fafc'}}>{row.aspect}</td>
                <td>{row.score4}</td>
                <td>{row.score3}</td>
                <td>{row.score2}</td>
                <td>{row.score1}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="signature-box" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', pageBreakInside: 'avoid' }}>
            <div style={{ textAlign: 'center', width: '40%' }}>
                <p style={{ margin: 0 }}>Mengetahui,</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Kepala SDN Pekayon 09</p>
                <div style={{ height: '180px' }}></div>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: 0 }}>{data.principalName}</p>
                <p style={{ margin: 0 }}>NIP. {data.principalNIP}</p>
            </div>
            <div style={{ textAlign: 'center', width: '40%' }}>
                <p style={{ margin: 0 }}>Jakarta, {formatDate(data.documentDate)}</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Guru Kelas / Mata Pelajaran</p>
                <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                   {shouldShowSignature && <img src={SIGNATURE_URL} alt="Tanda Tangan" crossOrigin="anonymous" style={{ height: '125px', width: 'auto', marginBottom: '-10px' }} />}
                </div>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: 0 }}>{data.teacherName}</p>
                <p style={{ margin: 0 }}>NIP. {data.teacherNIP}</p>
            </div>
        </div>
      </div>

      {/* Modal untuk LKPD & Soal */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-purple-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                 <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                   {activeModal === 'lkpd' ? <FileText className="text-indigo-600" /> : <ClipboardList className="text-pink-600" />}
                   {activeModal === 'lkpd' ? 'Lembar Kerja Peserta Didik' : 'Soal Evaluasi & Kunci Jawaban'}
                 </h3>
                 <p className="text-xs text-slate-500 mt-1">Dibuat otomatis oleh AI berdasarkan RPM aktif</p>
              </div>
              <button onClick={() => setActiveModal('none')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
               {isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-purple-600">
                     <Loader2 size={48} className="animate-spin" />
                     <p className="font-medium animate-pulse">Sedang menyusun materi...</p>
                  </div>
               ) : (
                  <div id="extra-content" className="bg-white p-8 shadow-lg border border-slate-200 min-h-full">
                     <style>{`
                        #extra-content { font-family: 'Inter', sans-serif; color: black; }
                        #extra-content h1, #extra-content h2, #extra-content h3 { font-weight: bold; margin-bottom: 1rem; }
                        #extra-content p { margin-bottom: 0.5rem; }
                        #extra-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
                        #extra-content th, #extra-content td { border: 1px solid black; padding: 8px; }
                        #extra-content ul, #extra-content ol { margin-left: 20px; margin-bottom: 1rem; }
                     `}</style>
                     <div dangerouslySetInnerHTML={{ __html: modalContent }} />
                  </div>
               )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white rounded-b-2xl">
              <button 
                onClick={() => setActiveModal('none')} 
                className="px-5 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg transition"
              >
                Tutup
              </button>
              {!isGenerating && modalContent && (
                <>
                  <button 
                    onClick={() => handleCopyToDocs('extra-content')} 
                    className="px-5 py-2.5 bg-white border border-purple-200 text-purple-700 font-bold text-sm rounded-lg hover:bg-purple-50 transition shadow-sm flex items-center gap-2"
                  >
                    <Copy size={16} /> Salin
                  </button>
                  <button 
                    onClick={() => handleDownloadPDF('extra-content', `${activeModal === 'lkpd' ? 'LKPD' : 'SOAL'}_${data.subject}.pdf`)} 
                    className="px-5 py-2.5 bg-purple-600 text-white font-bold text-sm rounded-lg hover:bg-purple-700 transition shadow-lg flex items-center gap-2"
                  >
                    <Download size={16} /> Unduh PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RPMPreview;