import { Exercise, VocabWord, WordDetails } from "@/types";

const CALL_URL = '/api/generate';

const callApiRoute = async (action: string, params: any): Promise<any> => {
  try {
    const response = await fetch(CALL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error: any) {
    console.error(`[API Proxy Error] Action: ${action}:`, error);
    throw error;
  }
};

// --- Educational Content Generation ---

export const generateLearningMaterial = async (
  stage: string,
  topic: string,
  point: string,
  referenceLesson?: {
    title: string;
    material: string;
  } | null
): Promise<string> => {
  try {
    const result = await callApiRoute('generateLearningMaterial', { stage, topic, point, referenceLesson });
    return result || "## Error\nNo content generated.";
  } catch (error: any) {
    if (error?.message?.includes('GEMINI_API_KEY')) throw new Error("MISSING_API_KEY");
    throw error;
  }
};

export const generateExercises = async (
  stage: string,
  topic: string,
  point: string,
  learningMaterialContext: string
): Promise<Exercise[]> => {
  try {
    const result = await callApiRoute('generateExercises', { stage, topic, point, learningMaterialContext });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    return [];
  }
};

export const generateImage = async (context: string): Promise<string | null> => {
  try {
    return await callApiRoute('generateImage', { context });
  } catch (error) {
    return null;
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    return await callApiRoute('generateSpeech', { text });
  } catch (error) {
    console.error("[TTS Error]:", error);
    return null;
  }
};

export const getChatResponse = async (
  message: string, 
  contextMaterial: string,
  history: { role: 'user' | 'model', text: string }[]
): Promise<string> => {
  try {
    return await callApiRoute('getChatResponse', { message, contextMaterial, history });
  } catch (error) {
    return "Sorry, I'm having trouble thinking right now.";
  }
};

// --- Vocabulary ---

export const generateVocabularyList = async (category: string): Promise<VocabWord[]> => {
  try {
    const result = await callApiRoute('generateVocabularyList', { category });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    return [];
  }
};

export const generateWordDetails = async (word: string): Promise<WordDetails | null> => {
  try {
    return await callApiRoute('generateWordDetails', { character: word });
  } catch (error) {
    return null;
  }
};

// --- System & Evaluation (RESTORED LOGIC) ---

const calculateRuleBasedScore = (correctAnswer: string, studentAnswer: string): { score: number; feedback: string } => {
  const correct = correctAnswer.trim();
  const student = studentAnswer.trim();
  
  if (correct === student) {
    return { score: 100, feedback: 'Perfect! Your answer is exactly correct.' };
  }
  
  const extractChineseChars = (text: string): string => {
    return text.split('').filter(char => /[\u4e00-\u9fff]/.test(char)).join('');
  };
  
  const extractPunctuation = (text: string): string[] => {
    return text.split('').filter(char => /[，。！？；：、""''（）【】《》,.!?;:\-"'()\[\]{}]/.test(char));
  };
  
  const correctChars = extractChineseChars(correct);
  const studentChars = extractChineseChars(student);
  const correctPunctuation = extractPunctuation(correct);
  const studentPunctuation = extractPunctuation(student);
  
  const charsMatch = correctChars !== '' && correctChars === studentChars;
  const hasOverlap = correctChars.length > 0 && studentChars.length > 0 && 
    [...correctChars].some(char => studentChars.includes(char));
  const hasCorrectPunctuation = correctPunctuation.length > 0 && 
    correctPunctuation.some(p => studentPunctuation.includes(p));
  const allPunctuationDifferent = correctPunctuation.length > 0 && 
    !correctPunctuation.some(p => studentPunctuation.includes(p));
  const noPunctuationInCorrect = correctPunctuation.length === 0;
  
  if (charsMatch) {
    if (noPunctuationInCorrect) {
      if (studentPunctuation.length === 0) {
        return { score: 100, feedback: 'Perfect! Your answer is correct.' };
      } else {
        return { score: 75, feedback: 'Excellent! Your Chinese characters are correct, but you have extra punctuation.' };
      }
    } else if (hasCorrectPunctuation) {
      return { score: 75, feedback: 'Great! Your Chinese characters are correct and you have some correct punctuation.' };
    } else if (allPunctuationDifferent) {
      return { score: 50, feedback: 'Good! Your Chinese characters are correct, but the punctuation needs work.' };
    } else {
      return { score: 75, feedback: 'Excellent! Your Chinese characters are correct.' };
    }
  } else if (hasOverlap) {
    return { score: 25, feedback: 'You have some correct characters, but the answer needs more work.' };
  } else {
    return { score: 0, feedback: 'Review the correct answer and try again.' };
  }
};

export const evaluateAnswer = async (
  _question: string,
  correctAnswer: string,
  studentAnswer: string,
  questionType?: string
): Promise<{ score: number; feedback: string }> => {
  try {
    if (questionType === 'quiz') {
      const isMatch = correctAnswer.trim() === studentAnswer.trim();
      return { score: isMatch ? 100 : 0, feedback: isMatch ? 'Correct! Great job!' : 'Incorrect.' };
    }
    return calculateRuleBasedScore(correctAnswer, studentAnswer);
  } catch (error) {
    return { score: 0, feedback: 'Evaluation failed.' };
  }
};

export const checkApiKeys = async (): Promise<{ geminiConfigured: boolean; openaiConfigured: boolean }> => {
  try {
    return await callApiRoute('check-keys', {});
  } catch (error) {
    return { geminiConfigured: false, openaiConfigured: false };
  }
};
