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
  const [migrationStatus, setMigrationStatus] = useState<{current: number, total: number, error?: string} | null>(null);

  const handleMigrateAudio = async () => {
    if (!confirm('This will generate audio for ALL lessons that don\'t have it yet. This may consume many API credits. Continue?')) {
      return;
    }

    setMigrating(true);
    setMigrationStatus(null);
    
    try {
      const allLessons = await getLessons();
      // Filter lessons that don't have audioUrl yet
      const pendingLessons = allLessons.filter(l => !l.audioUrl);
      
      if (pendingLessons.length === 0) {
        alert('All lessons already have audio URLs!');
        setMigrating(false);
        return;
      }

      setMigrationStatus({ current: 0, total: pendingLessons.length });

      for (let i = 0; i < pendingLessons.length; i++) {
        const lesson = pendingLessons[i];
        try {
          // 1. Generate Speech for the material
          // We use the whole material text for the lesson-level audio
          const speechResult = await generateSpeech(lesson.material);
          
          if (speechResult) {
            const audioData = typeof speechResult === 'string' 
              ? decodeBase64ToUint8Array(speechResult) 
              : new Uint8Array(speechResult.audioData);

            // 2. Upload to Supabase Storage
            const fileName = `lesson_${lesson.id}_${Date.now()}.mp3`;
            const publicUrl = await uploadAudioToStorage(fileName, new Blob([audioData], { type: 'audio/mpeg' }));

            if (publicUrl) {
              // 3. Update DB
              await updateLessonAudioUrl(lesson.id, publicUrl, lesson);
            }
          }
        } catch (err) {
          console.error(`Error migrating lesson ${lesson.id}:`, err);
        }
        
        setMigrationStatus({ current: i + 1, total: pendingLessons.length });
      }

      alert('Audio migration complete!');
    } catch (err: any) {
      console.error("Migration failed:", err);
      setMigrationStatus(prev => prev ? { ...prev, error: err.message } : null);
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
              <span className="text-sm font-bold text-brand-600">{migrationStatus.current} / {migrationStatus.total}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-brand-500 h-full transition-all duration-300" 
                style={{ width: `${(migrationStatus.current / migrationStatus.total) * 100}%` }}
              ></div>
            </div>
            {migrationStatus.error && (
              <div className="mt-3 flex items-center gap-2 text-red-600 text-xs">
                <AlertCircle size={14} /> <span>Error: {migrationStatus.error}</span>
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
