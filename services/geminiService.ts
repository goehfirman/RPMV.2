import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FormData, GeneratedContent, Subject, ClassLevel, RPMResult, SoalConfig, QuestionType } from "../types";
import { CP_REF } from "../data/cpReference";

const getAI = (providedKey?: string) => {
  let finalKey = providedKey;
  if (!finalKey || finalKey.trim() === '') {
    finalKey = localStorage.getItem('gemini_api_key') || '';
  }
  if (!finalKey || finalKey.trim() === '') {
    finalKey = (import.meta as any).env.VITE_GEMINI_API_KEY || '';
  }
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

const documentContentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    htmlContent: { type: Type.STRING, description: "Full HTML content of the document." }
  },
  required: ["htmlContent"]
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateWithRetry = async (ai: GoogleGenAI, params: any, maxRetries = 5) => {
  let delay = 3000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const msg = String(error?.message || '').toLowerCase();
      const status = error?.status || error?.code;
      const isRateLimit = status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('exhausted');
      if (isRateLimit && i < maxRetries - 1) {
        await wait(delay);
        delay *= 2;
        continue;
      }
      if (isRateLimit) throw new Error("QUOTA_EXCEEDED");
      throw error;
    }
  }
  throw new Error("API call failed");
};

export const generateRPM = async (data: FormData, apiKey: string): Promise<GeneratedContent> => {
  const ai = getAI(apiKey);
  const pedagogies = data.meetings.map(m => `Pertemuan ${m.meetingNumber}: ${m.pedagogy}`).join(", ");
  const dimensions = data.dimensions.join(", ");
  const prompt = `Bertindaklah sebagai ahli kurikulum SD. Buat konten RPM untuk SDN Pekayon 09.\nMapel: ${data.subject}\nKelas: ${data.classLevel}\nMateri: ${data.materi}\nTP: ${data.tp}\nDimensi: ${dimensions}\nPedagogi: ${pedagogies}`;

  const response = await generateWithRetry(ai, {
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: generatedContentSchema }
  });
  return JSON.parse(response.text || "{}");
};

export const generateLKPD = async (data: RPMResult, apiKey: string): Promise<string> => {
  const ai = getAI(apiKey);
  const prompt = `Buat LKPD menarik untuk materi ${data.materi} Kelas ${data.classLevel}. Gunakan HTML string.`;
  const response = await generateWithRetry(ai, {
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: documentContentSchema }
  });
  return JSON.parse(response.text || "{}").htmlContent || "";
};

export const generateSoal = async (data: RPMResult, apiKey: string, config: SoalConfig): Promise<string> => {
  const ai = getAI(apiKey);
  const prompt = `
    Bertindaklah sebagai pembuat soal asesmen modern (standar AKM). 
    Buatlah ${config.count} butir soal instrumen penilaian untuk materi "${data.materi}" Kelas ${data.classLevel} SD Pekayon 09.
    
    Spesifikasi:
    - Bentuk Soal: ${config.type}
    - Tingkat Kesulitan: ${config.difficulty}
    - Level Kognitif: ${config.cognitive}
    
    WAJIB menyertakan Stimulus untuk setiap kelompok soal atau per butir soal. Stimulus dapat berupa:
    - Teks narasi/informasi singkat yang relevan.
    - Deskripsi gambar atau ilustrasi kejadian.
    - Tabel data atau infografis sederhana.
    
    Instruksi Khusus Tipe Soal:
    - Jika PG Kompleks: Gunakan format tabel untuk pernyataan Benar/Salah atau Ya/Tidak.
    - Jika PG Multi Answer: Berikan instruksi "Pilihlah jawaban yang benar (bisa lebih dari satu)".
    
    Output Format:
    - Kembalikan sebagai string HTML lengkap (div wrapper).
    - Gunakan styling CSS inline yang rapi.
    - Sertakan KUNCI JAWABAN di bagian paling bawah.
  `;

  const response = await generateWithRetry(ai, {
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: documentContentSchema }
  });
  return JSON.parse(response.text || "{}").htmlContent || "";
};

const getPhase = (classLevel: string): 'FaseA' | 'FaseB' | 'FaseC' => {
  if (classLevel === "1" || classLevel === "2") return 'FaseA';
  if (classLevel === "3" || classLevel === "4") return 'FaseB';
  return 'FaseC';
};

export const getFieldSuggestions = async (field: 'cp' | 'tp' | 'materi', subject: Subject, classLevel: ClassLevel, apiKey: string, currentContext: string = ""): Promise<string[]> => {
  const ai = getAI(apiKey);
  const phase = getPhase(classLevel);
  const officialCP = CP_REF[subject]?.[phase];
  const prompt = `Berikan 5 opsi ${field} untuk mapel ${subject} Kelas ${classLevel} SD. Context: ${currentContext}`;

  const response = await generateWithRetry(ai, {
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { options: { type: Type.ARRAY, items: { type: Type.STRING } } }
      }
    }
  });
  return JSON.parse(response.text || "{}").options || [];
};