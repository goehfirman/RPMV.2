import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FormData, GeneratedContent, Subject, ClassLevel, RPMResult } from "../types";
import { CP_REF } from "../data/cpReference";

// Helper: Get AI Instance dengan Prioritas Logic
// 1. Parameter (dari State React)
// 2. LocalStorage (User saved)
// 3. Environment Variable (Vercel/Vite)
const getAI = (providedKey?: string) => {
  let finalKey = providedKey;

  // Cek LocalStorage jika parameter kosong
  if (!finalKey || finalKey.trim() === '') {
    finalKey = localStorage.getItem('gemini_api_key') || '';
  }

  // Cek Environment Variable jika masih kosong (Vite prefix VITE_)
  if (!finalKey || finalKey.trim() === '') {
    // Cast import.meta to any to avoid TS error
    finalKey = (import.meta as any).env.VITE_GEMINI_API_KEY || '';
  }

  // Jika tetap kosong, lempar error spesifik
  if (!finalKey || finalKey.trim() === '') {
    throw new Error("API_KEY_MISSING");
  }

  return new GoogleGenAI({ apiKey: finalKey });
};

const generatedContentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    studentCharacteristics: { type: Type.STRING, description: "Deskripsi karakteristik siswa berdasarkan usia/kelas. Return as HTML Unordered List (<ul><li>...</li></ul>)." },
    crossDisciplinary: { type: Type.STRING, description: "Hubungan dengan mata pelajaran lain. Return as HTML Unordered List (<ul><li>...</li></ul>)." },
    topics: { type: Type.STRING, description: "Topik pembelajaran spesifik yang diturunkan dari materi. Return as HTML Unordered List (<ul><li>...</li></ul>)." },
    partnerships: { type: Type.STRING, description: "Kemitraan pembelajaran (orang tua, ahli, komunitas). Return as HTML Unordered List (<ul><li>...</li></ul>)." },
    environment: { type: Type.STRING, description: "Pengaturan lingkungan belajar. Return as HTML Unordered List (<ul><li>...</li></ul>)." },
    digitalTools: { type: Type.STRING, description: "Rekomendasi perangkat digital dan cara penggunaannya. Return as HTML Unordered List (<ul><li>...</li></ul>)." },
    learningExperiences: {
      type: Type.OBJECT,
      properties: {
        memahami: { type: Type.STRING, description: "Kegiatan fase 'Memahami' (Pembukaan). Return as HTML Ordered List (<ol><li>...</li></ol>)." },
        mengaplikasi: { type: Type.STRING, description: "Kegiatan fase 'Mengaplikasi' (Inti) sesuai sintaks pedagogi. Return as HTML Ordered List (<ol><li>...</li></ol>)." },
        refleksi: { type: Type.STRING, description: "Kegiatan fase 'Refleksi' (Penutup). Return as HTML Ordered List (<ol><li>...</li></ol>)." },
      },
      required: ["memahami", "mengaplikasi", "refleksi"]
    },
    assessments: {
      type: Type.OBJECT,
      properties: {
        initial: { type: Type.STRING, description: "Ide asesmen diagnostik. Return as HTML Unordered List (<ul><li>...</li></ul>)." },
        process: { type: Type.STRING, description: "Asesmen formatif (rubrik, observasi). Return as HTML Unordered List (<ul><li>...</li></ul>)." },
        final: { type: Type.STRING, description: "Asesmen sumatif (produk, portofolio). Return as HTML Unordered List (<ul><li>...</li></ul>)." },
      },
      required: ["initial", "process", "final"]
    },
    rubric: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Judul rubrik penilaian." },
        rows: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              aspect: { type: Type.STRING, description: "Kriteria/aspek penilaian." },
              score4: { type: Type.STRING, description: "Deskripsi skor 4 (Sangat Baik)." },
              score3: { type: Type.STRING, description: "Deskripsi skor 3 (Baik)." },
              score2: { type: Type.STRING, description: "Deskripsi skor 2 (Cukup)." },
              score1: { type: Type.STRING, description: "Deskripsi skor 1 (Perlu Bimbingan)." },
            },
            required: ["aspect", "score4", "score3", "score2", "score1"]
          }
        }
      },
      required: ["title", "rows"]
    }
  },
  required: ["studentCharacteristics", "crossDisciplinary", "topics", "partnerships", "environment", "digitalTools", "learningExperiences", "assessments", "rubric"]
};

// Schema sederhana untuk konten tambahan (LKPD/Soal) yang mengembalikan HTML string
const documentContentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    htmlContent: { type: Type.STRING, description: "Full HTML content of the document." }
  },
  required: ["htmlContent"]
};

// Helper: Wait function for delay
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Wrapper to retry API calls on 429 errors
const generateWithRetry = async (ai: GoogleGenAI, params: any, maxRetries = 5) => {
  let delay = 3000; // Start delay at 3s to be safe
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const msg = String(error?.message || '').toLowerCase();
      const status = error?.status || error?.code;
      
      const isRateLimit = 
        status === 429 || 
        msg.includes('429') || 
        msg.includes('quota') || 
        msg.includes('exhausted') ||
        String(status).includes('RESOURCE_EXHAUSTED');
      
      const isServerOverload = status === 503;

      if ((isRateLimit || isServerOverload) && i < maxRetries - 1) {
        console.warn(`Gemini API busy (Attempt ${i + 1}/${maxRetries}). Retrying in ${delay}ms...`);
        await wait(delay);
        delay *= 2; // Exponential backoff
        continue;
      }
      
      // Jika retry habis dan error adalah rate limit, lempar error khusus
      if (isRateLimit) {
        throw new Error("QUOTA_EXCEEDED");
      }
      
      throw error;
    }
  }
  throw new Error("API call failed after max retries");
};

export const generateRPM = async (data: FormData, apiKey: string): Promise<GeneratedContent> => {
  // Logic pengambilan key dipindahkan ke getAI()
  let ai;
  try {
    ai = getAI(apiKey);
  } catch (e: any) {
    if (e.message === 'API_KEY_MISSING') {
      throw new Error("API Key belum diatur. Silakan masukkan di formulir atau cek konfigurasi.");
    }
    throw e;
  }

  const pedagogies = data.meetings.map(m => `Pertemuan ${m.meetingNumber}: ${m.pedagogy}`).join(", ");
  const dimensions = data.dimensions.join(", ");

  const prompt = `
    Bertindaklah sebagai ahli kurikulum SD Indonesia. Buatlah konten Rencana Pembelajaran Mendalam (RPM) untuk SDN Pekayon 09.
    
    Data Input:
    - Kelas: ${data.classLevel}
    - Mapel: ${data.subject}
    - Materi: ${data.materi}
    - CP: ${data.cp}
    - TP: ${data.tp}
    - Dimensi Profil Pelajar: ${dimensions}
    - Praktik Pedagogis per Pertemuan: ${pedagogies}

    Tugas:
    Lengkapi bagian-bagian rencana pembelajaran berikut dengan bahasa Indonesia formal.
    
    Format output:
    1. Karakteristik Siswa: Deskripsikan karakteristik umum siswa kelas ${data.classLevel} SD.
    2. Lintas Disiplin Ilmu: Hubungkan materi ini dengan mata pelajaran lain.
    3. Topik Pembelajaran: Breakdown materi menjadi topik spesifik.
    4. Kemitraan: Pihak luar yang dilibatkan.
    5. Lingkungan: Pengaturan kelas.
    6. Digital: Tools digital yang relevan (Quizizz, Canva, dll).
    7. Pengalaman Belajar:
       - Memahami (Awal): Kegiatan pemantik bermakna.
       - Mengaplikasi (Inti): Rangkaian kegiatan inti SESUAI sintaks ${pedagogies}.
       - Refleksi (Penutup): Kegiatan refleksi.
    8. Asesmen: Awal, Proses, dan Akhir.
    9. Rubrik Penilaian: Tabel rubrik skala 1-4.
  `;

  try {
    const response = await generateWithRetry(ai, {
      model: "gemini-3-flash-preview", // Changed to Flash for better quota efficiency
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: generatedContentSchema,
      }
    });

    return JSON.parse(response.text || "{}") as GeneratedContent;
  } catch (error) {
    console.error("Error generating RPM:", error);
    throw error;
  }
};

export const generateLKPD = async (data: RPMResult, apiKey: string): Promise<string> => {
  let ai;
  try {
    ai = getAI(apiKey);
  } catch (e: any) {
    return `<div style="padding: 20px; color: red; border: 1px solid red;">API Key tidak ditemukan (Code: MISSING).</div>`;
  }

  const prompt = `
    Buatkan Lembar Kerja Peserta Didik (LKPD) yang menarik dan siap cetak untuk siswa SD.
    
    Data:
    - Kelas: ${data.classLevel}
    - Mata Pelajaran: ${data.subject}
    - Materi: ${data.materi}
    - Tujuan Pembelajaran: ${data.tp}

    Instruksi Output:
    Kembalikan output sebagai string HTML lengkap (tanpa tag <html> atau <body>, cukup div wrapper).
    Gunakan styling inline CSS sederhana agar terlihat rapi (border, padding, tabel).
    
    Struktur LKPD:
    1. Kop/Header (Judul LKPD, Nama Kelompok/Siswa, Kelas, Tanggal).
    2. Petunjuk Belajar (Bahasa yang ramah anak).
    3. Alat dan Bahan (Jika perlu).
    4. Aktivitas Utama (Berikan tempat kosong/garis titik-titik untuk siswa menulis jawaban).
       - Buat pertanyaan pemantik atau tabel pengamatan yang relevan dengan materi.
    5. Refleksi Singkat (Emoji perasaan setelah belajar).
  `;

  try {
    const response = await generateWithRetry(ai, {
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: documentContentSchema
      }
    });
    const result = JSON.parse(response.text || "{}");
    return result.htmlContent || "<p>Gagal membuat LKPD.</p>";
  } catch (error: any) {
    console.error("Error generating LKPD:", error);
    if (error.message === "QUOTA_EXCEEDED" || String(error?.message).includes('429')) {
        return `<div style="padding: 20px; text-align: center; color: #dc2626; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
           <h3 style="font-weight: bold; margin-bottom: 8px;">Kuota Habis (Limit Tercapai)</h3>
           <p>Maaf, kunci API Anda telah mencapai batas penggunaan Google. Silakan tunggu 1-2 menit atau ganti API Key.</p>
        </div>`;
    }
    return "<p>Terjadi kesalahan saat membuat LKPD.</p>";
  }
};

export const generateSoal = async (data: RPMResult, apiKey: string): Promise<string> => {
  let ai;
  try {
    ai = getAI(apiKey);
  } catch (e: any) {
    return `<div style="padding: 20px; color: red; border: 1px solid red;">API Key tidak ditemukan (Code: MISSING).</div>`;
  }

  const prompt = `
    Buatkan instrumen penilaian pengetahuan (Soal Latihan) untuk siswa SD.
    
    Data:
    - Kelas: ${data.classLevel}
    - Mapel: ${data.subject}
    - Materi: ${data.materi}
    - TP: ${data.tp}

    Instruksi Output:
    Kembalikan output sebagai string HTML lengkap.
    
    Struktur Dokumen:
    1. Judul: "Latihan Soal - [Nama Materi]"
    2. Bagian A: 5 Soal Pilihan Ganda (Berikan opsi A, B, C, D).
    3. Bagian B: 5 Soal Isian Singkat / Uraian (HOTS - Higher Order Thinking Skills).
    4. Kunci Jawaban (Letakkan di bagian paling bawah, pisahkan dengan garis putus-putus "Gunting di sini").
  `;

  try {
    const response = await generateWithRetry(ai, {
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: documentContentSchema
      }
    });
    const result = JSON.parse(response.text || "{}");
    return result.htmlContent || "<p>Gagal membuat Soal.</p>";
  } catch (error: any) {
    console.error("Error generating Soal:", error);
    if (error.message === "QUOTA_EXCEEDED" || String(error?.message).includes('429')) {
        return `<div style="padding: 20px; text-align: center; color: #dc2626; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
           <h3 style="font-weight: bold; margin-bottom: 8px;">Kuota Habis (Limit Tercapai)</h3>
           <p>Maaf, kunci API Anda telah mencapai batas penggunaan Google. Silakan tunggu 1-2 menit atau ganti API Key.</p>
        </div>`;
    }
    return "<p>Terjadi kesalahan saat membuat Soal.</p>";
  }
};

const getPhase = (classLevel: string): 'FaseA' | 'FaseB' | 'FaseC' => {
  if (classLevel === ClassLevel.Kelas1 || classLevel === ClassLevel.Kelas2) return 'FaseA';
  if (classLevel === ClassLevel.Kelas3 || classLevel === ClassLevel.Kelas4) return 'FaseB';
  return 'FaseC';
};

export const getFieldSuggestions = async (
  field: 'cp' | 'tp' | 'materi',
  subject: Subject,
  classLevel: ClassLevel,
  apiKey: string,
  currentContext: string = "" 
): Promise<string[]> => {
    let ai;
    try {
      ai = getAI(apiKey);
    } catch (e) {
      return ["API Key belum diatur. Masukkan Key di form atau cek Env Var."];
    }

    const phase = getPhase(classLevel);
    const officialCP = CP_REF[subject]?.[phase];

    let promptContext = "";
    
    // Penanganan khusus Koding dan KA Fase C (Kelas 5 & 6)
    if (subject === Subject.KodingDanKA && phase === 'FaseC') {
        promptContext = `
             ${field === 'cp' ? 'Gunakan referensi CP Fase C ini: ' + officialCP : ''}
             ${field === 'materi' ? `Sajikan 5 pilihan materi dari daftar referensi Koding.` : ''}
             ${field === 'tp' ? `Sajikan 5 pilihan TP yang sesuai.` : ''}
        `;
    } else {
        if (field === 'cp') {
            promptContext = officialCP ? `Referensi CP RESMI: "${officialCP}". Buat 5 variasi CP.` : `Buat 5 opsi CP sesuai Kurikulum Merdeka.`;
        } else if (field === 'tp') {
            promptContext = currentContext ? `Turunkan 5 TP dari CP ini: "${currentContext}".` : `Buat 5 TP relevan.`;
        } else if (field === 'materi') {
            promptContext = `Berdasarkan CP/TP: "${currentContext}", sarankan 5 topik materi pokok.`;
        }
    }

    const prompt = `Berikan 5 opsi ${field} untuk mapel ${subject} Kelas ${classLevel} SD. ${promptContext} Output wajib JSON: { "options": ["opsi 1", "opsi 2", ...] }`;

    try {
        const response = await generateWithRetry(ai, {
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        options: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        const result = JSON.parse(response.text || "{}");
        return result.options || [];
    } catch (e: any) {
        console.error(e);
        if (e.message === "QUOTA_EXCEEDED") {
            return ["⚠️ Kuota API Habis. Tunggu sebentar."];
        }
        return ["Gagal mengambil saran (Coba lagi nanti)."];
    }
};