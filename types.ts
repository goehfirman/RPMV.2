export enum ClassLevel {
  Kelas1 = "1",
  Kelas2 = "2",
  Kelas3 = "3",
  Kelas4 = "4",
  Kelas5 = "5",
  Kelas6 = "6"
}

export enum Semester {
  Ganjil = "Ganjil",
  Genap = "Genap"
}

export enum Subject {
  PAI = "Pendidikan Agama Islam",
  Pancasila = "Pendidikan Pancasila",
  BahasaIndonesia = "Bahasa Indonesia",
  IPAS = "IPAS",
  Matematika = "Matematika",
  SeniBudaya = "Seni Budaya",
  BahasaInggris = "Bahasa Inggris",
  PLBJ = "PLBJ",
  PJOK = "PJOK",
  KodingDanKA = "Koding dan Kecerdasan Artifisial"
}

export enum PedagogicalPractice {
  InkuiriDiscovery = "Inkuiri-Discovery Learning",
  PjBL = "Project Based Learning (PjBL)",
  ProblemSolving = "Problem Based Learning (PBL)",
  GameBased = "Game Based Learning",
  Station = "Station Learning",
  CooperativeLearning = "Cooperative Learning",
  Saintifik = "Pendekatan Saintifik"
}

export enum GraduateDimension {
  Keimanan = "Keimanan & Ketakwaan",
  Kewargaan = "Kewargaan",
  Kritis = "Penalaran Kritis",
  Kreativitas = "Kreativitas",
  Kolaborasi = "Kolaborasi",
  Kemandirian = "Kemandirian",
  Kesehatan = "Kesehatan",
  Komunikasi = "Komunikasi"
}

export interface MeetingPlan {
  meetingNumber: number;
  pedagogy: PedagogicalPractice;
}

export interface FormData {
  teacherName: string;
  teacherNIP: string;
  principalName: string; 
  principalNIP: string;
  classLevel: ClassLevel;
  semester: Semester;
  subject: Subject;
  cp: string;
  tp: string;
  materi: string;
  meetingCount: number;
  duration: string;
  meetings: MeetingPlan[];
  dimensions: GraduateDimension[];
  documentDate: string;
}

export interface RubricRow {
  aspect: string;
  score4: string;
  score3: string;
  score2: string;
  score1: string;
}

export interface Rubric {
  title: string;
  rows: RubricRow[];
}

export interface GeneratedContent {
  studentCharacteristics: string;
  crossDisciplinary: string;
  topics: string;
  partnerships: string;
  environment: string;
  digitalTools: string;
  learningExperiences: {
    memahami: string;
    mengaplikasi: string;
    refleksi: string;
  };
  assessments: {
    initial: string;
    process: string;
    final: string;
  };
  rubric: Rubric;
}

export interface RPMResult extends FormData, GeneratedContent {}