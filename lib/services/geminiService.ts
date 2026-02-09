// All AI calls now go through Netlify function at /.netlify/functions/generate
// API keys are stored securely on the server and never exposed to the client

import { Exercise, VocabWord, WordDetails } from "../types";

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

// Evaluate student answer and return percentage score (0-100)
export const evaluateAnswer = async (
  question: string,
  correctAnswer: string,
  studentAnswer: string,
  questionType?: string
): Promise<{ score: number; feedback: string }> => {
  try {
    console.log('[EvaluateAnswer] Calling Netlify function with:', {
      question: question.substring(0, 50),
      correctAnswer: correctAnswer.substring(0, 50),
      studentAnswer: studentAnswer.substring(0, 50),
      questionType
    });
    
    const result = await callNetlifyFunction('evaluateAnswer', { 
      question, 
      correctAnswer, 
      studentAnswer,
      questionType 
    });
    
    console.log('[EvaluateAnswer] Netlify function returned:', result);
    
    // Check if result has expected structure
    if (result && typeof result === 'object' && typeof result.score === 'number') {
      return result;
    } else if (result && result.score !== undefined) {
      // Try to convert score to number if it's a string
      const score = typeof result.score === 'string' ? parseInt(result.score, 10) : result.score;
      return {
        score: isNaN(score) ? 0 : Math.max(0, Math.min(100, Math.round(score))),
        feedback: result.feedback || 'Evaluation completed.'
      };
    }
    
    console.error('[EvaluateAnswer] Invalid result structure:', result);
    throw new Error('Invalid result structure from evaluation function');
  } catch (error: any) {
    console.error("[EvaluateAnswer] Error:", error);
    console.error("[EvaluateAnswer] Error details:", {
      message: error?.message,
      stack: error?.stack
    });
    
    // Fallback to similarity-based scoring instead of binary
    const normalizedStudent = studentAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    
    // Simple similarity check for partial credit
    if (normalizedStudent === normalizedCorrect) {
      return { 
        score: 100, 
        feedback: 'Answer is correct.' 
      };
    }
    
    // Calculate similarity for partial credit
    if (normalizedStudent.length > 0 && normalizedCorrect.length > 0) {
      const matchingChars = [...normalizedCorrect].filter(char => normalizedStudent.includes(char)).length;
      const similarity = (matchingChars / Math.max(normalizedCorrect.length, normalizedStudent.length)) * 100;
      const partialScore = Math.round(similarity);
      
      return {
        score: Math.max(10, Math.min(90, partialScore)), // Cap between 10-90% for partial answers
        feedback: `Partial credit: ${partialScore}% of the answer is correct. ${partialScore >= 50 ? 'Good effort!' : 'Keep practicing!'}`
      };
    }
    
    return { 
      score: 0, 
      feedback: 'Answer is incorrect. Please try again.' 
    };
  }
};
