import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import OpenAI from "openai";
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Helper for exponential backoff retry
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
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
  clean = clean.replace(/```json/g, '').replace(/```/g, '');
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  let start = -1;
  if (firstBrace === -1 && firstBracket === -1) {
    return text; 
  }
  if (firstBrace !== -1 && firstBracket === -1) start = firstBrace;
  else if (firstBrace === -1 && firstBracket !== -1) start = firstBracket;
  else start = Math.min(firstBrace, firstBracket);
  let end = -1;
  if (clean[start] === '{') {
      end = clean.lastIndexOf('}');
  } else {
      end = clean.lastIndexOf(']');
  }
  if (end !== -1 && end > start) {
      clean = clean.substring(start, end + 1);
  }
  clean = clean.replace(/\/\/.*$/gm, '');
  clean = clean.replace(/,(\s*[\]}])/g, '$1');
  return clean;
};

const safeJsonParse = <T>(text: string, fallback: T): T => {
    try {
        const cleaned = cleanJsonString(text);
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Parse failed", e);
        return fallback;
    }
};

// Supabase client initialization
const getSupabaseClient = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://ujyjsmlasctasluxpuyn.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqeWpzbWxhc2N0YXNsdXhwdXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0ODM3MDAsImV4cCI6MjA2MTA1OTcwMH0.0GXUKWhJ8Ck9zSkslKvrKOhFnsi-5jO0TT4qLAH5yf4';
  
  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("Failed to initialize Supabase client", e);
    return null;
  }
};

// Fetch tutor-adjusted examples from Supabase for few-shot learning
const fetchTutorExamples = async (limit: number = 5): Promise<Array<{
  question: string;
  correctAnswer: string;
  studentAnswer: string;
  aiScore: number;
  tutorAdjustedScore: number;
  tutorComment?: string;
}>> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('[TutorExamples] Supabase not available, skipping tutor examples');
    return [];
  }

  try {
    // Fetch recent lessons (we'll filter for tutor adjustments in code)
    // PostgREST JSONB filtering can be tricky, so we fetch more and filter client-side
    const { data, error } = await supabase
      .from('lessons')
      .select('data')
      .order('created_at', { ascending: false })
      .limit(limit * 5); // Fetch more than needed to filter

    if (error) {
      console.warn('[TutorExamples] Error fetching tutor examples:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const examples: Array<{
      question: string;
      correctAnswer: string;
      studentAnswer: string;
      aiScore: number;
      tutorAdjustedScore: number;
      tutorComment?: string;
    }> = [];

    // Extract examples from lessons
    for (const row of data) {
      const lesson = row.data as any;
      if (!lesson.exercises || !lesson.exerciseScores || !lesson.tutorAdjustedScores || !lesson.userAnswers) {
        continue;
      }

      // Extract examples where tutor adjusted the score
      for (let i = 0; i < lesson.exercises.length && examples.length < limit; i++) {
        const exercise = lesson.exercises[i];
        const aiScore = lesson.exerciseScores[i];
        const tutorScore = lesson.tutorAdjustedScores[i];
        const studentAnswer = lesson.userAnswers[i];

        // Only include examples where tutor made a change
        if (tutorScore !== undefined && tutorScore !== null && aiScore !== tutorScore && exercise.answer && studentAnswer) {
          examples.push({
            question: exercise.question || '',
            correctAnswer: exercise.answer,
            studentAnswer: studentAnswer,
            aiScore: aiScore || 0,
            tutorAdjustedScore: tutorScore,
            tutorComment: lesson.tutorComments?.[i] || undefined
          });
        }
      }
    }

    return examples.slice(0, limit);
  } catch (error) {
    console.warn('[TutorExamples] Error processing tutor examples:', error);
    return [];
  }
};

// Rule-based scoring function for Chinese text evaluation
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
  // Chinese characters are in Unicode range \u4e00-\u9fff
  const extractChineseChars = (text: string): string => {
    return text.split('').filter(char => /[\u4e00-\u9fff]/.test(char)).join('');
  };
  
  // Extract punctuation (Chinese and English punctuation)
  const extractPunctuation = (text: string): string[] => {
    // Common Chinese punctuation: ，。！？；：、""''（）【】《》
    // Common English punctuation: , . ! ? ; : - " ' ( ) [ ] { }
    return text.split('').filter(char => /[，。！？；：、""''（）【】《》,.!?;:\-"'()\[\]{}]/.test(char));
  };
  
  const correctChars = extractChineseChars(correct);
  const studentChars = extractChineseChars(student);
  const correctPunctuation = extractPunctuation(correct);
  const studentPunctuation = extractPunctuation(student);
  
  // Check if Chinese characters match
  const charsMatch = correctChars === studentChars;
  
  // Check for any overlap (at least one Chinese character in common)
  const hasOverlap = correctChars.length > 0 && studentChars.length > 0 && 
    [...correctChars].some(char => studentChars.includes(char));
  
  // Check if punctuation matches (any correct punctuation)
  const hasCorrectPunctuation = correctPunctuation.length > 0 && 
    correctPunctuation.some(p => studentPunctuation.includes(p));
  
  // Check if all punctuation is different (only if there's punctuation in correct answer)
  const allPunctuationDifferent = correctPunctuation.length > 0 && 
    !correctPunctuation.some(p => studentPunctuation.includes(p));
  
  // Check if there's no punctuation in correct answer
  const noPunctuationInCorrect = correctPunctuation.length === 0;
  
  // Apply scoring rules in priority order
  if (charsMatch) {
    // Chinese characters match - check punctuation cases
    if (noPunctuationInCorrect) {
      // No punctuation in correct answer
      if (studentPunctuation.length === 0) {
        // This should have been caught by exact match, but just in case
        return {
          score: 100,
          feedback: 'Perfect! Your answer is correct.'
        };
      } else {
        // Student has extra punctuation
        return {
          score: 75,
          feedback: 'Excellent! Your Chinese characters are correct, but you have extra punctuation that should be removed.'
        };
      }
    } else if (hasCorrectPunctuation) {
      // 3. Chinese characters match + any correct punctuation → 75%
      return {
        score: 75,
        feedback: 'Great! Your Chinese characters are correct and you have some correct punctuation. Just need to match all punctuation exactly.'
      };
    } else if (allPunctuationDifferent) {
      // 2. Chinese characters match, but punctuation all different → 50%
      return {
        score: 50,
        feedback: 'Good! Your Chinese characters are correct, but the punctuation needs to match the correct answer.'
      };
    } else {
      // Chars match but punctuation situation is unclear (shouldn't happen, but fallback)
      return {
        score: 75,
        feedback: 'Excellent! Your Chinese characters are correct. Check the punctuation carefully.'
      };
    }
  } else if (hasOverlap) {
    // 1. Any overlap → 25%
    return {
      score: 25,
      feedback: 'You have some correct characters, but the answer needs more work. Keep practicing!'
    };
  } else {
    // No overlap → 0%
    return {
      score: 0,
      feedback: 'The answer is incorrect. Please review the correct answer and try again.'
    };
  }
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, ...params } = body || {};

    // Get API keys from environment variables
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!geminiApiKey && action !== 'check-keys') {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    switch (action) {
      case 'generateLearningMaterial': {
        const { stage, topic, point } = params;
        const ai = new GoogleGenAI({ apiKey: geminiApiKey! });
        
        const prompt = `You are a friendly and enthusiastic IGCSE Mandarin tutor speaking to a teenager. Your goal is to make learning fun and easy to understand.

Generate learning material for:
- Stage: ${stage}
- Topic: ${topic}
- Learning Point: ${point}

**IMPORTANT GUIDELINES:**

1. **Language Style:**
   - Use simple, conversational English (like talking to a friend)
   - Avoid complex academic jargon
   - Be encouraging and positive
   - Use short sentences and clear explanations
   - Add enthusiasm! Use exclamation marks and friendly phrases like "Let's learn together!" or "This is so cool!"

2. **Structure:**
   - Use markdown headers (##, ###) for sections
   - Use "---" on a new line to separate each major section
   - Break content into small, digestible chunks

3. **Examples are CRITICAL:**
   - Include AT LEAST 3-5 examples for every concept you explain
   - Show examples in this format: **Chinese Characters (Pinyin)** - *English Meaning*
   - Use real-world, relatable examples that teenagers can connect with
   - Include example sentences showing how to use the concept
   - Make examples fun and memorable (use names, places, or situations teens relate to)

4. **Content Requirements:**
   - Start with a friendly introduction that gets students excited
   - Explain concepts step-by-step in simple terms
   - Use analogies or comparisons to make things easier to understand
   - Include visual descriptions when helpful
   - End each section with a quick summary or "Key Takeaway"

5. **Format:**
   - Every time you use Chinese text, ALWAYS provide: **Characters (Pinyin)** - *English*
   - Use bullet points for lists
   - Use bold text for important terms
   - Keep paragraphs short (2-3 sentences max)

**Example of good content style:**
"Hey! Let's learn about greetings! 🎉 This is super useful - you'll use these every day!

**你好 (nǐ hǎo)** - *Hello*
This is the most common greeting! Think of it like saying "hi" to your friends.

**Examples:**
- When you meet a friend: **你好！(nǐ hǎo!)** - *Hello!*
- When you see your teacher: **老师，你好！(lǎo shī, nǐ hǎo!)** - *Teacher, hello!*
- In the morning: **早上好 (zǎo shàng hǎo)** - *Good morning!*

See how easy that is? Now you can greet anyone! 😊"

Remember: Make it fun, simple, and full of examples! The objective is to make the learning texts punchy, concise, user friendly.`;
        
        const result = await callWithRetry(async () => {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              maxOutputTokens: 6000, // Increased for more examples
            }
          });
          return response.text;
        });

        return NextResponse.json({ result: result || "## Error\nNo content generated." });
      }

      case 'generateExercises': {
        const { stage, topic, point } = params;
        const ai = new GoogleGenAI({ apiKey: geminiApiKey! });
        
        const prompt = `Generate 5-8 exercises for IGCSE Mandarin:
Stage: ${stage}, Topic: ${topic}, Point: ${point}

Return JSON array with exercises. Each exercise: { "type": "quiz"|"translation", "question": "Chinese text", "questionTranslation": "English", "answer": "...", "options": [...] }`;
        
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
        const exercises = parsed.exercises && Array.isArray(parsed.exercises) ? parsed.exercises : (Array.isArray(parsed) ? parsed : []);

        return NextResponse.json({ result: exercises });
      }

      case 'generateImage': {
        const { context: imageContext } = params;
        const ai = new GoogleGenAI({ apiKey: geminiApiKey! });
        
        const prompt = `Draw a simple, friendly, flat-design illustration (vector art style, solid colors) for a Mandarin Chinese educational app. Context: ${imageContext.substring(0, 150)}. The image should be culturally neutral or positive, suitable for teenagers. No text in the image. White background preferred.`;
        
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
              return NextResponse.json({ result: `data:image/png;base64,${part.inlineData.data}` });
            }
          }
        }
        return NextResponse.json({ result: null });
      }

      case 'generateSpeech': {
        const { text } = params;
        const speechText = text.replace(/[*#_]/g, '').substring(0, 500);
        
        if (!speechText.trim()) {
          return NextResponse.json({ error: 'Text to convert is empty' }, { status: 400 });
        }

        const trimmedText = speechText.trim();
        const isSingleCharacter = trimmedText.length === 1 && /[\u4e00-\u9fa5]/.test(trimmedText);
        
        // Try OpenAI TTS first for single characters
        if (isSingleCharacter && openaiApiKey) {
          try {
            const openai = new OpenAI({ apiKey: openaiApiKey });
            const response = await openai.audio.speech.create({
              model: "tts-1",
              voice: "alloy",
              input: trimmedText,
            });
            const arrayBuffer = await response.arrayBuffer();
            // Convert ArrayBuffer to base64 string
            const buffer = Buffer.from(arrayBuffer);
            const base64Audio = buffer.toString('base64');
            return NextResponse.json({ 
              result: { 
                audioData: base64Audio, 
                format: 'openai',
                mimeType: 'audio/mpeg'
              } 
            });
          } catch (error) {
            console.log("[TTS] OpenAI TTS failed, falling back to Gemini:", error);
          }
        }

        // Use Gemini TTS
        const ai = new GoogleGenAI({ apiKey: geminiApiKey! });
        let finalText = trimmedText;
        if (isSingleCharacter) {
          finalText = `${trimmedText}，${trimmedText}`;
        }

        const result = await callWithRetry(async () => {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: finalText }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
              },
            },
          });
          return response;
        }, 1);

        if (!result.candidates || result.candidates.length === 0) {
          return NextResponse.json({ error: 'No candidates in response' }, { status: 500 });
        }

        const candidate = result.candidates[0];
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          return NextResponse.json({ error: `TTS request finished with reason: ${candidate.finishReason}` }, { status: 500 });
        }

        const audioData = candidate.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) {
          return NextResponse.json({ error: 'No audio data in response' }, { status: 500 });
        }

        return NextResponse.json({ result: audioData });
      }

      case 'generateVocabularyList': {
        const { category } = params;
        const ai = new GoogleGenAI({ apiKey: geminiApiKey! });
        
        const prompt = `Generate a list of 12 common, essential Mandarin vocabulary words for the category: "${category}".
Target level: IGCSE / HSK 2-3.
Return ONLY a JSON array with objects containing: character (Simplified Chinese), pinyin (with tone marks), meaning (English).
Output format: STRICT JSON array. NO markdown. NO trailing commas.`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        let text = response.text || "[]";
        const parsed = safeJsonParse(text, []);
        const vocabList = Array.isArray(parsed) ? parsed : [];

        return NextResponse.json({ result: vocabList });
      }

      case 'generateWordDetails': {
        const { character } = params;
        const ai = new GoogleGenAI({ apiKey: geminiApiKey! });
        
        const prompt = `For the Chinese character "${character}", provide:
- pinyin (with tone marks)
- meaning (English)
- exampleSentenceCh (Chinese sentence using this character)
- exampleSentenceEn (English translation)

Return JSON: { "character": "${character}", "pinyin": "...", "meaning": "...", "exampleSentenceCh": "...", "exampleSentenceEn": "..." }`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        
        let text = response.text || "{}";
        const parsed = safeJsonParse(text, null);

        return NextResponse.json({ result: parsed });
      }

      case 'getChatResponse': {
        const { message, contextMaterial, history } = params;
        const ai = new GoogleGenAI({ apiKey: geminiApiKey! });
        
        const systemInstruction = `You are a friendly and helpful Mandarin tutor for a teenager. 
The student is currently interacting with this content:
---
${contextMaterial.substring(0, 4000)}
---
Answer their questions about this material or Mandarin in general. Keep answers brief, encouraging, and clear.`;

        const chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: { systemInstruction },
          history: history.map((h: any) => ({
            role: h.role,
            parts: [{ text: h.text }]
          }))
        });

        const result = await chat.sendMessage({ message });
        return NextResponse.json({ result: result.text || "I didn't catch that." });
      }

      case 'evaluateAnswer': {
        const { question, correctAnswer, studentAnswer, questionType } = params;
        
        if (!question || correctAnswer === undefined || studentAnswer === undefined) {
          return NextResponse.json({ error: 'Missing required parameters: question, correctAnswer, studentAnswer' }, { status: 400 });
        }

        // For choice questions (quiz type), use binary scoring (100% or 0%)
        let ruleBasedResult: { score: number; feedback: string };
        if (questionType === 'quiz') {
          console.log('[EvaluateAnswer] Using binary scoring for choice question');
          console.log('[EvaluateAnswer] Correct answer:', JSON.stringify(correctAnswer));
          console.log('[EvaluateAnswer] Student answer:', JSON.stringify(studentAnswer));
          
          // Normalize both answers: trim whitespace and compare
          const correct = correctAnswer.trim();
          const student = studentAnswer.trim();
          
          // For quiz questions, do exact match (case-sensitive for Chinese, but handle whitespace)
          const isMatch = correct === student;
          
          console.log('[EvaluateAnswer] Comparison result:', isMatch);
          
          if (isMatch) {
            ruleBasedResult = {
              score: 100,
              feedback: 'Correct! Great job!'
            };
          } else {
            ruleBasedResult = {
              score: 0,
              feedback: 'Incorrect. Please review the correct answer and try again.'
            };
          }
        } else {
          // For translation/composition, use nuanced rule-based scoring
          console.log('[EvaluateAnswer] Using rule-based scoring for text answer');
          ruleBasedResult = calculateRuleBasedScore(correctAnswer, studentAnswer);
        }
        
        // AI feedback enhancement is currently disabled to improve performance
        const finalFeedback = ruleBasedResult.feedback;

        return NextResponse.json({ 
          result: { 
            score: ruleBasedResult.score, 
            feedback: finalFeedback 
          } 
        });
      }

      case 'check-keys': {
        return NextResponse.json({ 
          geminiConfigured: !!geminiApiKey,
          openaiConfigured: !!openaiApiKey 
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Function error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Internal server error',
      details: error?.stack 
    }, { status: 500 });
  }
}
