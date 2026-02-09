
export interface LearningPoint {
  id: string;
  description: string;
}

export interface Topic {
  id: string;
  title: string;
  points: LearningPoint[];
}

export interface Stage {
  id: number;
  title: string;
  duration: string;
  goal: string;
  topics: Topic[];
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

export interface AssignedLesson {
  id: string;
  studentName: string;
  studentId?: string; // Add ID field
  stageTitle: string;
  topicTitle: string;
  pointDescription: string;
  material: string;
  exercises: Exercise[];
  assignedDate: string;
  completed: boolean;
  score?: number; // Total score (sum of exercise scores or count of correct answers)
  userAnswers?: string[]; // Added to store student's specific input
  exerciseScores?: number[]; // Percentage score (0-100) for each exercise
  exerciseFeedback?: string[]; // AI-generated feedback for each exercise
  tutorAdjustedScores?: number[]; // Tutor-adjusted scores (0-100) for each exercise
  tutorComments?: string[]; // Tutor comments for each exercise
  tutorOverallComment?: string; // Overall comment from tutor for the entire lesson
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
  id: string; // studentName_character
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
