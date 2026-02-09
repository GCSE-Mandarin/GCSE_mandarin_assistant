import React from 'react';
import { PenTool, BarChart3, ArrowLeft, GraduationCap, Settings, BookOpen } from 'lucide-react';

interface Props {
  onPlanLesson: () => void;
  onViewProgress: () => void;
  onBack: () => void;
  onSettings: () => void;
  onManageVocab: () => void;
}

export const TutorDashboard: React.FC<Props> = ({
  onPlanLesson,
  onViewProgress,
  onBack,
  onSettings,
  onManageVocab
}) => {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
      </div>
    </div>
  );
};
