import { Handler } from '@netlify/functions';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import OpenAI from "openai";

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

export const handler: Handler = async (event, context) => {
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, ...params } = body;

    // Get API keys from environment variables (set in Netlify)
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!geminiApiKey && action !== 'check-keys') {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
      };
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

Remember: Make it fun, simple, and full of examples!`;
        
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

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ result: result || "## Error\nNo content generated." }),
        };
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

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ result: exercises }),
        };
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
              return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ result: `data:image/png;base64,${part.inlineData.data}` }),
              };
            }
          }
        }
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ result: null }),
        };
      }

      case 'generateSpeech': {
        const { text } = params;
        const speechText = text.replace(/[*#_]/g, '').substring(0, 500);
        
        if (!speechText.trim()) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Text to convert is empty' }),
          };
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
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                result: { 
                  audioData: base64Audio, 
                  format: 'openai',
                  mimeType: 'audio/mpeg'
                } 
              }),
            };
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
            model: 'gemini-2.5-pro-preview-tts',
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
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'No candidates in response' }),
          };
        }

        const candidate = result.candidates[0];
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: `TTS request finished with reason: ${candidate.finishReason}` }),
          };
        }

        const audioData = candidate.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) {
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'No audio data in response' }),
          };
        }

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ result: audioData }),
        };
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

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ result: vocabList }),
        };
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

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ result: parsed }),
        };
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
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ result: result.text || "I didn't catch that." }),
        };
      }

      case 'evaluateAnswer': {
        const { question, correctAnswer, studentAnswer, questionType } = params;
        
        if (!question || correctAnswer === undefined || studentAnswer === undefined) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Missing required parameters: question, correctAnswer, studentAnswer' }),
          };
        }

        if (!geminiApiKey) {
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
          };
        }

        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        
        const prompt = `You are an IGCSE Mandarin teacher evaluating a student's answer. Evaluate the student's answer and provide a percentage score from 0 to 100.

Question: ${question}
Question Type: ${questionType || 'general'}
Correct Answer: ${correctAnswer}
Student's Answer: ${studentAnswer}

**IMPORTANT - Partial Credit Rules:**
You MUST give partial credit for partially correct answers. Be generous with partial credit to encourage learning.

**Scoring Guidelines:**
- 100%: Answer is completely correct or demonstrates full understanding
- 90-95%: Almost perfect, only minor spelling/formatting/punctuation errors
- 80-89%: Mostly correct, missing one small detail or has minor errors
- 70-79%: Most content is correct, missing some details or has noticeable errors
- 60-69%: More than half correct, shows good understanding but incomplete
- 50-59%: HALF correct - if about 50% of the answer is right and 50% is wrong, give 50%
- 40-49%: Less than half correct, but some meaningful understanding shown
- 30-39%: Some relevant information but majority is incorrect
- 20-29%: Very little correct, mostly incorrect but shows attempt
- 10-19%: Almost completely wrong, minimal understanding
- 0-9%: Completely incorrect, no understanding demonstrated

**For half-right, half-wrong answers specifically:**
- If approximately 50% of the answer is correct (e.g., half the characters are right, or meaning is partially correct), give 50%
- If student got the main concept but got some details wrong, give 60-70%
- If student got some parts right but missing other parts, calculate based on what percentage is correct

**Evaluation Factors (weight evenly):**
1. Correctness of Chinese characters/words (if applicable)
2. Correctness of pinyin pronunciation (if applicable)
3. Meaning/translation accuracy
4. Grammar and sentence structure (if applicable)
5. Overall understanding demonstrated

**Example Scoring Scenarios:**
- Student writes "你好" when correct answer is "你好" (hello) → 100%
- Student writes "你号" when correct answer is "你好" (one character wrong) → 70-80%
- Student writes "好" when correct answer is "你好" (missing one character) → 50-60%
- Student writes "你好" when correct answer is "你好，我是老师" (correct part but incomplete) → 50%
- Student writes something completely unrelated → 0-10%

Return ONLY a JSON object with this exact format:
{
  "score": <number from 0 to 100>,
  "feedback": "<brief, encouraging explanation of why this score was given, mention what was correct and what needs improvement>"
}

Do not include any other text, just the JSON object.`;

        const result = await callWithRetry(async () => {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              maxOutputTokens: 500,
            }
          });
          return response.text;
        });

        let text = result || "";
        const parsed = safeJsonParse(text, { score: 0, feedback: 'Unable to evaluate answer.' });
        
        // Ensure score is between 0 and 100
        const score = Math.max(0, Math.min(100, Math.round(parsed.score || 0)));
        const feedback = parsed.feedback || 'Evaluation completed.';

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ result: { score, feedback } }),
        };
      }

      case 'check-keys': {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ 
            geminiConfigured: !!geminiApiKey,
            openaiConfigured: !!openaiApiKey 
          }),
        };
      }

      default:
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: `Unknown action: ${action}` }),
        };
    }
  } catch (error: any) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error?.message || 'Internal server error',
        details: error?.stack 
      }),
    };
  }
};

