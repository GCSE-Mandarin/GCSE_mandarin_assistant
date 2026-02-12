import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AssignedLesson, Exercise } from '../types';
import { updateLesson } from '@/lib/services/storage';
import { generateImage, generateSpeech, getChatResponse, evaluateAnswer } from '@/lib/services/geminiService';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, BookOpen, PenTool, ChevronRight, GraduationCap, Home, ChevronLeft, Volume2, Sparkles, MessageCircle, Send, X, Loader2, Check, ArrowRight, Languages, Eye } from 'lucide-react';

interface Props {
  lesson: AssignedLesson;
  onBack: () => void;
}

type InternalView = 'menu' | 'learn' | 'practice';
type FeedbackStatus = 'idle' | 'correct' | 'incorrect';

// Helper for audio decoding
function decode(base64: string) {
  const clean = base64.replace(/\s/g, '');
  try {
    const binaryString = atob(clean);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Base64 decode failed", e);
    return new Uint8Array(0);
  }
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  if (data.length === 0) {
      return ctx.createBuffer(numChannels, 1, sampleRate);
  }
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// StudentLessonView
export const StudentLessonView: React.FC<Props> = ({ lesson, onBack }) => {
  const [view, setView] = useState<InternalView>('menu');
  
  // Shared State
  const [answers, setAnswers] = useState<string[]>(
    lesson.userAnswers || new Array(lesson.exercises.length).fill('')
  );
  const [submitted, setSubmitted] = useState(lesson.completed);
  // Use tutor-adjusted score if available, otherwise use original score
  const [score, setScore] = useState(lesson.score || 0);
  // Use tutor-adjusted scores if available, otherwise use exercise scores
  const originalExerciseScores = lesson.exerciseScores || new Array(lesson.exercises.length).fill(0);
  const tutorAdjustedScores = lesson.tutorAdjustedScores || originalExerciseScores;
  const [exerciseScores, setExerciseScores] = useState<number[]>(tutorAdjustedScores);
  const [exerciseFeedback, setExerciseFeedback] = useState<string[]>(
    lesson.exerciseFeedback || new Array(lesson.exercises.length).fill('')
  );

  // Practice Mode State
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>('idle');
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [currentFeedback, setCurrentFeedback] = useState<string>('');
  const [evaluating, setEvaluating] = useState(false);
  const [exerciseImages, setExerciseImages] = useState<Record<number, string>>({});
  const [imgLoading, setImgLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showResultDetail, setShowResultDetail] = useState(false);
  
  // Learning Mode State
  const [currentSection, setCurrentSection] = useState(0);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Audio State
  const [audioLoading, setAudioLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Audio State

  // Parse material into sections - split into smaller chunks (one point or example per page)
  const sections = useMemo(() => {
    if (!lesson.material) return [];
    
    // First split by major sections (---)
    let majorSections: string[] = [];
    if (lesson.material.includes('---')) {
      majorSections = lesson.material
        .split('---')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    } else {
    const raw = `\n${lesson.material}`;
    const parts = raw.split(/\n(?=#{1,3}\s)/g).filter(p => p.trim().length > 0);
      majorSections = parts.length > 0 ? parts : [lesson.material];
    }
    
    // Now split each major section into smaller chunks
    const chunks: string[] = [];
    
    majorSections.forEach(section => {
      const lines = section.split('\n');
      let currentChunk = '';
      let inList = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Check if this is a bullet point or list item
        const isBullet = /^[-*•]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed);
        // Check if this looks like an example (contains Chinese characters with pinyin pattern)
        const isExample = /[\u4e00-\u9fa5].*\([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+.*\)/.test(trimmed) || 
                         /^[*•-]\s.*[\u4e00-\u9fa5]/.test(trimmed) ||
                         /^Example|^例子|^For example/i.test(trimmed);
        
        // If we hit a new bullet/example and have content, save current chunk
        if ((isBullet || isExample) && currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = line + '\n';
          inList = true;
        } 
        // If we hit a header and have content, save current chunk
        else if (/^#{1,3}\s/.test(trimmed) && currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = line + '\n';
          inList = false;
        }
        // If we hit a blank line after a list item, save that chunk
        else if (trimmed === '' && inList && currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
          inList = false;
        }
        // Otherwise, add to current chunk
        else {
          currentChunk += line + '\n';
          if (isBullet || isExample) {
            inList = true;
          }
        }
      }
      
      // Don't forget the last chunk
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    });
    
    // If no chunks were created (no bullets/examples found), split by paragraphs
    if (chunks.length === 0) {
      majorSections.forEach(section => {
        const paragraphs = section.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        chunks.push(...paragraphs);
      });
    }
    
    // If still no chunks, just use the original sections
    return chunks.length > 0 ? chunks : majorSections;
  }, [lesson.material]);

  // Reset visuals when section changes
  useEffect(() => {
    setGeneratedImage(null);
  }, [currentSection]);

  // Lazy load images for exercises
  useEffect(() => {
    const loadExerciseImage = async () => {
      if (view === 'practice' && !exerciseImages[practiceIndex] && !imgLoading && !submitted && !showResultDetail) {
        setImgLoading(true);
        const ex = lesson.exercises[practiceIndex];
        // Create a prompt that encourages a visual representation of the concept
        const promptContext = `Visual clue for a Chinese language exercise: "${ex.question}". The answer involves "${ex.answer}".`;
        const img = await generateImage(promptContext);
        if (img) {
          setExerciseImages(prev => ({ ...prev, [practiceIndex]: img }));
        }
        setImgLoading(false);
      }
    };
    loadExerciseImage();
  }, [view, practiceIndex, lesson.exercises, exerciseImages, imgLoading, submitted, showResultDetail]);

  const handleAnswerChange = (val: string) => {
    if (feedbackStatus !== 'idle') return;
    const newAnswers = [...answers];
    newAnswers[practiceIndex] = val;
    setAnswers(newAnswers);
  };

  const handleCheckAnswer = async () => {
    const currentEx = lesson.exercises[practiceIndex];
    const userAns = answers[practiceIndex];
    
    if (!currentEx.answer || !userAns.trim()) {
      return;
    }

    setEvaluating(true);
    setCurrentScore(null);
    setCurrentFeedback('');

    try {
      // For quiz questions, handle the case where correct answer might be a letter (A, B, C, D)
      // but student selected the option text. Map letter to option text if needed.
      let correctAnswerToCompare = currentEx.answer;
      if (currentEx.type === 'quiz' && currentEx.options && currentEx.options.length > 0) {
        const trimmedAnswer = currentEx.answer.trim();
        // Check if answer is a single letter (A-Z)
        if (/^[A-Z]$/i.test(trimmedAnswer)) {
          // Map letter to option index (A=0, B=1, C=2, D=3, etc.)
          const letterIndex = trimmedAnswer.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
          if (letterIndex >= 0 && letterIndex < currentEx.options.length) {
            correctAnswerToCompare = currentEx.options[letterIndex];
          }
        }
      }

      // Use AI to evaluate the answer and get a percentage score
      const evaluation = await evaluateAnswer(
        currentEx.question,
        correctAnswerToCompare,
        userAns,
        currentEx.type
      );

      const score = evaluation.score || 0;
      const feedback = evaluation.feedback || '';

      setCurrentScore(score);
      setCurrentFeedback(feedback);
      setFeedbackStatus(score >= 50 ? 'correct' : 'incorrect'); // Consider >= 50% as "correct" for UI purposes

      // Update exercise scores array
      const newScores = [...exerciseScores];
      newScores[practiceIndex] = score;
      setExerciseScores(newScores);

      // Update exercise feedback array
      const newFeedback = [...exerciseFeedback];
      newFeedback[practiceIndex] = feedback;
      setExerciseFeedback(newFeedback);
    } catch (error) {
      console.error('Error evaluating answer:', error);
      // Fallback to binary comparison if AI evaluation fails
    const normUser = userAns.trim().toLowerCase();
    const normCorrect = (currentEx.answer || '').trim().toLowerCase();
      const isCorrect = normUser === normCorrect;
      const fallbackScore = isCorrect ? 100 : 0;
    
      setCurrentScore(fallbackScore);
      setCurrentFeedback(isCorrect ? 'Answer is correct.' : 'Answer is incorrect.');
    setFeedbackStatus(isCorrect ? 'correct' : 'incorrect');

      const newScores = [...exerciseScores];
      newScores[practiceIndex] = fallbackScore;
      setExerciseScores(newScores);
    } finally {
      setEvaluating(false);
    }
  };

  const handleContinue = async () => {
    setShowTranslation(false); // Reset translation view for next question
    // If it's the last exercise
    if (practiceIndex >= lesson.exercises.length - 1) {
      // Calculate final average score (percentage)
      const totalScore = exerciseScores.reduce((sum, score) => sum + score, 0);
      const averageScore = exerciseScores.length > 0 ? Math.round(totalScore / exerciseScores.length) : 0;
      setScore(averageScore);
      setSubmitted(true);
      
      // Async update - SAVE USER ANSWERS, SCORES, AND FEEDBACK
      await updateLesson({
        ...lesson,
        completed: true,
        score: averageScore,
        userAnswers: answers,
        exerciseScores: exerciseScores,
        exerciseFeedback: exerciseFeedback
      });
    } else {
      setPracticeIndex(prev => prev + 1);
      setFeedbackStatus('idle');
      setCurrentScore(null);
      setCurrentFeedback('');
    }
  };

  const handleBackNavigation = () => {
    if (view === 'menu') {
      onBack();
    } else {
      setView('menu');
      setCurrentSection(0);
      setGeneratedImage(null);
      setPracticeIndex(0);
      setFeedbackStatus('idle');
      setCurrentScore(null);
      setCurrentFeedback('');
      setShowTranslation(false);
      setShowResultDetail(false);
    }
  };

  const handleNextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(curr => curr + 1);
    } else {
      setView('practice');
    }
  };

  const handlePrevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(curr => curr - 1);
    }
  };

  // --- Audio Logic ---
  const playAudio = async (text: string, chineseOnly = false) => {
    if (audioLoading) return;
    
    let textToPlay = text;
    if (chineseOnly) {
      // Regex to keep Chinese characters, numbers, and Chinese punctuation
      const matches = text.match(/[\u4e00-\u9fa50-9\u3000-\u303f\uff00-\uffef]+/g);
      if (matches) {
        textToPlay = matches.join(' ');
      }
    }

    if (!textToPlay.trim()) {
        return;
    }

    setAudioLoading(true);
    
    try {
        const speechResult = await generateSpeech(textToPlay);
        if (!speechResult) throw new Error("No audio returned");

        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        }
        
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        let audioBytes: Uint8Array;
        if (typeof speechResult === 'string') {
          audioBytes = decode(speechResult);
        } else {
          audioBytes = new Uint8Array(speechResult.audioData);
        }

        const audioBuffer = await decodeAudioData(
            audioBytes,
            ctx,
            24000,
            1
        );

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();

    } catch (e) {
        console.error("Audio playback failed", e);
    } finally {
        setAudioLoading(false);
    }
  };

  // --- MENU VIEW ---
  if (view === 'menu') {
    return (
      <div className="min-h-full bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800 line-clamp-1">{lesson.pointDescription}</h2>
            <p className="text-xs text-slate-500">{lesson.topicTitle}</p>
          </div>
        </header>

        <main className="flex-1 p-6 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <button 
              onClick={() => setView('learn')}
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all group text-left flex flex-col h-64"
            >
              <div className="bg-blue-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                <BookOpen className="text-blue-600 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Study Material</h3>
              <p className="text-slate-500 mb-auto">Interactive lessons with audio and visuals.</p>
              <div className="flex items-center text-blue-600 font-semibold mt-4">
                Start Learning <ChevronRight size={20} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button 
              onClick={() => setView('practice')}
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-300 hover:shadow-lg transition-all group text-left flex flex-col h-64"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="bg-brand-50 w-14 h-14 rounded-xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                  <PenTool className="text-brand-600 w-8 h-8" />
                </div>
                {submitted && (
                   <span className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${
                     score >= 80 ? 'bg-green-100 text-green-700' : 
                     score >= 60 ? 'bg-yellow-100 text-yellow-700' : 
                     'bg-red-100 text-red-700'
                   }`}>
                     <CheckCircle2 size={14} /> Score: {score}%
                   </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Practice Exercises</h3>
              <p className="text-slate-500 mb-auto">
                {submitted 
                  ? `Completed ${lesson.exercises.length} questions with ${score}% average` 
                  : `Complete ${lesson.exercises.length} questions to test your knowledge.`}
              </p>
              <div className="flex items-center text-brand-600 font-semibold mt-4">
                {submitted ? 'Review Results' : 'Start Exercises'} <ChevronRight size={20} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // --- LEARNING VIEW ---
  if (view === 'learn') {
    const progress = ((currentSection + 1) / sections.length) * 100;
    const isLastSection = currentSection === sections.length - 1;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col relative">
         <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <button 
            onClick={handleBackNavigation}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
          >
            <ArrowLeft size={20} /> Back to Menu
          </button>
          <div className="flex flex-col items-end">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Part {currentSection + 1} of {sections.length}</span>
             <div className="w-32 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 flex flex-col items-center">
            <div className="max-w-4xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 md:p-10 min-h-[400px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 mb-20 sm:mb-24">
                {/* Visuals Area */}
                <div className="mb-6 flex gap-2 justify-end">
                     <button 
                        onClick={() => playAudio(sections[currentSection])}
                        disabled={audioLoading}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors disabled:opacity-50"
                     >
                        {audioLoading ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                        Read Aloud
                     </button>
                     <button 
                        onClick={async () => {
                            if (generatedImage) return;
                            setImageLoading(true);
                            const img = await generateImage(sections[currentSection]);
                            if (img) setGeneratedImage(img);
                            setImageLoading(false);
                        }}
                        disabled={imageLoading || !!generatedImage}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
                            generatedImage ? 'bg-purple-100 text-purple-700' : 'bg-brand-50 hover:bg-brand-100 text-brand-600'
                        }`}
                     >
                        {imageLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {generatedImage ? 'Visualized' : 'Visualize'}
                     </button>
                </div>

                {generatedImage && (
                    <div className="mb-8 rounded-xl overflow-hidden border border-slate-100 shadow-sm animate-in fade-in zoom-in duration-500">
                        <img src={generatedImage} alt="Lesson illustration" className="w-full h-64 object-cover" />
                    </div>
                )}

                <div className="prose prose-slate max-w-none flex-1 learning-material-content">
                    <ReactMarkdown>{sections[currentSection]}</ReactMarkdown>
                </div>
            </div>
        </main>

        <footer className="bg-white border-t border-slate-200 p-4 sm:p-6 flex justify-between items-center gap-3 max-w-5xl mx-auto w-full sticky bottom-0 z-10">
            <button 
                onClick={handlePrevSection}
                disabled={currentSection === 0}
                className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm sm:text-base text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all touch-manipulation active:scale-[0.98]"
            >
                <ChevronLeft size={20} /> <span className="hidden sm:inline">Previous</span>
            </button>

            {isLastSection ? (
                <button 
                    onClick={handleNextSection}
                    className="flex items-center gap-2 px-6 sm:px-8 py-3 rounded-xl font-semibold text-sm sm:text-base bg-brand-600 hover:bg-brand-700 text-white transition-all touch-manipulation active:scale-[0.98]"
                >
                    <span className="whitespace-nowrap">Complete Lesson</span> <ChevronRight size={20} />
                </button>
            ) : (
                <button 
                    onClick={handleNextSection}
                    className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm sm:text-base text-slate-600 hover:bg-slate-100 transition-all touch-manipulation active:scale-[0.98]"
                >
                    Next <ChevronRight size={20} />
                </button>
            )}
        </footer>
      </div>
    );
  }

  // --- PRACTICE VIEW ---
  if (view === 'practice') {
    if (submitted && showResultDetail) {
      // Results Detail View
      return (
        <div className="min-h-full bg-slate-50 flex flex-col">
          <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
            <button 
              onClick={() => setShowResultDetail(false)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">Exercise Results</h2>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {lesson.exercises.map((ex, idx) => {
                const exScore = exerciseScores[idx] || 0;
                const exFeedback = exerciseFeedback[idx] || '';
                const tutorComment = (lesson.tutorComments || [])[idx] || '';
                const userAns = answers[idx] || '(No answer)';
                const borderColor = exScore === 100 ? 'border-green-300' : exScore >= 50 ? 'border-yellow-300' : 'border-red-300';
                const bgColor = exScore === 100 ? 'bg-green-50' : exScore >= 50 ? 'bg-yellow-50' : 'bg-red-50';
                const scoreColor = exScore === 100 ? 'text-green-600' : exScore >= 50 ? 'text-yellow-600' : 'text-red-600';
                const iconColor = exScore === 100 ? 'text-green-500' : exScore >= 50 ? 'text-yellow-500' : 'text-red-500';

                return (
                  <div key={idx} className={`bg-white p-6 rounded-xl border-2 ${borderColor} ${bgColor}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          exScore === 100 ? 'bg-green-500' : exScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 chinese-text text-lg">{ex.question}</h4>
                          {ex.questionTranslation && (
                            <p className="text-sm text-slate-500 mt-1">{ex.questionTranslation}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`font-bold text-xl ${scoreColor}`}>{exScore}%</span>
                        {exScore === 100 ? (
                          <CheckCircle2 className={iconColor} size={24} />
                        ) : (
                          <XCircle className={iconColor} size={24} />
                        )}
                      </div>
                    </div>
                    <div className="ml-11 space-y-3">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Your Answer:</span>
                        <p className="text-slate-700 mt-1">{userAns}</p>
                      </div>
                      {tutorComment && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-xs font-bold text-blue-700 uppercase">Tutor Comment:</span>
                          <p className="text-blue-900 text-sm mt-1">{tutorComment}</p>
                        </div>
                      )}
                      {ex.answer && (
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase">Correct Answer:</span>
                          <p className="text-green-700 mt-1 font-semibold">{ex.answer}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      );
    }

    if (submitted) {
      // Results Summary View
      return (
        <div className="min-h-full bg-slate-50 flex flex-col">
          <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
            <button 
              onClick={handleBackNavigation}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">Practice Complete</h2>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${score === lesson.exercises.length ? 'bg-green-100' : 'bg-blue-100'}`}>
                {score === lesson.exercises.length ? (
                  <CheckCircle2 className="text-green-600" size={48} />
                ) : (
                  <GraduationCap className="text-blue-600" size={48} />
                )}
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                {score === 100 ? 'Perfect Score!' : score >= 80 ? 'Excellent Work!' : score >= 60 ? 'Well Done!' : 'Keep Practicing!'}
              </h3>
              <p className="text-slate-600 mb-6">
                Your average score: <span className={`font-bold text-lg ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{score}%</span>
              </p>
              {exerciseScores && exerciseScores.length > 0 && (
                <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-sm font-bold text-slate-500 uppercase mb-2">Exercise Breakdown</p>
                  <div className="space-y-2">
                    {exerciseScores.map((exScore, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Question {idx + 1}:</span>
                        <span className={`font-bold ${exScore >= 80 ? 'text-green-600' : exScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {exScore}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {lesson.tutorOverallComment && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm font-bold text-blue-700 uppercase mb-2">Tutor's Overall Comment</p>
                  <p className="text-blue-900 text-sm">{lesson.tutorOverallComment}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResultDetail(true)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={handleBackNavigation}
                  className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          </main>
        </div>
      );
    }

    // Active Practice View
    const currentEx = lesson.exercises[practiceIndex];
    const isLastExercise = practiceIndex >= lesson.exercises.length - 1;
    const progress = ((practiceIndex + 1) / lesson.exercises.length) * 100;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <button 
            onClick={handleBackNavigation}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
          >
            <ArrowLeft size={20} /> Back to Menu
          </button>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Question {practiceIndex + 1} of {lesson.exercises.length}
            </span>
            <div className="w-32 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
              <div className="bg-brand-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 min-h-0 custom-scrollbar">
          <div className="max-w-3xl mx-auto pb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-brand-50 text-brand-700 text-xs font-bold px-3 py-1 rounded uppercase tracking-wider">
                  {currentEx.type}
                </span>
                {exerciseImages[practiceIndex] && (
                  <img 
                    src={exerciseImages[practiceIndex]} 
                    alt="Exercise visual" 
                    className="w-32 h-32 object-cover rounded-lg border border-slate-200"
                  />
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2 chinese-text">{currentEx.question}</h3>
              {currentEx.questionTranslation && (
                <p className="text-slate-500 mb-6 flex items-center gap-2">
                  <Languages size={16} /> {currentEx.questionTranslation}
                </p>
              )}

              {currentEx.type === 'quiz' && currentEx.options ? (
                <div className="space-y-3">
                  {currentEx.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswerChange(opt)}
                      disabled={feedbackStatus !== 'idle'}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        answers[practiceIndex] === opt
                          ? feedbackStatus === 'correct'
                            ? 'border-green-500 bg-green-50'
                            : feedbackStatus === 'incorrect'
                            ? 'border-red-500 bg-red-50'
                            : 'border-brand-500 bg-brand-50'
                          : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                      } ${feedbackStatus !== 'idle' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    value={answers[practiceIndex] || ''}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    disabled={feedbackStatus !== 'idle'}
                    placeholder="Type your answer here..."
                    className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none resize-none min-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              )}

              {evaluating && (
                <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <Loader2 className="text-slate-600 flex-shrink-0 animate-spin" size={24} />
                  <div>
                    <p className="font-semibold text-slate-800">Evaluating your answer...</p>
                    <p className="text-sm text-slate-600 mt-1">Please wait while AI assesses your response.</p>
                  </div>
                </div>
              )}

              {feedbackStatus !== 'idle' && !evaluating && currentScore !== null && (
                <div className={`mt-6 p-4 rounded-xl border-2 ${
                  currentScore === 100 
                    ? 'bg-green-50 border-green-300' 
                    : currentScore >= 50
                    ? 'bg-yellow-50 border-yellow-300'
                    : 'bg-red-50 border-red-300'
                }`}>
                  <div className="flex items-start gap-3">
                    {currentScore === 100 ? (
                      <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={24} />
                    ) : (
                      <XCircle className={`flex-shrink-0 mt-0.5 ${currentScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`} size={24} />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className={`font-bold text-lg ${
                          currentScore === 100 
                            ? 'text-green-800' 
                            : currentScore >= 50
                            ? 'text-yellow-800'
                            : 'text-red-800'
                        }`}>
                          Score: {currentScore}%
                        </p>
                        {currentScore === 100 && (
                          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">Perfect!</span>
                        )}
                      </div>
                      {currentEx.answer && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Correct Answer:</p>
                          <p className="text-slate-700 font-medium">{currentEx.answer}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-4">
              <button
                onClick={handleBackNavigation}
                className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Back
              </button>
              {feedbackStatus === 'idle' ? (
                <button
                  onClick={handleCheckAnswer}
                  disabled={!answers[practiceIndex] || answers[practiceIndex].trim() === '' || evaluating}
                  className="px-8 py-3 rounded-xl font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {evaluating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Evaluating...
                    </>
                  ) : (
                    'Check Answer'
                  )}
                </button>
              ) : (
                <button
                  onClick={handleContinue}
                  className="px-8 py-3 rounded-xl font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors"
                >
                  {isLastExercise ? 'Finish' : 'Continue'}
                </button>
              )}
            </div>
          </div>
        </main>

      </div>
    );
  }

  // Default return (should not reach here in normal flow)
  return null;
};