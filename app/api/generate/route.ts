import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, Output, experimental_generateSpeech as generateSpeech } from 'ai';
import { z } from 'zod';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const getSupabaseClient = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://ujyjsmlasctasluxpuyn.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("Failed to initialize Supabase client", e);
    return null;
  }
};

// FULL RESTORE of the user's comprehensive scoring engine for Backend
const calculateRuleBasedScore = (correctAnswer: string, studentAnswer: string): { score: number; feedback: string } => {
  const correct = correctAnswer.trim();
  const student = studentAnswer.trim();
  if (correct === student) return { score: 100, feedback: 'Perfect! Your answer is exactly correct.' };
  
  const extractChars = (text: string): string => text.split('').filter(char => /[\u4e00-\u9fff]/.test(char)).join('');
  const extractPunctuation = (text: string): string[] => text.split('').filter(char => /[，。！？；：、""''（）【】《》,.!?;:\-"'()\[\]{}]/.test(char));
  
  const correctChars = extractChars(correct);
  const studentChars = extractChars(student);
  const correctPunctuation = extractPunctuation(correct);
  const studentPunctuation = extractPunctuation(student);
  
  const charsMatch = correctChars !== '' && correctChars === studentChars;
  const hasOverlap = correctChars.length > 0 && studentChars.length > 0 && [...correctChars].some(char => studentChars.includes(char));
  const hasCorrectPunctuation = correctPunctuation.length > 0 && correctPunctuation.some(p => studentPunctuation.includes(p));
  const allPunctuationDifferent = correctPunctuation.length > 0 && !correctPunctuation.some(p => studentPunctuation.includes(p));
  const noPunctuationInCorrect = correctPunctuation.length === 0;
  
  if (charsMatch) {
    if (noPunctuationInCorrect) {
      return studentPunctuation.length === 0 ? { score: 100, feedback: 'Perfect! Your answer is correct.' } : { score: 75, feedback: 'Excellent! Your Chinese characters are correct, but you have extra punctuation.' };
    } else if (hasCorrectPunctuation) {
      return { score: 75, feedback: 'Great! Your Chinese characters are correct and you have some correct punctuation.' };
    } else if (allPunctuationDifferent) {
      return { score: 50, feedback: 'Good! Your Chinese characters are correct, but the punctuation needs work.' };
    }
    return { score: 75, feedback: 'Excellent! Your Chinese characters are correct.' };
  } else if (hasOverlap) {
    return { score: 25, feedback: 'You have some correct characters, but the answer needs more work.' };
  }
  return { score: 0, feedback: 'Review the correct answer and try again.' };
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, ...params } = body || {};

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!geminiApiKey && action !== 'check-keys') {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey! });
    const openai = createOpenAI({ apiKey: openaiApiKey || '' });

    const gemini3 = google('gemini-3-flash-preview');
    const geminiImage = google('gemini-2.5-flash-image');
    const openaiSpeech = openai.speech('gpt-4o-mini-tts');

    switch (action) {
      case 'generateLearningMaterial': {
        const { stage, topic, point } = params;
        const { text } = await generateText({
          model: gemini3,
          messages: [{
            role: 'user',
            content: [{ type: 'text', text: `You are a friendly and enthusiastic IGCSE Mandarin tutor speaking to a teenager. Your goal is to make learning fun and easy to understand.

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
   - Include 3 examples for every concept you explain
   - Show examples in this format: **Chinese Characters (Pinyin)** - *English Meaning*
   - Use real-world, relatable examples that teenagers can connect with
   - Include example sentences showing how to use the concept
   - Make examples fun and memorable (use names, places, or situations teens relate to)

4. **Content Requirements:**
   - No greeting
   - Start with a introduction to the content and a summary of key concepts in this session
   - Explain concepts step-by-step in simple terms
   - Use analogies or comparisons to make things easier to understand
   - Include visual descriptions when helpful
   - End each section with a quick summary or "Key Takeaway"
   - End with a reminder to practice the exercises
   - All content should be related with the topic or learning points
   - No general conversation such as greeting or goodbye paragraphes 
   
5. **Format:**
   - Every time you use Chinese text, ALWAYS provide: **Characters (Pinyin)** - *English*
   - Use bullet points for lists
   - Use bold text for important terms
   - Keep paragraphs short (2-3 sentences max)

**Example of good content style:**
"Let's learn about greetings! 🎉 This is super useful - you'll use these every day!

**你好 (nǐ hǎo)** - *Hello*
This is the most common greeting! Think of it like saying "hi" to your friends.

**Examples:**
- When you meet a friend: **你好！(nǐ hǎo!)** - *Hello!*
- When you see your teacher: **老师，你好！(lǎo shī, nǐ hǎo!)** - *Teacher, hello!*
- In the morning: **早上好 (zǎo shàng hǎo)** - *Good morning!*

Remember: Make it fun, simple, and full of examples! The objective is to make the learning texts punchy, concise, user friendly.` }]
          }]
        });
        return NextResponse.json({ result: text });
      }

      case 'generateExercises': {
        const { stage, topic, point } = params;
        const { output } = await generateText({
          model: gemini3,
          output: Output.object({
            schema: z.object({
              exercises: z.array(z.object({
                type: z.enum(['quiz', 'translation']),
                question: z.string(),
                questionTranslation: z.string(),
                answer: z.string(),
                options: z.array(z.string()).optional(),
              }))
            })
          }),
          messages: [{
            role: 'user',
            content: [{ type: 'text', text: `Generate 5-8 exercises for IGCSE Mandarin:
Stage: ${stage}, Topic: ${topic}, Point: ${point}

Return JSON array with exercises.` }]
          }]
        });
        return NextResponse.json({ result: output.exercises });
      }

      case 'generateVocabularyList': {
        const { category } = params;
        const { output } = await generateText({
            model: gemini3,
            output: Output.object({
                schema: z.object({
                    vocab: z.array(z.object({
                      character: z.string(),
                      pinyin: z.string(),
                      meaning: z.string()
                    }))
                })
            }),
            messages: [{
                role: 'user',
                content: [{ type: 'text', text: `Generate a list of 12 common, essential Mandarin vocabulary words for the category: "${category}". 
            Target level: IGCSE / HSK 2-3. Return character (Simplified Chinese), pinyin (with tone marks), meaning (English).` }]
            }]
        });
        return NextResponse.json({ result: output.vocab });
      }

      case 'generateWordDetails': {
        const { character } = params;
        const { output } = await generateText({
          model: gemini3,
          output: Output.object({
            schema: z.object({
                character: z.string(),
                pinyin: z.string(),
                meaning: z.string(),
                examples: z.array(z.string()),
            })
          }),
          messages: [{
            role: 'user',
            content: [{ type: 'text', text: `For the Chinese character "${character}", provide pinyin, meaning, and 3 example sentences in Chinese with their English translations (formatted as "Chinese - English").` }]
          }]
        });
        return NextResponse.json({ result: output });
      }

      case 'getChatResponse': {
        const { message, contextMaterial, history } = params;
        const { text } = await generateText({
          model: gemini3,
          system: `You are a friendly and helpful Mandarin tutor for a teenager. 
The student is currently interacting with this content:
---
${contextMaterial.substring(0, 4000)}
---
Answer their questions about this material or Mandarin in general. Keep answers brief, encouraging, and clear.`,
          messages: history.map((h: any) => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: [{ type: 'text', text: h.text }]
          })).concat([{ role: 'user', content: [{ type: 'text', text: message }] }])
        });
        return NextResponse.json({ result: text });
      }

      case 'generateImage': {
        const { context: imageContext } = params;
        const { text } = await generateText({
            model: geminiImage,
            messages: [{
                role: 'user',
                content: [{ type: 'text', text: `Draw a simple, friendly, flat-design illustration (vector art style, solid colors) for a Mandarin Chinese educational app. Context: ${imageContext.substring(0, 150)}. The image should be culturally neutral or positive, suitable for teenagers. No text in the image. White background preferred.` }]
            }]
        });
        return NextResponse.json({ result: text.startsWith('data:') ? text : `data:image/png;base64,${text}` });
      }

      case 'generateSpeech': {
        const { text: sttText } = params;
        if (!openaiApiKey) return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 500 });
        const { audio } = await generateSpeech({
            model: openaiSpeech,
            text: sttText,
            voice: 'nova',
            language: 'zh', // Explicitly setting language for Mandarin
            instructions: "Speak clearly as a helpful Mandarin tutor for a teenager.",
        });
        return NextResponse.json({ result: audio.base64 });
      }

      case 'evaluateAnswer': {
        const { correctAnswer, studentAnswer, questionType } = params;
        if (questionType === 'quiz') {
          const isCorrect = correctAnswer.trim() === studentAnswer.trim();
          return NextResponse.json({ result: { score: isCorrect ? 100 : 0, feedback: isCorrect ? 'Correct!' : 'Incorrect.' } });
        }
        return NextResponse.json({ result: calculateRuleBasedScore(correctAnswer, studentAnswer) });
      }

      case 'check-keys': {
        return NextResponse.json({ 
          result: {
            geminiConfigured: !!geminiApiKey,
            openaiConfigured: !!openaiApiKey 
          }
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
