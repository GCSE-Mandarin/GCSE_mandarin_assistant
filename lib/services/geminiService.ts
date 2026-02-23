// All AI calls now go through Netlify function at /.netlify/functions/generate
// API keys are stored securely on the server and never exposed to the client

import { Exercise, VocabWord, WordDetails } from "@/types";

// Helper to call the Netlify function
const callNetlifyFunction = async (action: string, params: any): Promise<any> => {
  try {
    const response = await fetch('/.netlify/functions/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...params }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error: any) {
    console.error(`Error calling ${action}:`, error);
    throw error;
  }
};

export const generateLearningMaterial = async (
  stage: string,
  topic: string,
  point: string
): Promise<string> => {
  try {
    const result = await callNetlifyFunction('generateLearningMaterial', { stage, topic, point });
    return result || "## Error\nNo content generated.";
  } catch (error: any) {
    console.error("Gemini API Error (Material):", error);
    if (error?.message?.includes('GEMINI_API_KEY')) {
      throw new Error("MISSING_API_KEY");
    }
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
    const result = await callNetlifyFunction('generateExercises', { 
      stage, 
      topic, 
      point, 
      learningMaterialContext 
    });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Gemini API Error (Exercises):", error);
    return [];
  }
};

export const generateImage = async (context: string): Promise<string | null> => {
  try {
    const result = await callNetlifyFunction('generateImage', { context });
    return result;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    return null;
  }
};

export const generateSpeech = async (text: string): Promise<string | { audioData: ArrayBuffer, format: 'openai' } | null> => {
  try {
    const result = await callNetlifyFunction('generateSpeech', { text });
    
    // Check if result is OpenAI format (has audioData and format fields)
    if (result && typeof result === 'object' && 'format' in result && result.format === 'openai') {
      // Convert base64 string back to ArrayBuffer
      const base64Audio = result.audioData;
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return { audioData: bytes.buffer, format: 'openai' };
    }
    
    // Otherwise it's Gemini format (base64 string)
    return result || null;
  } catch (error: any) {
    console.error("[TTS] Error:", error);
    throw error;
  }
};

export const getChatResponse = async (
  message: string, 
  contextMaterial: string,
  history: { role: 'user' | 'model', text: string }[]
): Promise<string> => {
  try {
    const result = await callNetlifyFunction('getChatResponse', { 
      message, 
      contextMaterial, 
      history 
    });
    return result || "I didn't catch that.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Sorry, I'm having trouble thinking right now.";
  }
};

// --- Vocabulary Specific Functions ---

export const generateVocabularyList = async (category: string): Promise<VocabWord[]> => {
  try {
    const result = await callNetlifyFunction('generateVocabularyList', { category });
    return Array.isArray(result) ? result : [];
  } catch (error: any) {
    console.error("Vocab List Error:", error);
    if (error?.message?.includes('GEMINI_API_KEY')) {
      const apiError: any = new Error("MISSING_API_KEY");
      apiError.message = 'MISSING_API_KEY';
      throw apiError;
    }
    return [];
  }
};

export const generateWordDetails = async (word: string): Promise<WordDetails | null> => {
  try {
    const result = await callNetlifyFunction('generateWordDetails', { character: word });
    return result;
  } catch (error) {
    console.error("Word Details Error:", error);
    return null;
  }
};

// Check API key status (for Settings view)
export const checkApiKeys = async (): Promise<{ geminiConfigured: boolean; openaiConfigured: boolean }> => {
  try {
    const result = await callNetlifyFunction('check-keys', {});
    return result || { geminiConfigured: false, openaiConfigured: false };
  } catch (error) {
    console.error("Check API Keys Error:", error);
    return { geminiConfigured: false, openaiConfigured: false };
  }
};

// Rule-based scoring function for Chinese text evaluation (Client-side)
const calculateRuleBasedScore = (correctAnswer: string, studentAnswer: string): { score: number; feedback: string } => {
  // Normalize inputs
  const correct = correctAnswer.trim();
  const student = studentAnswer.trim();
  
  // 1. Exact match (text and punctuation) → 100%
  if (correct === student) {
    return {
      score: 100,
      feedback: 'Perfect! Your answer is exactly correct.'
    };
  }
  
  // Extract Chinese characters (remove punctuation, spaces, and non-Chinese characters for comparison)
  const extractChineseChars = (text: string): string => {
    return text.split('').filter(char => /[\u4e00-\u9fff]/.test(char)).join('');
  };
  
  // Extract punctuation (Chinese and English punctuation)
  const extractPunctuation = (text: string): string[] => {
    return text.split('').filter(char => /[，。！？；：、""''（）【】《》,.!?;:\-"'()\[\]{}]/.test(char));
  };
  
  const correctChars = extractChineseChars(correct);
  const studentChars = extractChineseChars(student);
  const correctPunctuation = extractPunctuation(correct);
  const studentPunctuation = extractPunctuation(student);
  
  // Check if Chinese characters match
  const charsMatch = correctChars.length > 0 && correctChars === studentChars;
  
  // Check for any overlap (at least one Chinese character in common)
  const hasOverlap = correctChars.length > 0 && studentChars.length > 0 && 
    [...correctChars].some(char => studentChars.includes(char));
  
  // Check if punctuation matches
  const hasCorrectPunctuation = correctPunctuation.length > 0 && 
    correctPunctuation.some(p => studentPunctuation.includes(p));
  
  const allPunctuationDifferent = correctPunctuation.length > 0 && 
    !correctPunctuation.some(p => studentPunctuation.includes(p));
  
  const noPunctuationInCorrect = correctPunctuation.length === 0;
  
  // Apply scoring rules
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

// Evaluate student answer locally WITHOUT AI or network requests
export const evaluateAnswer = async (
  _question: string, // Kept for signature compatibility
  correctAnswer: string,
  studentAnswer: string,
  questionType?: string
): Promise<{ score: number; feedback: string }> => {
  try {
    // For choice questions (quiz type), use binary scoring
    if (questionType === 'quiz') {
      const correct = correctAnswer.trim();
      const student = studentAnswer.trim();
      const isMatch = correct === student;
      
      return {
        score: isMatch ? 100 : 0,
        feedback: isMatch ? 'Correct! Great job!' : 'Incorrect.'
      };
    } else {
      // For translation/composition, use the local rule-based engine
      return calculateRuleBasedScore(correctAnswer, studentAnswer);
    }
  } catch (error) {
    console.error('[EvaluateAnswer] Local evaluation failed:', error);
    const isCorrect = correctAnswer.trim() === studentAnswer.trim();
    return {
      score: isCorrect ? 100 : 0,
      feedback: isCorrect ? 'Answer is correct.' : 'Answer is incorrect.'
    };
  }
};
