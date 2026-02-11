import React, { useState } from 'react';
import { PenTool, BarChart3, ArrowLeft, GraduationCap, Settings, BookOpen, Volume2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getLessons, uploadAudioToStorage, updateLessonAudioUrl } from '@/lib/services/storage';
import { generateSpeech } from '@/lib/services/geminiService';

interface Props {
  onPlanLesson: () => void;
  onViewProgress: () => void;
  onBack: () => void;
  onSettings: () => void;
  onManageVocab: () => void;
  onCurriculum: () => void;
}

// Helper to add WAV header to raw PCM data
function addWavHeader(pcmData: Uint8Array, sampleRate: number = 24000) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + pcmData.length, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * blockAlign)
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // "data" chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, pcmData.length, true);

  const combined = new Uint8Array(header.byteLength + pcmData.length);
  combined.set(new Uint8Array(header), 0);
  combined.set(pcmData, header.byteLength);
  return combined;
}

// Helper for audio decoding
function decodeBase64ToUint8Array(base64: string) {
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

export const TutorDashboard: React.FC<Props> = ({
  onPlanLesson,
  onViewProgress,
  onBack,
  onSettings,
  onManageVocab,
  onCurriculum
}) => {
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    current: number, 
    total: number, 
    success: number, 
    failed: number,
    error?: string
  } | null>(null);

  const handleMigrateAudio = async () => {
    const allLessons = await getLessons();
    const pendingLessons = allLessons.filter(l => !l.audioUrl);
    
    if (pendingLessons.length === 0) {
      alert('All lessons already have audio URLs!');
      return;
    }

    if (!confirm(`Found ${pendingLessons.length} lessons without audio. Start generating now?`)) {
      return;
    }

    setMigrating(true);
    setMigrationStatus({ current: 0, total: pendingLessons.length, success: 0, failed: 0 });
    
    try {
      for (let i = 0; i < pendingLessons.length; i++) {
        const lesson = pendingLessons[i];
        let step = 'AI Speech Generation';
        
        try {
          // 1. Generate Speech
          const speechResult = await generateSpeech(lesson.material);
          if (!speechResult) throw new Error("AI returned no audio data");

          // 2. Process Data
          step = 'Audio Decoding';
          const audioData = typeof speechResult === 'string' 
            ? decodeBase64ToUint8Array(speechResult) 
            : new Uint8Array(speechResult.audioData);

          // 3. Upload to Storage
          step = 'Storage Upload';
          // Gemini returns raw PCM, OpenAI might return MP3. 
          // We wrap PCM with WAV header. OpenAI format already has header.
          const finalAudioData = typeof speechResult === 'string' 
            ? addWavHeader(audioData) 
            : audioData; 
            
          const fileName = `lesson_${lesson.id}_${Date.now()}.wav`;
          const publicUrl = await uploadAudioToStorage(fileName, new Blob([finalAudioData], { type: 'audio/wav' }));
          if (!publicUrl) throw new Error("Failed to upload to storage");

          // 4. Update Database (Immediate)
          step = 'Database Update';
          const success = await updateLessonAudioUrl(lesson.id, publicUrl, lesson);
          
          if (success) {
            setMigrationStatus(prev => prev ? { ...prev, success: prev.success + 1 } : null);
          } else {
            throw new Error("DB Update failed");
          }
        } catch (err: any) {
          console.error(`[Migration Error] Lesson ${lesson.id} failed at step "${step}":`, err);
          setMigrationStatus(prev => prev ? { 
            ...prev, 
            failed: prev.failed + 1,
            error: `Failed at "${step}": ${err.message}` 
          } : null);
        }
        
        setMigrationStatus(prev => prev ? { ...prev, current: i + 1 } : null);
      }
    } catch (err: any) {
      console.error("Critical migration failure:", err);
      setMigrationStatus(prev => prev ? { ...prev, error: `Critical: ${err.message}` } : null);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto relative p-4 sm:p-6 pb-12">
      <button
        onClick={onSettings}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 rounded-full bg-white shadow-sm border border-slate-200 text-slate-500 hover:text-slate-800 hover:shadow-md transition-all z-10 touch-manipulation"
        title="Settings & API Key"
      >
        <Settings size={24} />
      </button>

      <button
        onClick={onBack}
        className="mb-6 sm:mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors touch-manipulation py-2"
      >
        <ArrowLeft size={20} /> <span className="text-base sm:text-lg">Back to Login</span>
      </button>

      <div className="text-center mb-8 sm:mb-12">
        <div className="bg-brand-100 p-3 sm:p-4 rounded-full inline-block mb-4">
          <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 text-brand-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Tutor Dashboard</h1>
        <p className="text-sm sm:text-base text-slate-500">Manage your curriculum and track student success.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
        {/* Plan Lesson Card */}
        <button
          onClick={onPlanLesson}
          className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-300 hover:shadow-xl transition-all group text-left flex flex-col min-h-[240px] sm:h-64 touch-manipulation active:scale-[0.98]"
        >
          <div className="bg-brand-50 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-brand-100 transition-colors">
            <PenTool className="text-brand-600 w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Plan Lessons</h3>
          <p className="text-sm sm:text-base text-slate-500 mb-auto">
            Create new learning modules and generate custom exercises for your students.
          </p>
          <div className="mt-4 sm:mt-6 flex items-center text-brand-600 font-semibold text-sm sm:text-base group-hover:translate-x-1 transition-transform">
            Start Planning →
          </div>
        </button>

        {/* Vocabulary Management Card */}
        <button
          onClick={onManageVocab}
          className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-green-300 hover:shadow-xl transition-all group text-left flex flex-col min-h-[240px] sm:h-64 touch-manipulation active:scale-[0.98]"
        >
          <div className="bg-green-50 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-green-100 transition-colors">
            <BookOpen className="text-green-600 w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Vocabulary Lists</h3>
          <p className="text-sm sm:text-base text-slate-500 mb-auto">
            Upload and manage vocabulary lists for student practice.
          </p>
          <div className="mt-4 sm:mt-6 flex items-center text-green-600 font-semibold text-sm sm:text-base group-hover:translate-x-1 transition-transform">
            Manage Lists →
          </div>
        </button>

        {/* Progress Card */}
        <button
          onClick={onViewProgress}
          className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all group text-left flex flex-col min-h-[240px] sm:h-64 touch-manipulation active:scale-[0.98]"
        >
          <div className="bg-blue-50 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-blue-100 transition-colors">
            <BarChart3 className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Student Progress</h3>
          <p className="text-sm sm:text-base text-slate-500 mb-auto">
            View performance analytics, completed exercises, and lesson history.
          </p>
          <div className="mt-4 sm:mt-6 flex items-center text-blue-600 font-semibold text-sm sm:text-base group-hover:translate-x-1 transition-transform">
            View Reports →
          </div>
        </button>

        {/* Curriculum Card */}
        <button
          onClick={onCurriculum}
          className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all group text-left flex flex-col min-h-[240px] sm:h-64 touch-manipulation active:scale-[0.98]"
        >
          <div className="bg-purple-50 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-purple-100 transition-colors">
            <GraduationCap className="text-purple-600 w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Curriculum</h3>
          <p className="text-sm sm:text-base text-slate-500 mb-auto">
            Review and adjust the overall course structure and learning objectives.
          </p>
          <div className="mt-4 sm:mt-6 flex items-center text-purple-600 font-semibold text-sm sm:text-base group-hover:translate-x-1 transition-transform">
            View Curriculum →
          </div>
        </button>
      </div>

      {/* Temporary Tool Area */}
      <div className="p-8 bg-slate-100 rounded-3xl border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <Volume2 className="text-slate-400" />
          <h3 className="text-lg font-bold text-slate-700">Maintenance Tools</h3>
        </div>
        
        <p className="text-sm text-slate-500 mb-6">
          Pre-generate audio for all existing lessons to improve student experience. This will upload MP3 files to Supabase Storage.
        </p>

        {migrationStatus && (
          <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-600">
                {migrationStatus.current === migrationStatus.total ? 'Migration Complete' : 'Processing Lessons...'}
              </span>
              <div className="flex gap-3 text-xs">
                <span className="text-green-600 font-bold">{migrationStatus.success} Success</span>
                <span className="text-red-500 font-bold">{migrationStatus.failed} Failed</span>
                <span className="text-slate-400">Total: {migrationStatus.total}</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-brand-500 h-full transition-all duration-300" 
                style={{ width: `${(migrationStatus.current / migrationStatus.total) * 100}%` }}
              ></div>
            </div>
            {migrationStatus.error && (
              <div className="mt-3 p-2 bg-red-50 rounded border border-red-100 flex items-start gap-2 text-red-600 text-[10px] leading-relaxed">
                <AlertCircle size={12} className="shrink-0 mt-0.5" /> 
                <span className="break-all">{migrationStatus.error}</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleMigrateAudio}
          disabled={migrating}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
        >
          {migrating ? <Loader2 className="animate-spin" size={20} /> : <Volume2 size={20} />}
          {migrating ? 'Generating Audio...' : 'Generate All Lesson Audio'}
        </button>
      </div>
    </div>
  );
};
