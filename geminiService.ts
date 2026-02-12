
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FormData, GeneratedContent, Subject, ClassLevel } from "./types";
import { CP_REF } from "./data/cpReference";

const getAI = (apiKey: string) => new GoogleGenAI({ apiKey });

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

export const generateRPM = async (data: FormData, apiKey: string): Promise<GeneratedContent> => {
  if (!apiKey) throw new Error("API Key wajib diisi.");

  const ai = getAI(apiKey);
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
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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
    if (!apiKey) return ["Harap masukkan API Key terlebih dahulu."];

    const ai = getAI(apiKey);
    const phase = getPhase(classLevel);
    const officialCP = CP_REF[subject]?.[phase];

    let promptContext = "";
    if (field === 'cp') {
        promptContext = officialCP ? `Referensi CP RESMI: "${officialCP}". Buat 5 variasi CP.` : `Buat 5 opsi CP sesuai Kurikulum Merdeka.`;
    } else if (field === 'tp') {
        promptContext = currentContext ? `Turunkan 5 TP dari CP ini: "${currentContext}".` : `Buat 5 TP relevan.`;
    } else if (field === 'materi') {
        promptContext = `Berdasarkan CP/TP: "${currentContext}", sarankan 5 topik materi pokok.`;
    }

    const prompt = `Berikan 5 opsi ${field} untuk mapel ${subject} Kelas ${classLevel} SD. ${promptContext} Output wajib JSON: { "options": ["opsi 1", "opsi 2", ...] }`;

    try {
        const response = await ai.models.generateContent({
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
    } catch (e) {
        console.error(e);
        return ["Gagal mengambil saran."];
    }
};
