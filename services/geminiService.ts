import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FormData, GeneratedContent, Subject, ClassLevel, RPMResult, SoalConfig } from "../types";
import { CP_REF } from "../data/cpReference";

// Helper: Get AI Instance
const getAI = (providedKey?: string) => {
  let finalKey = providedKey;
  if (!finalKey || finalKey.trim() === '') {
    finalKey = localStorage.getItem('gemini_api_key') || '';
  }
  if (!finalKey || finalKey.trim() === '') {
    // Cast import.meta to any to avoid TS error
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

// Helper: Wait function
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Retry logic
const generateWithRetry = async (ai: GoogleGenAI, params: any, maxRetries = 3) => {
  let delay = 3000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const msg = String(error?.message || '').toLowerCase();
      const status = error?.status || error?.code;
      const isRateLimit = status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('exhausted');
      
      if (isRateLimit && i < maxRetries - 1) {
        console.warn(`Gemini API busy (Attempt ${i + 1}/${maxRetries}). Retrying...`);
        await wait(delay);
        delay *= 2;
        continue;
      }
      if (isRateLimit) throw new Error("QUOTA_EXCEEDED");
      throw error;
    }
  }
  throw new Error("API call failed after max retries");
};

// === IMAGE GENERATION LOGIC ===

// Helper: Generate Image using Imagen
const generateImage = async (ai: GoogleGenAI, prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `Educational illustration for elementary school students, clear line art or semi-realistic style, white background: ${prompt}`,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/jpeg',
      },
    });
    
    // Return base64 string
    return response.generatedImages?.[0]?.image?.imageBytes || null;
  } catch (error) {
    console.error("Image generation failed for prompt:", prompt, error);
    return null;
  }
};

// Helper: Process content to find [[IMAGE:...]] tags and replace with actual images
const processContentWithImages = async (htmlContent: string, apiKey: string): Promise<string> => {
  const imageRegex = /\[\[IMAGE:(.*?)\]\]/g;
  const matches = [...htmlContent.matchAll(imageRegex)];

  if (matches.length === 0) return htmlContent;

  const ai = getAI(apiKey);
  let finalHtml = htmlContent;

  // Process images in parallel (limit concurrency if needed, but for now parallel is fine)
  const replacements = await Promise.all(matches.map(async (match) => {
    const fullTag = match[0];
    const imagePrompt = match[1].trim();
    
    // Generate image
    const base64Data = await generateImage(ai, imagePrompt);
    
    if (base64Data) {
      return {
        tag: fullTag,
        replacement: `<div style="text-align:center; margin: 15px 0;"><img src="data:image/jpeg;base64,${base64Data}" alt="${imagePrompt}" style="max-width: 100%; max-height: 250px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" /><br/><span style="font-size: 10px; color: #666; font-style: italic;">Gambar AI: ${imagePrompt}</span></div>`
      };
    } else {
      // Fallback if image generation fails
      return {
        tag: fullTag,
        replacement: `<div style="border: 2px dashed #cbd5e1; background: #f8fafc; padding: 20px; text-align: center; color: #64748b; margin: 15px 0; border-radius: 8px;">[ Ilustrasi: ${imagePrompt} ]</div>`
      };
    }
  }));

  // Replace tags in the string
  for (const item of replacements) {
    finalHtml = finalHtml.replace(item.tag, item.replacement);
  }

  return finalHtml;
};

// === MAIN SERVICES ===

export const generateRPM = async (data: FormData, apiKey: string): Promise<GeneratedContent> => {
  let ai;
  try { ai = getAI(apiKey); } catch (e: any) { throw e; }

  const pedagogies = data.meetings.map(m => `Pertemuan ${m.meetingNumber}: ${m.pedagogy}`).join(", ");
  const dimensions = data.dimensions.join(", ");

  const prompt = `
    Bertindaklah sebagai ahli kurikulum SD. Buat konten RPM untuk SDN Pekayon 09.
    Input: Kelas ${data.classLevel}, Mapel ${data.subject}, Materi ${data.materi}, TP ${data.tp}.
    
    Lengkapi data berikut (Format JSON):
    1. Karakteristik Siswa, Lintas Disiplin, Topik, Kemitraan, Lingkungan, Digital Tools.
    2. Pengalaman Belajar (Memahami, Mengaplikasi, Refleksi).
    3. Asesmen (Awal, Proses, Akhir) & Rubrik.
  `;

  try {
    const response = await generateWithRetry(ai, {
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: generatedContentSchema }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    throw error;
  }
};

export const generateLKPD = async (data: RPMResult, apiKey: string): Promise<string> => {
  let ai;
  try { ai = getAI(apiKey); } catch (e) { return "<p>API Key Error</p>"; }

  const prompt = `
    Buatkan Lembar Kerja Peserta Didik (LKPD) HTML untuk Kelas ${data.classLevel} SD, Mapel ${data.subject}, Materi ${data.materi}.
    
    PENTING:
    - LKPD harus menarik secara visual.
    - Sertakan setidaknya 1-2 ilustrasi pendukung.
    - Gunakan penanda khusus: [[IMAGE: Deskripsi gambar visual detail dalam bahasa Inggris]] di lokasi gambar yang diinginkan.
    - Contoh: "Perhatikan gambar berikut: [[IMAGE: A cartoon cat eating a fish]]"
    
    Struktur:
    1. Kop (Nama, Kelas).
    2. Petunjuk.
    3. Kegiatan Inti (Gunakan penanda [[IMAGE:...]] untuk ilustrasi soal/kegiatan).
    4. Refleksi.
  `;

  try {
    const response = await generateWithRetry(ai, {
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: documentContentSchema }
    });
    
    const initialHtml = JSON.parse(response.text || "{}").htmlContent || "";
    // Post-process to generate real images
    return await processContentWithImages(initialHtml, apiKey);

  } catch (error: any) {
    console.error(error);
    return `<p>Gagal memuat LKPD: ${error.message}</p>`;
  }
};

export const generateSoal = async (data: RPMResult, apiKey: string, config: SoalConfig): Promise<string> => {
  let ai;
  try { ai = getAI(apiKey); } catch (e) { return "<p>API Key Error</p>"; }

  const prompt = `
    Buatkan instrumen penilaian (Soal) HTML untuk Kelas ${data.classLevel}, Materi ${data.materi}.
    
    Konfigurasi:
    - Tipe: ${config.type}
    - Jumlah: ${config.count} butir
    - Kesulitan: ${config.difficulty}
    - Kognitif: ${config.cognitive}
    
    INSTRUKSI GAMBAR (STIMULUS):
    - Karena ini standar AKM, WAJIB sertakan stimulus gambar untuk beberapa soal.
    - Gunakan penanda: [[IMAGE: Visual description in English]] di atas pertanyaan yang butuh gambar.
    - Contoh: "Perhatikan gambar siklus air berikut! [[IMAGE: Diagram of water cycle rain and evaporation simple vector]]"
    
    Output: HTML string lengkap dengan CSS inline rapi.
  `;

  try {
    const response = await generateWithRetry(ai, {
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: documentContentSchema }
    });
    
    const initialHtml = JSON.parse(response.text || "{}").htmlContent || "";
    // Post-process to generate real images
    return await processContentWithImages(initialHtml, apiKey);

  } catch (error: any) {
    console.error(error);
    return `<p>Gagal memuat Soal: ${error.message}</p>`;
  }
};

const getPhase = (classLevel: string): 'FaseA' | 'FaseB' | 'FaseC' => {
  if (classLevel === ClassLevel.Kelas1 || classLevel === ClassLevel.Kelas2) return 'FaseA';
  if (classLevel === ClassLevel.Kelas3 || classLevel === ClassLevel.Kelas4) return 'FaseB';
  return 'FaseC';
};

export const getFieldSuggestions = async (field: 'cp'|'tp'|'materi', subject: Subject, classLevel: ClassLevel, apiKey: string, currentContext: string = ""): Promise<string[]> => {
    let ai;
    try { ai = getAI(apiKey); } catch (e) { return ["API Key Error"]; }
    const phase = getPhase(classLevel);
    const prompt = `Berikan 5 opsi ${field} mapel ${subject} Kelas ${classLevel}. Context: ${currentContext}. Output JSON: { "options": [] }`;
    try {
        const res = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { options: { type: Type.ARRAY, items: { type: Type.STRING } } } } }
        });
        return JSON.parse(res.text || "{}").options || [];
    } catch (e) { return []; }
};