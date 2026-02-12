import { Subject } from "../types";

// Helper to categorize text by phase
export const CP_REF: Partial<Record<Subject, { FaseA: string; FaseB: string; FaseC: string }>> = {
  [Subject.Pancasila]: {
    FaseA: `Pancasila: Mengenal bendera negara, sila-sila Pancasila; UUD 1945: Aturan keluarga; Bhinneka Tunggal Ika: Identitas diri; NKRI: Karakteristik lingkungan.`,
    FaseB: `Pancasila: Makna sila Pancasila; UUD 1945: Hak dan kewajiban sekolah; Bhinneka Tunggal Ika: Menghargai keberagaman; NKRI: Struktur RT/RW.`,
    FaseC: `Pancasila: Sejarah kelahiran Pancasila; UUD 1945: Norma warga negara; Bhinneka Tunggal Ika: Melestarikan budaya; NKRI: Wilayah kabupaten/kota.`
  },
  [Subject.BahasaIndonesia]: {
    FaseA: `Menyimak info diri; Membaca kata sederhana; Berbicara bertanya jawab; Menulis permulaan.`,
    FaseB: `Menyimak ide pokok; Membaca ide pendukung; Berbicara pendapat; Menulis teks narasi.`,
    FaseC: `Menyimak analisis sastra; Membaca intonasi kompleks; Berbicara presentasi formal; Menulis teks kreatif.`
  },
  [Subject.Matematika]: {
    FaseA: `Bilangan sampai 100; Aljabar simbol sama dengan; Pengukuran tidak baku; Geometri bangun datar dasar.`,
    FaseB: `Bilangan sampai 10.000; Perkalian pembagian; Geometri ciri bangun datar; Data diagram batang.`,
    FaseC: `Bilangan 1.000.000 & Pecahan; KPK/FPB; Geometri bangun ruang; Data mean/median/modus.`
  },
  [Subject.KodingDanKA]: {
    FaseA: "-",
    FaseB: "-",
    FaseC: `
      1. Berpikir Komputasional: Memahami masalah sederhana, menerapkan pemecahan masalah sistematis, menulis instruksi logis.
      2. Literasi Digital: Memahami konsep dasar teknologi, sistem komputer pradasar, keamanan data pribadi, produksi konten digital.
      3. Literasi Etika KA: Konsep KA sederhana, manfaat & dampak, perbedaan manusia vs komputer dalam penginderaan, mesin cerdas vs non-cerdas, etika empati.
      4. Pemanfaatan KA: Simulasi kerja KA mengenali pola, klasifikasi benda konkret, pengaruh input terhadap prediksi KA.
    `
  }
};