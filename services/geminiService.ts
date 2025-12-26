
import { GoogleGenAI, Type, Modality } from "@google/genai";
import OpenAI from "openai";
import { Exercise, VocabWord, WordDetails } from "../types";

// Helper to get key from env (Netlify) or localStorage (fallback for backwards compatibility)
const getApiKey = () => {
  // Vite exposes env vars prefixed with VITE_ to client-side code
  return import.meta.env.VITE_GEMINI_API_KEY || 
         localStorage.getItem('mandarin_app_api_key') || 
         '';
};

// Helper to get OpenAI API key from env (Netlify) or localStorage (fallback)
const getOpenAIApiKey = () => {
  // Vite exposes env vars prefixed with VITE_ to client-side code
  return import.meta.env.VITE_OPENAI_API_KEY || 
         localStorage.getItem('mandarin_app_openai_key') || 
         '';
};

// Helper for exponential backoff retry
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check for 429 (Resource Exhausted) or similar quota errors
    const isRateLimit = 
      error?.status === 429 || 
      error?.code === 429 || 
      (error?.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')));

    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
      await sleep(delay);
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Helper to clean JSON string from LLM response
const cleanJsonString = (text: string) => {
  if (!text) return "{}";
  let clean = text.trim();
  
  // Remove markdown code blocks
  clean = clean.replace(/```json/g, '').replace(/```/g, '');
  
  // Attempt to find the outermost JSON object or array
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  
  let start = -1;
  if (firstBrace === -1 && firstBracket === -1) {
    // No JSON structure found
    return text; 
  }
  
  if (firstBrace !== -1 && firstBracket === -1) start = firstBrace;
  else if (firstBrace === -1 && firstBracket !== -1) start = firstBracket;
  else start = Math.min(firstBrace, firstBracket);
  
  let end = -1;
  // If it starts with {, look for last }. If [, look for last ].
  if (clean[start] === '{') {
      end = clean.lastIndexOf('}');
  } else {
      end = clean.lastIndexOf(']');
  }
  
  if (end !== -1 && end > start) {
      clean = clean.substring(start, end + 1);
  }

  // Remove JS-style comments (//...)
  clean = clean.replace(/\/\/.*$/gm, '');

  // Remove trailing commas in arrays/objects: [ "a", ] -> [ "a" ]
  clean = clean.replace(/,(\s*[\]}])/g, '$1');
  
  return clean;
}

const safeJsonParse = <T>(text: string, fallback: T): T => {
    try {
        const cleaned = cleanJsonString(text);
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Parse failed", e);
        console.debug("Original text:", text);
        // Try one more aggressive cleanup: regex out everything that isn't JSON-like chars? No, too risky.
        return fallback;
    }
}

export const generateLearningMaterial = async (
  stage: string,
  topic: string,
  point: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are an expert IGCSE Mandarin tutor. 
    Create a learning module for a student at **${stage}**.
    The specific topic is "**${topic}**".
    The specific learning point is "**${point}**".

    Structure the content into **multiple distinct sections/slides** using the separator "---".
    
    Required Structure:
    1. **Introduction**: Briefly introduce the main concept in English.
    2. **Detailed Breakdown**: Split the concept into smaller, digestible sub-points. 
       - For example, if teaching "Tones", create separate sections for "First Tone", "Second Tone", etc.
       - If teaching "Numbers", group them logically (e.g., 1-10, then 11-20).
       - Ensure each section focuses on ONE specific aspect.
    3. **Summary**: A brief conclusion or wrap-up.

    Content Style:
    - **Language Requirement**: All instructional text should be in clear English.
    - **Bilingual Examples**: EVERY time you use Chinese text (characters), you **MUST** provide the **Pinyin** and **English translation** immediately.
    - **Format**: Use the format: **Chinese Characters (Pinyin)** - *English Meaning*.
      - Example: **你好 (nǐ hǎo)** - *Hello*
    - Use Markdown formatting (Headers, bolding) to make it readable.
    - KEEP IT ENGAGING but CONCISE.
    
    IMPORTANT: You MUST use "---" on a new line to separate every section.
    Do NOT generate exercises yet.
  `;

  try {
    const result = await callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          maxOutputTokens: 4000, 
        }
      });
      return response.text;
    });

    return result || "## Error\nNo content generated.";
  } catch (error) {
    console.error("Gemini API Error (Material):", error);
    throw error; // Propagate error so UI can handle it
  }
};

export const generateExercises = async (
  stage: string,
  topic: string,
  point: string,
  learningMaterialContext: string
): Promise<Exercise[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return [];
  
  const ai = new GoogleGenAI({ apiKey });

  // Robust check for Vocabulary mode
  const isVocabularyMode = 
    (stage.includes('Stage 1') || stage.includes('Foundations')) && 
    (topic.toLowerCase().includes('vocabulary') || point.toLowerCase().includes('vocabulary'));

  const prompt = `
    You are an expert IGCSE Mandarin tutor.
    Context:
    - Stage: ${stage}
    - Topic: ${topic}
    - Learning Point: ${point}
    - Learning Material (Context):
    ${learningMaterialContext.substring(0, 5000)}

    **Task**: Generate a set of practice exercises based on the provided Learning Material.

    **Generation Rules**:
    ${isVocabularyMode ? `
    **SPECIAL VOCABULARY MODE**:
    The user wants to strictly focus on **READING** (identifying characters) and **WRITING** (copying/typing characters).
    
    IMPORTANT: **SELECT ONLY THE TOP 4 MOST IMPORTANT WORDS** from the material.
    
    For EACH of the 4 selected words, generate EXACTLY these 3 exercises (Total ~12 exercises):
    
    1. **Reading (Meaning)**: 
       - Type: 'quiz'
       - Question: Show the **Chinese Character(s)**. (e.g. "What is the meaning of: [Chinese]")
       - Options: 4 choices. One correct English meaning, 3 distractors.
       
    2. **Reading (Pinyin)**: 
       - Type: 'quiz'
       - Question: Show the **Chinese Character(s)**. (e.g. "Select the correct Pinyin for: [Chinese]")
       - Options: 4 choices. One correct Pinyin, 3 distractor Pinyin (similar tones/sounds).
       
    3. **Writing (Copy/Recall)**: 
       - Type: 'translation'
       - Question: Show the **English and Pinyin**. (e.g. "Write the character for: [English] ([Pinyin])")
       - Answer: The correct Chinese character(s).
    ` : `
    1. **Per Sub-point**: Identify key sub-points (max 5). For EACH, generate **3 Exercises**:
       - **Exercise A (Easy)**: Multiple choice quiz.
       - **Exercise B (Medium)**: Translation or Fill-in-the-blank.
       - **Exercise C (Hard)**: Composition or complex translation.
    2. **Mixed Practice**: Generate **3 Extra Exercises** that mix concepts.
    `}

    3. **Language Requirements**: 
       - The 'question' field should be in **Simplified Chinese** where appropriate (e.g., "请选择" for Select), but ensure the student understands what to do.
       - You MUST provide an **English translation** of the question in the 'questionTranslation' field.

    **Output Format**:
    Return a single valid JSON object. Do not include markdown formatting like \`\`\`json.
    
    {
      "exercises": [
        {
          "type": "quiz",
          "question": "请选择...",
          "questionTranslation": "Select the...",
          "answer": "Answer",
          "options": ["Option A", "Option B", "Option C", "Option D"]
        },
        {
          "type": "translation",
          "question": "请写出...",
          "questionTranslation": "Write the...",
          "answer": "Model Answer"
        }
      ]
    }
  `;

  try {
    const result = await callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 8192,
        }
      });
      return response.text;
    });

    let text = result || "";
    const parsed = safeJsonParse(text, { exercises: [] });
    
    if (parsed.exercises && Array.isArray(parsed.exercises)) return parsed.exercises;
    if (Array.isArray(parsed)) return parsed;
    
    return [];

  } catch (error) {
    console.error("Gemini API Error (Exercises):", error);
    return [];
  }
};

export const generateImage = async (context: string): Promise<string | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  
  const ai = new GoogleGenAI({ apiKey });

  // Enhance prompt for style
  const prompt = `Draw a simple, friendly, flat-design illustration (vector art style, solid colors) for a Mandarin Chinese educational app. 
  Context: ${context.substring(0, 150)}. 
  The image should be culturally neutral or positive, suitable for teenagers. No text in the image. White background preferred.`;
  
  try {
    const result = await callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
      });
      return response;
    });

    if (result.candidates?.[0]?.content?.parts) {
      for (const part of result.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    return null;
  }
};

// OpenAI TTS function for single characters (fallback)
// Returns audio data in a format that can be played directly
const generateSpeechOpenAI = async (text: string): Promise<{ audioData: ArrayBuffer, format: 'openai' } | null> => {
  const openaiKey = getOpenAIApiKey();
  if (!openaiKey) {
    console.log("[TTS] No OpenAI API key found, skipping OpenAI TTS");
    return null;
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey, dangerouslyAllowBrowser: true });
    
    console.log("[TTS] Using OpenAI TTS for text:", text);
    
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy", // Options: alloy, echo, fable, onyx, nova, shimmer
      input: text,
    });

    // Get audio as ArrayBuffer (MP3 format)
    const arrayBuffer = await response.arrayBuffer();
    
    console.log("[TTS] OpenAI TTS succeeded, audio size:", arrayBuffer.byteLength);
    return { audioData: arrayBuffer, format: 'openai' };
  } catch (error: any) {
    console.error("[TTS] OpenAI TTS error:", error);
    return null;
  }
};

export const generateSpeech = async (text: string): Promise<string | { audioData: ArrayBuffer, format: 'openai' } | null> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("[TTS] No API key found");
    throw new Error("API key is missing. Please configure your API key in Settings.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  // Clean markdown for speech
  let speechText = text.replace(/[*#_]/g, '').substring(0, 500); // Limit length for TTS
  
  if (!speechText.trim()) {
    console.error("[TTS] Empty text after cleaning");
    throw new Error("Text to convert is empty");
  }

  const trimmedText = speechText.trim();
  const isSingleCharacter = trimmedText.length === 1 && /[\u4e00-\u9fa5]/.test(trimmedText);
  
  // For single Chinese characters, try OpenAI TTS first as fallback
  // since Gemini TTS often fails with finishReason: "OTHER"
  if (isSingleCharacter) {
    console.log("[TTS] Single character detected, trying OpenAI TTS first");
    const openaiAudio = await generateSpeechOpenAI(trimmedText);
    if (openaiAudio) {
      console.log("[TTS] OpenAI TTS succeeded for single character");
      return openaiAudio;
    }
    console.log("[TTS] OpenAI TTS failed or not configured, falling back to Gemini");
    // Fall through to Gemini TTS with enhancement
    speechText = `${trimmedText}，${trimmedText}`; // Character, character (with Chinese comma)
    console.log("[TTS] Using Gemini with enhancement:", speechText);
  } else if (trimmedText.length === 2 && /[\u4e00-\u9fa5]/.test(trimmedText)) {
    // For 2-character words, might work as-is, but let's try with a pause
    speechText = `${trimmedText}，${trimmedText}`;
    console.log("[TTS] Two-character word detected, adding pause. Original:", trimmedText, "Enhanced:", speechText);
  }

  console.log("[TTS] Requesting Gemini TTS for text:", speechText);

  try {
    const result = await callWithRetry(async () => {
      // Try with the Pro TTS model first (recommended for TTS)
      console.log("[TTS] Calling Gemini API with model: gemini-2.5-pro-preview-tts");
      
      // Try multiple approaches - the TTS API might work differently
      let response;
      let lastError: any = null;
      
      // Approach 1: Structured format with full config using Pro TTS model
      try {
        console.log("[TTS] Attempting structured format with Pro TTS model...");
        response = await ai.models.generateContent({
          model: 'gemini-2.5-pro-preview-tts',
          contents: [{ parts: [{ text: speechText }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });
        console.log("[TTS] Structured format succeeded");
      } catch (err1: any) {
        lastError = err1;
        console.warn("[TTS] Approach 1 failed:", err1?.message || err1);
        
        // Approach 2: Simple string format with config using Pro TTS model
        try {
          console.log("[TTS] Trying simple string format with Pro TTS model...");
          response = await ai.models.generateContent({
            model: 'gemini-2.5-pro-preview-tts',
            contents: speechText,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
              },
            },
          });
          console.log("[TTS] Simple string format succeeded");
        } catch (err2: any) {
          console.warn("[TTS] Approach 2 failed:", err2?.message || err2);
          
          // Approach 3: Simple string format without config using Pro TTS model
          try {
            console.log("[TTS] Trying simple format without config with Pro TTS model...");
            response = await ai.models.generateContent({
              model: 'gemini-2.5-pro-preview-tts',
              contents: speechText,
            });
            console.log("[TTS] Simple format without config succeeded");
          } catch (err3: any) {
            console.warn("[TTS] Approach 3 failed:", err3?.message || err3);
            
            // Approach 4: Try Flash TTS model as fallback
            try {
              console.log("[TTS] Trying Flash TTS model as fallback...");
              response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: speechText,
                config: {
                  responseModalities: [Modality.AUDIO],
                },
              });
              console.log("[TTS] Flash TTS model succeeded");
            } catch (err4: any) {
              console.error("[TTS] All approaches failed");
              console.error("[TTS] Error 1:", err1?.message);
              console.error("[TTS] Error 2:", err2?.message);
              console.error("[TTS] Error 3:", err3?.message);
              console.error("[TTS] Error 4:", err4?.message);
              throw err1; // Throw the first error
            }
          }
        }
      }
      
      if (!response) {
        throw new Error("API returned no response");
      }
      
      console.log("[TTS] API response received, type:", typeof response);
      console.log("[TTS] Response keys:", Object.keys(response || {}));
      console.log("[TTS] Response has candidates:", !!response.candidates);
      if (response.candidates && response.candidates.length > 0) {
        console.log("[TTS] First candidate keys:", Object.keys(response.candidates[0] || {}));
      }
      console.log("[TTS] Full response (first 2000 chars):", JSON.stringify(response, null, 2).substring(0, 2000));
      return response;
    }, 1); // Only 1 retry to avoid long delays

    console.log("[TTS] Processing response structure");
    
    if (!result) {
      console.error("[TTS] Result is null/undefined");
      throw new Error("API returned no result");
    }
    
    console.log("[TTS] result.candidates:", result.candidates);
    
    if (!result.candidates || result.candidates.length === 0) {
      console.error("[TTS] No candidates in response");
      console.error("[TTS] Full result:", JSON.stringify(result, null, 2));
      throw new Error("API response has no candidates. The model might not support TTS or the API structure has changed.");
    }
    
    const candidate = result.candidates[0];
    console.log("[TTS] candidate:", candidate);
    console.log("[TTS] candidate keys:", candidate ? Object.keys(candidate) : "candidate is null");
    
    if (!candidate) {
      console.error("[TTS] First candidate is null/undefined");
      throw new Error("First candidate is invalid");
    }
    
    // Check finishReason - if it's not "STOP", there might be an issue
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.warn("[TTS] finishReason is not STOP:", candidate.finishReason);
      if (candidate.finishReason === 'OTHER') {
        throw new Error("TTS request completed with 'OTHER' status. The TTS model might not be available with your API key, or the request format is incorrect. Please check if your API key has TTS access enabled.");
      } else if (candidate.finishReason === 'MAX_TOKENS') {
        throw new Error("TTS request exceeded token limit. Try a shorter text.");
      } else if (candidate.finishReason === 'SAFETY') {
        throw new Error("TTS request was blocked by safety filters.");
      } else {
        throw new Error(`TTS request finished with reason: ${candidate.finishReason}. The request may not have completed successfully.`);
      }
    }
    
    // Check if candidate has content directly or in a different structure
    console.log("[TTS] candidate.content:", candidate.content);
    console.log("[TTS] Full candidate structure:", JSON.stringify(candidate, null, 2));
    
    // Try to find audio data in different possible locations
    let audioData: string | null = null;
    
    // Standard structure: candidate.content.parts[0].inlineData.data
    if (candidate.content?.parts?.[0]?.inlineData?.data) {
      audioData = candidate.content.parts[0].inlineData.data;
      console.log("[TTS] Found audio in standard location");
    }
    // Alternative: candidate might have parts directly
    else if (candidate.parts?.[0]?.inlineData?.data) {
      audioData = candidate.parts[0].inlineData.data;
      console.log("[TTS] Found audio in candidate.parts");
    }
    // Alternative: candidate might have inlineData directly
    else if (candidate.inlineData?.data) {
      audioData = candidate.inlineData.data;
      console.log("[TTS] Found audio in candidate.inlineData");
    }
    // Alternative: check if response has audio in a different format
    else if ((result as any).audioData) {
      audioData = (result as any).audioData;
      console.log("[TTS] Found audio in result.audioData");
    }
    // Alternative: check if there's a different response structure
    else if ((result as any).audio) {
      audioData = (result as any).audio;
      console.log("[TTS] Found audio in result.audio");
    }
    
    if (audioData) {
      console.log("[TTS] Successfully found audio data, length:", audioData.length);
      return audioData;
    }
    
    // If we get here, we couldn't find audio data
    console.error("[TTS] Could not find audio data in any expected location");
    console.error("[TTS] Full result structure:", JSON.stringify(result, null, 2));
    throw new Error("API response does not contain audio data in expected format. The TTS model might not be available or the response structure has changed.");
    
    if (!candidate.content.parts || candidate.content.parts.length === 0) {
      console.error("[TTS] No content parts in candidate");
      throw new Error("Candidate content has no parts");
    }
    
    const part = candidate.content.parts[0];
    console.log("[TTS] part:", part);
    console.log("[TTS] part.inlineData:", part.inlineData);
    
    if (!part.inlineData) {
      console.error("[TTS] No inlineData in part");
      console.error("[TTS] Part structure:", JSON.stringify(part, null, 2));
      throw new Error("Response part has no inlineData. The API might not have returned audio data.");
    }
    
    const base64Audio = part.inlineData.data;
    
    if (!base64Audio) {
      console.error("[TTS] No data in inlineData");
      console.error("[TTS] inlineData structure:", JSON.stringify(part.inlineData, null, 2));
      throw new Error("Audio data is missing from response");
    }
    
    console.log("[TTS] Successfully extracted audio data, length:", base64Audio.length);
    return base64Audio;
  } catch (error: any) {
    console.error("[TTS] Error:", error);
    console.error("[TTS] Error details:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      name: error?.name,
      stack: error?.stack?.substring(0, 500)
    });
    
    // Re-throw with more context
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to generate speech: ${error?.message || String(error)}`);
  }
};

export const getChatResponse = async (
  message: string, 
  contextMaterial: string,
  history: { role: 'user' | 'model', text: string }[]
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "I'm missing my API Key! Please ask your tutor to check their settings.";
  
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are a friendly and helpful Mandarin tutor for a teenager. 
  The student is currently interacting with this content:
  ---
  ${contextMaterial.substring(0, 4000)}
  ---
  Answer their questions about this material or Mandarin in general. Keep answers brief, encouraging, and clear.`;

  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I didn't catch that.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Sorry, I'm having trouble thinking right now.";
  }
};

// --- Vocabulary Specific Functions ---

export const generateVocabularyList = async (category: string): Promise<VocabWord[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error: any = new Error("MISSING_API_KEY");
    error.message = 'MISSING_API_KEY';
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Generate a list of 12 common, essential Mandarin vocabulary words for the category: "${category}".
    Target level: IGCSE / HSK 2-3.
    
    Return ONLY a JSON array with objects containing:
    - character (Simplified Chinese)
    - pinyin (with tone marks)
    - meaning (English)

    Output format: STRICT JSON array. NO markdown. NO trailing commas.
    Example: [{"character": "苹果", "pinyin": "píng guǒ", "meaning": "apple"}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    let text = response.text || "[]";
    const parsed = safeJsonParse(text, []);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Vocab List Error:", error);
    return [];
  }
};

export const generateWordDetails = async (word: string): Promise<WordDetails | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Provide details for the Chinese word: "${word}".
    Return a JSON object with:
    - character
    - pinyin
    - meaning
    - exampleSentenceCh (Simple sentence using the word)
    - exampleSentenceEn (English translation of the sentence)

    Output format: STRICT JSON object. NO markdown. NO trailing commas.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });
    
    let text = response.text || "{}";
    return safeJsonParse(text, null);
  } catch (error) {
    console.error("Word Detail Error:", error);
    return null;
  }
};
