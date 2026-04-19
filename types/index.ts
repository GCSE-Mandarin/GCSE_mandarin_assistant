
export interface LearningPoint {
  id: string;
  description: string;
}

export interface Subtopic {
  id: string;
  title: string;
  points: LearningPoint[];
}

export interface Topic {
  id: number;
  title: string;
  duration: string;
  goal: string;
  topics: Subtopic[];
}

export interface Exercise {
  type: 'quiz' | 'translation' | 'composition';
  question: string;
  questionTranslation?: string;
  answer?: string;
  options?: string[];
}

export interface GeneratedContent {
  learningMaterial: string;
  exercises: Exercise[];
}

export interface LessonTemplate {
  pointId: string;
  stageTitle: string;
  topicTitle: string;
  pointDescription: string;
  pages: string[];
  material: string;
  originalMaterial?: string;
  exercises: Exercise[];
  originalExercises?: Exercise[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignedLesson {
  id: string;
  pointId: string;
  studentName: string;
  studentId?: string;
  stageTitle: string;
  topicTitle: string;
  pointDescription: string;
  pages: string[];
  material: string;
  originalMaterial?: string;
  exercises: Exercise[];
  originalExercises?: Exercise[];
  assignedDate: string;
  completed: boolean;
  score?: number;
  userAnswers?: string[];
  exerciseScores?: number[];
  exerciseFeedback?: string[];
  tutorAdjustedScores?: number[];
  tutorComments?: string[];
  tutorOverallComment?: string;
}

export type ViewState = 
  | 'login' 
  | 'tutor-dashboard' 
  | 'tutor-progress' 
  | 'settings'
  | 'onboarding' 
  | 'curriculum' 
  | 'editor' 
  | 'student-dashboard' 
  | 'student-lesson'
  | 'student-vocab'
  | 'vocab-management';

export interface StudentProfile {
  name: string;
  studentId?: string; // Add ID field
  stageId: number;
}

export interface VocabWord {
  character: string;
  pinyin: string;
  meaning: string;
}

export interface WordDetails extends VocabWord {
  exampleSentenceCh: string;
  exampleSentenceEn: string;
}

export interface VocabProgress {
  id: string; // studentId_character
  studentId: string;
  studentName: string;
  category: string;
  word: string; // character
  pinyin: string;
  meaning: string;
  practices: {
    viewed: number;
    writing: number;
    pronunciation: number;
  };
  lastPracticed: string;
}

export interface VocabList {
  id: string;
  category: string;
  characters: string[]; // Array of individual Chinese characters
  uploadedAt: string;
  fileName?: string;
}

export interface Student {
  id: string;
  name: string;
  age_years?: number;
  profile_id?: string;
  targets?: string[];
}
