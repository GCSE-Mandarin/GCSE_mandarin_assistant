
import React, { useState, useEffect, useRef } from 'react';
import { generateVocabularyList, generateWordDetails, generateSpeech } from '@/lib/services/geminiService';
import { VocabWord, WordDetails, VocabProgress } from '../types';
import { saveVocabProgress, getVocabProgress, getVocabListByCategory, getVocabLists } from '@/lib/services/storage';
import { ArrowLeft, Loader2, Volume2, PenTool, CheckCircle2, X, Mic, RefreshCw, Play, Check } from 'lucide-react';

// Declare HanziWriter types from global script
declare const HanziWriter: any;

interface Props {
  studentName: string;
  onBack: () => void;
}

const CATEGORIES = [
  "Food & Drink",
  "Time & Dates",
  "Social Life",
  "School & Education",
  "Travel & Transport",
  "Health & Body",
  "Family & People",
  "Home & Environment"
];

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

export const StudentVocabPractice: React.FC<Props> = ({ studentName, onBack }) => {
  const [view, setView] = useState<'categories' | 'list' | 'flashcard'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>(CATEGORIES);
  
  const [characterList, setCharacterList] = useState<string[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, VocabProgress>>({});
  
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [wordDetails, setWordDetails] = useState<WordDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Flashcard states
  const [audioLoading, setAudioLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const writerRef = useRef<any>(null); // HanziWriter instance for single character (Flashcard view)
  const writersRef = useRef<any[]>([]); // Array of HanziWriter instances for multi-character words
  const writingWriterRef = useRef<any>(null); // HanziWriter instance for Writing Modal
  const writingExampleWriterRef = useRef<any>(null); // HanziWriter instance for Writing Modal example animation
  const hanziContainerRef = useRef<HTMLDivElement | null>(null); // Ref for flashcard container
  const hanziWriteContainerRef = useRef<HTMLDivElement | null>(null); // Ref for writing container
  const hanziWriteExampleContainerRef = useRef<HTMLDivElement | null>(null); // Ref for writing example animation container
  
  // Modals
  const [showWritingModal, setShowWritingModal] = useState(false);
  const [showPronunciationModal, setShowPronunciationModal] = useState(false);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null); // Blob URL
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load available categories from uploaded vocab lists
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const vocabLists = await getVocabLists();
        const uploadedCategories = vocabLists.map(list => list.category).filter(Boolean);
        
        // Combine predefined categories with uploaded categories, removing duplicates
        const allCategories = Array.from(new Set([...CATEGORIES, ...uploadedCategories]));
        setAvailableCategories(allCategories);
      } catch (error) {
        console.error("Error loading categories:", error);
        // Fall back to predefined categories on error
        setAvailableCategories(CATEGORIES);
      }
    };
    
    if (view === 'categories') {
      loadCategories();
    }
  }, [view]);

  // Load progress when entering list view
  const loadProgress = async () => {
    const allProgress = await getVocabProgress(studentName);
    const map: Record<string, VocabProgress> = {};
    allProgress.forEach(p => {
        if (p.category === selectedCategory) {
            map[p.word] = p;
        }
    });
    setProgressMap(map);
  };

  useEffect(() => {
    if (view === 'list' && selectedCategory) {
        loadProgress();
    }
  }, [view, selectedCategory]);

  const updateProgress = async (word: string, pinyin: string, meaning: string, type: 'viewed' | 'writing' | 'pronunciation') => {
    if (!selectedCategory) return;
    
    try {
    const id = `${studentName}_${word}`;
    const existing = progressMap[word] || {
        id,
        studentName,
        category: selectedCategory,
        word,
        pinyin,
        meaning,
        practices: { viewed: 0, writing: 0, pronunciation: 0 },
        lastPracticed: new Date().toISOString()
    };

    const updated: VocabProgress = {
        ...existing,
        practices: {
            ...existing.practices,
            [type]: existing.practices[type] + 1
        },
        lastPracticed: new Date().toISOString()
    };

    // Optimistic update
    setProgressMap(prev => ({ ...prev, [word]: updated }));
    
      // Save (errors are handled in saveVocabProgress, so this won't throw)
    await saveVocabProgress(updated);
    } catch (error) {
      // This should never happen since saveVocabProgress handles errors, but just in case
      console.error("Error updating progress:", error);
    }
  };

  // Navigation Handlers
  const handleCategorySelect = async (category: string) => {
    setSelectedCategory(category);
    setView('list');
    setListLoading(true);
    setListError(null);
    setCharacterList([]); // Clear previous
    
    try {
      // Get uploaded vocabulary list
      const uploadedList = await getVocabListByCategory(category);
      
      if (uploadedList && uploadedList.characters.length > 0) {
        // Use uploaded list - show individual characters
        setCharacterList(uploadedList.characters);
      } else {
        // Fall back to AI generation if no uploaded list exists
    const words = await generateVocabularyList(category);
        if (words.length === 0) {
          // Check if API key is missing
          // API key is now from environment variables (configured on Netlify)
          // API keys are now handled server-side via Netlify function
          // No need to check for API key here
          if (false) {
            setListError("No vocabulary list found for this category. Please ask your tutor to upload a vocabulary list, or configure an API key in Settings.");
          } else {
            setListError("Failed to generate vocabulary. Please try again or check your API key.");
          }
        } else {
          // Extract individual characters from AI-generated words
          const allChars = new Set<string>();
          words.forEach((word: VocabWord) => {
            // Split multi-character words into individual characters
            word.character.split('').forEach((char: string) => {
              if (/[\u4e00-\u9fa5]/.test(char)) {
                allChars.add(char);
              }
            });
          });
          setCharacterList(Array.from(allChars));
        }
      }
    } catch (error: any) {
      console.error("Error loading vocabulary:", error);
      if (error?.message === 'MISSING_API_KEY') {
        setListError("No vocabulary list found for this category. Please ask your tutor to upload a vocabulary list, or configure an API key in Settings.");
      } else {
        setListError("Failed to load vocabulary. Please try again.");
      }
    } finally {
    setListLoading(false);
    }
  };

  const handleCharacterSelect = async (character: string) => {
    setSelectedCharacter(character);
    setView('flashcard');
    setDetailLoading(true);
    setWordDetails(null);
    
    try {
      // Generate word details for the character using AI
      const details = await generateWordDetails(character);
      if (details) {
        setWordDetails(details);
    // Record view
        updateProgress(character, details.pinyin, details.meaning, 'viewed');
      } else {
        console.error('Failed to generate word details for character:', character);
      }
    } catch (error) {
      console.error('Error generating word details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  // HanziWriter Effect for Flashcard
  useEffect(() => {
    let attempts = 0;
    let mounted = true;

    const initWriter = () => {
        if (!mounted) return;
        
        const container = hanziContainerRef.current || document.getElementById('hanzi-target-div');
        const HW = (window as any).HanziWriter;

        if (!container || !HW || !wordDetails?.character) {
          if (attempts < 10) {
            attempts++;
            setTimeout(initWriter, 300);
          }
          return;
        }

        const isMultiCharacter = wordDetails.character.length > 1;
        const characters = wordDetails.character.split('');

        // Clean up previous writers
        writersRef.current.forEach(writer => {
          if (writer && typeof writer.cancelAnimation === 'function') {
            writer.cancelAnimation();
          }
        });
        writersRef.current = [];
        writerRef.current = null;

        if (!isMultiCharacter) {
          // Single character: use original approach
          // Remove React children first to avoid conflicts
          while (container.firstChild) {
            try {
              container.removeChild(container.firstChild);
            } catch (e) {
              // If removeChild fails, use innerHTML as fallback
              container.innerHTML = '';
              break;
            }
          }
          try {
            // Clear any dangerouslySetInnerHTML content before HanziWriter takes over
            container.innerHTML = '';
            writerRef.current = HW.create('hanzi-target-div', wordDetails.character, {
              width: 200,
              height: 200,
              padding: 5,
              showCharacter: false, // Hide static character, only show stroke animation
              showOutline: true,
              strokeAnimationSpeed: 1,
              delayBetweenStrokes: 200,
              strokeColor: '#000000',
              radicalColor: '#e02424'
            });
            writerRef.current.animateCharacter();
            
            // Force hide any character elements that might be rendered by HanziWriter
            // This ensures only the stroke outline is visible, not the filled character
            setTimeout(() => {
              const svg = container.querySelector('svg');
              if (svg) {
                // Remove all text elements (character glyphs)
                svg.querySelectorAll('text').forEach(el => el.remove());
                // Remove filled paths (filled character shapes) but keep stroke paths
                svg.querySelectorAll('path').forEach(path => {
                  const fill = path.getAttribute('fill');
                  if (fill && fill !== 'none' && fill !== 'transparent') {
                    path.remove();
                  }
                });
              }
            }, 200);
          } catch (e) {
            console.error("HanziWriter error", e);
            // Fallback: show text if HanziWriter fails
            container.innerHTML = `<span class="text-8xl font-black text-slate-800 chinese-text">${wordDetails.character}</span>`;
          }
        } else {
          // Multi-character: create multiple writers
          // Remove React children first to avoid conflicts
          while (container.firstChild) {
            try {
              container.removeChild(container.firstChild);
            } catch (e) {
              // If removeChild fails, use innerHTML as fallback
              container.innerHTML = '';
              break;
            }
          }
          
          // Create a flex container for multiple characters
          const flexContainer = document.createElement('div');
          flexContainer.className = 'flex items-center justify-center gap-4 flex-wrap';
          flexContainer.style.minHeight = '200px';
          
          const charWidth = Math.min(200, Math.floor(800 / characters.length));
          const charHeight = 200;
          
          characters.forEach((char, index) => {
            const charDiv = document.createElement('div');
            charDiv.id = `hanzi-char-${index}`;
            charDiv.style.width = `${charWidth}px`;
            charDiv.style.height = `${charHeight}px`;
            charDiv.style.display = 'inline-block';
            flexContainer.appendChild(charDiv);
            
            try {
              const writer = HW.create(`hanzi-char-${index}`, char, {
                width: charWidth,
                height: charHeight,
                padding: 5,
                showCharacter: false, // Hide static character, only show stroke animation
                showOutline: true,
                strokeAnimationSpeed: 1,
                delayBetweenStrokes: 200,
                strokeColor: '#000000',
                radicalColor: '#e02424'
              });
              writersRef.current.push(writer);
              
              // Animate characters sequentially with a delay
              setTimeout(() => {
                if (mounted) {
                  writer.animateCharacter();
                }
              }, index * 1000); // 1 second delay between each character
            } catch (e) {
              console.error(`HanziWriter error for character ${char}:`, e);
              // Fallback: show character as text
              charDiv.innerHTML = `<span class="text-6xl font-black text-slate-800 chinese-text">${char}</span>`;
            }
          });
          
          container.appendChild(flexContainer);
        }
    };

    if (view === 'flashcard' && wordDetails && !detailLoading) {
        initWriter();
    }
    
    return () => { 
      mounted = false;
      // Clean up writers safely
      try {
        if (writerRef.current) {
          if (typeof writerRef.current.cancelAnimation === 'function') {
            writerRef.current.cancelAnimation();
          }
          writerRef.current = null;
        }
        writersRef.current.forEach(writer => {
          try {
            if (writer && typeof writer.cancelAnimation === 'function') {
              writer.cancelAnimation();
            }
          } catch (e) {
            // Ignore cleanup errors
          }
        });
        writersRef.current = [];
        
        // Don't manually clear DOM - let React handle it
        // HanziWriter cleanup is enough
      } catch (e) {
        // Ignore cleanup errors
        console.warn('Cleanup error (safe to ignore):', e);
      }
    };
  }, [view, wordDetails, detailLoading]);

  // Audio Playback
  const playAudio = async (text: string) => {
    if (audioLoading || !text) {
      console.log("playAudio blocked:", { audioLoading, text });
      return;
    }
    
    setAudioLoading(true);
    try {
        console.log("Generating speech for:", text);

        // Ensure audio context is ready FIRST, before generating speech
        // This ensures the context is initialized on user interaction (required by browser autoplay policy)
        if (!audioContextRef.current) {
            console.log("Creating new AudioContext");
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        }
        const ctx = audioContextRef.current;
        
        // Resume if suspended (required for user interaction after page load)
        if (ctx.state === 'suspended') {
          console.log("Resuming suspended AudioContext");
          await ctx.resume();
        }
        
        // Wait a bit to ensure context is ready
        if (ctx.state !== 'running') {
          console.log("AudioContext not running, attempting resume");
          await ctx.resume();
          // Give it a moment to fully resume
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log("AudioContext state:", ctx.state);
        
        // Now generate the speech
        let base64Audio: string | null = null;
        let openaiAudio: { audioData: ArrayBuffer, format: 'openai' } | null = null;
        
        try {
          console.log("[PlayAudio] Calling generateSpeech for:", text);
          const result = await generateSpeech(text);
          
          // Check if result is OpenAI format or Gemini format
          if (result && typeof result === 'object' && 'format' in result && result.format === 'openai') {
            openaiAudio = result as { audioData: ArrayBuffer, format: 'openai' };
            console.log("[PlayAudio] OpenAI TTS returned audio");
          } else {
            base64Audio = result as string | null;
            console.log("[PlayAudio] Gemini TTS returned:", base64Audio ? `audio data (${base64Audio.length} chars)` : "null");
          }
        } catch (error: any) {
          console.error("[PlayAudio] Error calling generateSpeech:", error);
          console.error("[PlayAudio] Error stack:", error?.stack);
          setAudioLoading(false);
          const errorMsg = error?.message || 'Unknown error';
          alert(`Failed to generate audio: ${errorMsg}\n\nPlease check:\n1. Your API key is correct\n2. The API has TTS access\n3. Check the browser console for more details`);
          return;
        }
        
        // Ensure context is still running after async operation
        if (ctx.state !== 'running') {
          console.log("AudioContext suspended during generation, resuming");
          await ctx.resume();
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        let audioBuffer: AudioBuffer;
        
        if (openaiAudio) {
          // OpenAI returns MP3 format - decode directly using Web Audio API
          console.log("Decoding OpenAI audio (MP3 format)");
          try {
            audioBuffer = await ctx.decodeAudioData(openaiAudio.audioData);
            console.log("OpenAI audio decoded, duration:", audioBuffer.duration);
          } catch (decodeError) {
            console.error("Failed to decode OpenAI audio:", decodeError);
            alert("Failed to decode audio. Please try again.");
            setAudioLoading(false);
            return;
          }
        } else if (base64Audio) {
          // Gemini returns PCM format - use custom decoder
          console.log("Decoding Gemini audio (PCM format), length:", base64Audio.length);
          const decodedData = decode(base64Audio);
          if (decodedData.length === 0) {
            console.error("Decoded audio data is empty");
            alert("Failed to decode audio data. Please try again.");
            setAudioLoading(false);
            return;
          }
          audioBuffer = await decodeAudioData(decodedData, ctx, 24000, 1);
        } else {
          console.error("[PlayAudio] No audio returned from generateSpeech");
          alert("Failed to generate audio. The API returned no audio data. Please check your API key and try again.");
          setAudioLoading(false);
          return;
        }
        console.log("Audio buffer created, duration:", audioBuffer.duration);
        
        // Ensure context is still running before creating source
        if (ctx.state !== 'running') {
          console.log("AudioContext suspended before playback, resuming");
          await ctx.resume();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        
        // Add event handlers
        let playbackStarted = false;
        
        // Set a timeout fallback in case onended doesn't fire
        const timeoutId = setTimeout(() => {
          if (!playbackStarted) {
            console.log("Audio playback timeout, resetting loading state");
            setAudioLoading(false);
          }
        }, (audioBuffer.duration * 1000) + 2000);
        
        source.onended = () => {
          clearTimeout(timeoutId);
          console.log("Audio playback ended");
          playbackStarted = true;
          setAudioLoading(false);
        };
        
        console.log("Starting audio playback, context state:", ctx.state);
        try {
          source.start(0);
          playbackStarted = true;
        } catch (startError) {
          clearTimeout(timeoutId);
          console.error("Error starting audio playback:", startError);
          setAudioLoading(false);
          alert("Failed to start audio playback. Please try again.");
          return;
        }
        
    } catch (e) {
        console.error("Playback failed", e);
        setAudioLoading(false);
        alert(`Failed to play audio: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const replayAnimation = () => {
    if (wordDetails) {
      if (wordDetails.character.length === 1 && writerRef.current) {
        // Single character: cancel any ongoing animation and replay
        if (typeof writerRef.current.cancelAnimation === 'function') {
          writerRef.current.cancelAnimation();
        }
        writerRef.current.animateCharacter();
      } else if (wordDetails.character.length > 1 && writersRef.current.length > 0) {
        // Multi-character: cancel all ongoing animations first
        writersRef.current.forEach(writer => {
          if (writer && typeof writer.cancelAnimation === 'function') {
            writer.cancelAnimation();
          }
        });
        // Then replay all animations sequentially
        writersRef.current.forEach((writer, index) => {
          if (writer) {
            setTimeout(() => {
              writer.animateCharacter();
            }, index * 1000); // 1 second delay between each character
          }
        });
      }
    }
  };

  // --- Writing Modal Logic ---
  useEffect(() => {
    let attempts = 0;
    let mounted = true;

    const initWritingQuiz = () => {
        if (!mounted) return;

        const container = hanziWriteContainerRef.current || document.getElementById('hanzi-write-div');
        const exampleContainer = hanziWriteExampleContainerRef.current || document.getElementById('hanzi-write-example-div');
        const HW = (window as any).HanziWriter;

        // HanziWriter only supports single characters
        const isMultiCharacter = wordDetails?.character && wordDetails.character.length > 1;

        if (container && HW && wordDetails?.character && !isMultiCharacter) {
             // Remove React children first to avoid conflicts
             while (container.firstChild) {
               try {
                 container.removeChild(container.firstChild);
               } catch (e) {
                 // If removeChild fails, use innerHTML as fallback
                 container.innerHTML = '';
                 break;
               }
             }
             try {
                // Clear any dangerouslySetInnerHTML content before HanziWriter takes over
                container.innerHTML = '';
                writingWriterRef.current = HW.create('hanzi-write-div', wordDetails.character, {
                    width: 300,
                    height: 300,
                    showCharacter: false,
                    showOutline: true,
                    showHintAfterMisses: 1,
                    highlightOnComplete: true,
                    padding: 5,
                    onComplete: async () => {
                         try {
                           await updateProgress(wordDetails.character, wordDetails.pinyin, wordDetails.meaning, 'writing');
                         } catch (error) {
                           console.error("Error in onComplete callback:", error);
                           // Don't let errors crash the app
                         }
                    }
                });
                writingWriterRef.current.quiz();
             } catch (e) {
                 console.error("HanziWriter Quiz Error", e);
                 container.innerHTML = `<div class="text-6xl text-slate-300 flex items-center justify-center h-full">${wordDetails.character}</div>`;
             }
        } else if (isMultiCharacter && container) {
            // For multi-character words, show the word for reference
            container.innerHTML = `<div class="text-6xl text-slate-800 chinese-text flex items-center justify-center h-full">${wordDetails.character}</div>`;
            // Mark as practiced since we can't do interactive writing for multi-character words
            updateProgress(wordDetails.character, wordDetails.pinyin, wordDetails.meaning, 'writing');
        } else if (attempts < 10 && !isMultiCharacter) {
            attempts++;
            setTimeout(initWritingQuiz, 300);
        }
    };

    const initExampleAnimation = () => {
        if (!mounted) return;

        const exampleContainer = hanziWriteExampleContainerRef.current || document.getElementById('hanzi-write-example-div');
        const HW = (window as any).HanziWriter;

        // Only show example for single characters
        const isMultiCharacter = wordDetails?.character && wordDetails.character.length > 1;

        if (exampleContainer && HW && wordDetails?.character && !isMultiCharacter) {
            // Clean up previous example writer
            if (writingExampleWriterRef.current) {
                try {
                    if (typeof writingExampleWriterRef.current.cancelAnimation === 'function') {
                        writingExampleWriterRef.current.cancelAnimation();
                    }
                } catch (e) {
                    // Ignore cleanup errors
                }
                writingExampleWriterRef.current = null;
            }

            // Remove React children first to avoid conflicts
            while (exampleContainer.firstChild) {
                try {
                    exampleContainer.removeChild(exampleContainer.firstChild);
                } catch (e) {
                    exampleContainer.innerHTML = '';
                    break;
                }
            }

            try {
                exampleContainer.innerHTML = '';
                writingExampleWriterRef.current = HW.create('hanzi-write-example-div', wordDetails.character, {
                    width: 200,
                    height: 200,
                    showCharacter: false, // Hide static character, only show stroke animation
                    showOutline: true,
                    strokeAnimationSpeed: 1,
                    delayBetweenStrokes: 200,
                    strokeColor: '#000000',
                    radicalColor: '#e02424'
                });
                
                // Auto-play the animation
                writingExampleWriterRef.current.animateCharacter();
                
                // Force hide any static character elements
                setTimeout(() => {
                    const svg = exampleContainer.querySelector('svg');
                    if (svg) {
                        svg.querySelectorAll('text').forEach(el => el.remove());
                        svg.querySelectorAll('path').forEach(path => {
                            const fill = path.getAttribute('fill');
                            if (fill && fill !== 'none' && fill !== 'transparent') {
                                path.remove();
                            }
                        });
                    }
                }, 200);
            } catch (e) {
                console.error("HanziWriter Example Animation Error", e);
                exampleContainer.innerHTML = `<span class="text-6xl font-black text-slate-800 chinese-text">${wordDetails.character}</span>`;
            }
        }
    };

    if (showWritingModal && wordDetails) {
        initWritingQuiz();
        // Initialize example animation with a small delay to ensure containers are ready
        setTimeout(() => {
            initExampleAnimation();
        }, 100);
    }

    return () => { 
      mounted = false;
      // Clean up writing writer safely
      try {
        if (writingWriterRef.current) {
          if (typeof writingWriterRef.current.cancelAnimation === 'function') {
            writingWriterRef.current.cancelAnimation();
          }
          writingWriterRef.current = null;
        }
        if (writingExampleWriterRef.current) {
          if (typeof writingExampleWriterRef.current.cancelAnimation === 'function') {
            writingExampleWriterRef.current.cancelAnimation();
          }
          writingExampleWriterRef.current = null;
        }
        // Don't clear container innerHTML here - let React handle it
      } catch (e) {
        // Ignore cleanup errors
        console.warn('Writing cleanup error (safe to ignore):', e);
      }
    };
  }, [showWritingModal, wordDetails]);

  const restartWritingPractice = () => {
    if (writingWriterRef.current) {
        writingWriterRef.current.quiz();
    } else if (wordDetails && wordDetails.character.length > 1) {
        // For multi-character words, just re-render
        const container = document.getElementById('hanzi-write-div');
        if (container) {
          container.innerHTML = `<div class="text-6xl text-slate-800 chinese-text flex items-center justify-center h-full">${wordDetails.character}</div>`;
        }
    }
    
    // Also replay the example animation
    if (writingExampleWriterRef.current && wordDetails && wordDetails.character.length === 1) {
        if (typeof writingExampleWriterRef.current.cancelAnimation === 'function') {
            writingExampleWriterRef.current.cancelAnimation();
        }
        writingExampleWriterRef.current.animateCharacter();
    }
  };

  // Auto-play model pronunciation when modal opens
  useEffect(() => {
    if (showPronunciationModal && wordDetails && !audioLoading) {
      // Small delay to ensure modal is visible
      const timer = setTimeout(() => {
        // Use character - will be enhanced in generateSpeech service for single chars
        playAudio(wordDetails.character);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showPronunciationModal, wordDetails]);

  // --- Pronunciation Modal Logic ---
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            setRecordedAudio(audioUrl);
            
            // Log progress
            if (wordDetails) {
                 updateProgress(wordDetails.character, wordDetails.pinyin, wordDetails.meaning, 'pronunciation');
            }
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (err) {
        console.error("Error accessing microphone", err);
        alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        // Stop all tracks to release mic
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const playRecordedAudio = () => {
    if (recordedAudio) {
        const audio = new Audio(recordedAudio);
        audio.play();
    }
  };

  // Views
  const renderCategories = () => {
    // Separate predefined and custom categories
    const predefinedCats = CATEGORIES.filter(cat => availableCategories.includes(cat));
    const customCats = availableCategories.filter(cat => !CATEGORIES.includes(cat));
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {predefinedCats.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Predefined Categories</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {predefinedCats.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-300 hover:shadow-lg transition-all text-left group"
                >
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-brand-600 transition-colors">{cat}</h3>
                  <p className="text-slate-400 text-sm mt-2">Explore vocabulary</p>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {customCats.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Custom Categories</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customCats.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-green-200 hover:border-green-400 hover:shadow-lg transition-all text-left group"
                >
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-green-600 transition-colors">{cat}</h3>
                  <p className="text-slate-400 text-sm mt-2">Tutor uploaded list</p>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {availableCategories.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p>No vocabulary categories available.</p>
            <p className="text-sm mt-2">Ask your tutor to upload vocabulary lists.</p>
          </div>
        )}
      </div>
    );
  };

  const renderCharacterList = () => (
    <div>
        {listLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 size={40} className="text-brand-500 animate-spin mb-4" />
                <p className="text-slate-500">Loading characters for {selectedCategory}...</p>
            </div>
        ) : listError ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl p-8 border border-slate-200">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                    <X size={32} className="text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Unable to Load Vocabulary</h3>
                <p className="text-slate-600 text-center mb-6 max-w-md">{listError}</p>
                <button
                    onClick={() => handleCategorySelect(selectedCategory!)}
                    className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-semibold"
                >
                    Try Again
                </button>
            </div>
        ) : characterList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl p-8 border border-slate-200">
                <p className="text-slate-500">No characters found. Please try again.</p>
                <button
                    onClick={() => handleCategorySelect(selectedCategory!)}
                    className="mt-4 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-semibold"
                >
                    Retry
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 animate-in fade-in">
                {characterList.map((character, idx) => {
                    const progress = progressMap[character];
                    const isPracticed = progress && (progress.practices.viewed > 0);
                    
                    return (
                        <button
                            key={idx}
                            onClick={() => handleCharacterSelect(character)}
                            className={`bg-white p-6 rounded-xl border transition-all flex flex-col items-center justify-center text-center group relative overflow-hidden min-h-[100px] ${
                                isPracticed ? 'border-brand-200 ring-1 ring-brand-100' : 'border-slate-200 hover:border-brand-300 hover:shadow-md'
                            }`}
                        >
                            {isPracticed && (
                                <div className="absolute top-2 right-2 text-brand-500">
                                    <CheckCircle2 size={16} />
                                </div>
                            )}
                            <span className="text-4xl font-bold text-slate-800 chinese-text group-hover:text-brand-600 transition-colors">{character}</span>
                        </button>
                    );
                })}
            </div>
        )}
    </div>
  );

  const renderFlashcard = () => {
    if (detailLoading || !wordDetails) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 size={40} className="text-brand-500 animate-spin mb-4" />
                <p className="text-slate-500">Loading flashcard details...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto animate-in zoom-in duration-300">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                {/* Header / Pinyin */}
                <div className="bg-slate-50 p-6 text-center border-b border-slate-100 relative">
                    <h3 className="text-xl font-medium text-slate-500 mb-2">{wordDetails.pinyin}</h3>
                    
                    {/* Hanzi Writer Container */}
                    <div className="flex justify-center mb-4 relative group">
                        <div 
                          ref={hanziContainerRef}
                          key={`hanzi-${wordDetails.character}-${view}`}
                          id="hanzi-target-div" 
                          className="cursor-pointer min-h-[200px] flex items-center justify-center w-full relative z-10" 
                          onClick={replayAnimation} 
                          title="Click to replay"
                        />
                        <button 
                            onClick={replayAnimation}
                            className="absolute bottom-0 right-1/4 p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    <p className="text-lg font-semibold text-brand-600">{wordDetails.meaning}</p>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    {/* Example Sentence */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Example Sentence</h4>
                        <div className="flex gap-3 items-start">
                             <button 
                                onClick={() => playAudio(wordDetails.exampleSentenceCh)}
                                className="mt-1 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex-shrink-0"
                             >
                                <Volume2 size={16} />
                             </button>
                             <div>
                                <p className="text-lg font-medium text-slate-800 chinese-text">{wordDetails.exampleSentenceCh}</p>
                                <p className="text-slate-500">{wordDetails.exampleSentenceEn}</p>
                             </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Opening pronunciation modal, wordDetails:', wordDetails);
                                if (!wordDetails) {
                                  console.error('wordDetails is null, cannot open pronunciation modal');
                                  alert('Please wait for the flashcard to finish loading.');
                                  return;
                                }
                                setShowPronunciationModal(true);
                            }}
                            disabled={!wordDetails}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all gap-2 group ${
                              !wordDetails ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            <div className="bg-blue-100 p-3 rounded-full text-blue-600 group-hover:bg-blue-200 transition-colors">
                                <Mic size={24} />
                            </div>
                            <span className="font-semibold">Practice Pronunciation</span>
                        </button>

                        <button
                            onClick={() => setShowWritingModal(true)}
                            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-all gap-2 group"
                        >
                            <div className="bg-brand-100 p-3 rounded-full text-brand-600 group-hover:bg-brand-200 transition-colors">
                                <PenTool size={24} />
                            </div>
                            <span className="font-semibold">Practice Writing</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
                if (view === 'flashcard') setView('list');
                else if (view === 'list') setView('categories');
                else onBack();
            }}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
                {view === 'categories' ? 'Vocabulary Practice' : selectedCategory}
            </h2>
            {view === 'flashcard' && <p className="text-xs text-slate-500">Word Details</p>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        {view === 'categories' && renderCategories()}
        {view === 'list' && renderCharacterList()}
        {view === 'flashcard' && renderFlashcard()}
      </main>

      {/* Writing Practice Modal */}
      {showWritingModal && wordDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Write: {wordDetails.pinyin}</h3>
                    <button onClick={() => setShowWritingModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-8 flex flex-col items-center gap-6">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full">
                        {/* Example Animation */}
                        {wordDetails.character.length === 1 && (
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase">Watch Example</p>
                                <div className="relative border-2 border-slate-200 rounded-xl bg-white p-4">
                                    <div 
                                        ref={hanziWriteExampleContainerRef}
                                        key={`hanzi-write-example-${wordDetails.character}-${showWritingModal}`}
                                        id="hanzi-write-example-div" 
                                        className="min-w-[200px] min-h-[200px] flex items-center justify-center"
                                    />
                                    <button
                                        onClick={() => {
                                            if (writingExampleWriterRef.current) {
                                                if (typeof writingExampleWriterRef.current.cancelAnimation === 'function') {
                                                    writingExampleWriterRef.current.cancelAnimation();
                                                }
                                                writingExampleWriterRef.current.animateCharacter();
                                            }
                                        }}
                                        className="absolute bottom-2 right-2 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                                        title="Replay animation"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Practice Field */}
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Your Practice</p>
                            <div className="relative min-w-[300px] min-h-[300px]">
                                {/* Fallback overlay - completely separate from HanziWriter container */}
                                {!writingWriterRef.current && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 border-2 border-slate-100 rounded-xl bg-slate-50">
                                        <span className="text-slate-200 text-6xl">{wordDetails.character}</span>
                                    </div>
                                )}
                                <div 
                                    ref={hanziWriteContainerRef}
                                    key={`hanzi-write-${wordDetails.character}-${showWritingModal}`}
                                    id="hanzi-write-div" 
                                    className="border-2 border-slate-100 rounded-xl bg-slate-50 min-w-[300px] min-h-[300px] relative z-10"
                                />
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 text-center">
                        Trace the strokes in the correct order. Watch the example on the left to see the stroke order.
                    </p>
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-center gap-3 bg-slate-50">
                    <button 
                        onClick={restartWritingPractice}
                        className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-white text-slate-600 hover:text-brand-600 transition-colors text-sm font-bold flex items-center gap-2"
                    >
                        <RefreshCw size={16} /> Practice Again
                    </button>
                    <button 
                        onClick={() => setShowWritingModal(false)}
                        className="bg-brand-600 text-white px-8 py-2 rounded-lg hover:bg-brand-700 transition-colors text-sm font-bold shadow-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Pronunciation Practice Modal */}
      {showPronunciationModal && wordDetails ? (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              setShowPronunciationModal(false);
              if (isRecording) stopRecording();
              if (recordedAudio) {
                URL.revokeObjectURL(recordedAudio);
                setRecordedAudio(null);
              }
            }
          }}
        >
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative"
              style={{ zIndex: 10000 }}
              onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Practice Pronunciation</h3>
                    <button 
                        onClick={() => {
                            setShowPronunciationModal(false);
                            // Stop recording if active
                            if (isRecording) {
                                stopRecording();
                            }
                            // Clear recorded audio when closing
                            if (recordedAudio) {
                                URL.revokeObjectURL(recordedAudio);
                                setRecordedAudio(null);
                            }
                        }} 
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-8 flex flex-col items-center gap-6">
                    {/* Character Display */}
                    <div className="text-center mb-2">
                        <span className="text-6xl font-bold text-slate-800 chinese-text">{wordDetails.character}</span>
                        <p className="text-lg text-slate-500 mt-2">{wordDetails.pinyin}</p>
                    </div>

                    {/* Model Audio */}
                    <div className="text-center w-full">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-3">Listen to Correct Pronunciation</p>
                        <button 
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              // Don't proceed if already loading
                              if (audioLoading) {
                                console.log("Audio already loading, ignoring click");
                                return;
                              }
                              
                              // Ensure audio context is ready on user interaction (required by browser autoplay policy)
                              if (!audioContextRef.current) {
                                console.log("Creating AudioContext on button click");
                                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
                              }
                              
                              const ctx = audioContextRef.current;
                              
                              // Resume if suspended
                              if (ctx.state === 'suspended') {
                                console.log("Resuming AudioContext on button click");
                                try {
                                  await ctx.resume();
                                  // Small delay to ensure context is ready
                                  await new Promise(resolve => setTimeout(resolve, 50));
                                } catch (err) {
                                  console.error("Error resuming AudioContext:", err);
                                }
                              }
                              
                              console.log("AudioContext state before playAudio:", ctx.state);
                              
                              // Use character - will be enhanced in generateSpeech service for single chars
                              await playAudio(wordDetails.character);
                            }}
                            disabled={audioLoading}
                            className={`w-full py-4 bg-blue-100 rounded-xl hover:bg-blue-200 flex items-center justify-center gap-3 text-blue-700 transition-colors font-semibold ${
                                audioLoading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {audioLoading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" /> Loading...
                                </>
                            ) : (
                                <>
                                    <Volume2 size={20} /> Play Pronunciation
                                </>
                            )}
                        </button>
                        <p className="text-xs text-slate-400 mt-2">Click to hear the correct pronunciation again</p>
                    </div>

                    <div className="w-full border-t border-slate-100"></div>

                    {/* Recording */}
                    <div className="text-center w-full">
                         <p className="text-xs font-bold text-slate-400 uppercase mb-3">Record Your Pronunciation</p>
                         {!isRecording ? (
                             <button 
                                onClick={startRecording}
                                className="w-20 h-20 rounded-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all shadow-md hover:shadow-lg mx-auto mb-3"
                                title="Start recording"
                             >
                                 <Mic size={32} />
                             </button>
                         ) : (
                             <button 
                                onClick={stopRecording}
                                className="w-20 h-20 rounded-full bg-red-600 text-white animate-pulse flex items-center justify-center transition-all shadow-red-300 shadow-lg mx-auto mb-3"
                                title="Stop recording"
                             >
                                 <div className="w-8 h-8 bg-white rounded-full"></div>
                             </button>
                         )}
                         <p className="text-sm text-slate-600 font-medium">
                             {isRecording ? (
                                 <span className="text-red-600">● Recording... Click to stop</span>
                             ) : (
                                 "Tap the microphone to start recording"
                             )}
                         </p>
                    </div>

                    {/* Playback */}
                    {recordedAudio && !isRecording && (
                        <div className="text-center w-full animate-in fade-in slide-in-from-bottom-2 space-y-3">
                            <div className="w-full border-t border-slate-100"></div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Your Recording</p>
                            <button 
                                onClick={playRecordedAudio}
                                className="w-full py-4 bg-green-50 border-2 border-green-200 text-green-700 rounded-xl hover:bg-green-100 hover:border-green-300 flex items-center justify-center gap-3 transition-colors font-semibold"
                            >
                                <Play size={20} /> Play My Recording
                            </button>
                            <button
                                onClick={() => {
                                    setRecordedAudio(null);
                                    audioChunksRef.current = [];
                                }}
                                className="text-xs text-slate-400 hover:text-slate-600 underline"
                            >
                                Record again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      ) : null}
    </div>
  );
};
