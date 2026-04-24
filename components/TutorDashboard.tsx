import React from 'react';
import { BarChart3, ArrowLeft, GraduationCap, Settings, BookOpen, UserRound } from 'lucide-react';
import { Student } from '@/types';

interface Props {
  onViewProgress: () => void;
  onBack: () => void;
  onSettings: () => void;
  onManageVocab: () => void;
  onCurriculum: () => void;
  selectedStudent: Student | null;
  onChangeStudent: () => void;
}

export const TutorDashboard: React.FC<Props> = ({
  onViewProgress,
  onBack,
  onSettings,
  onManageVocab,
  onCurriculum,
  selectedStudent,
  onChangeStudent
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
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium py-1 px-2 rounded-lg hover:bg-slate-50 mb-6 sm:mb-8"
      >
        <ArrowLeft size={20} /> Back
      </button>

      <div className="text-center mb-8 sm:mb-12">
        <div className="bg-brand-100 p-3 sm:p-4 rounded-full inline-block mb-4">
          <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 text-brand-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Tutor Dashboard</h1>
        <p className="text-sm sm:text-base text-slate-500">Manage your curriculum and track student success.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold">
            {selectedStudent ? selectedStudent.name.charAt(0).toUpperCase() : <UserRound size={22} />}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Teaching</p>
            <p className="font-bold text-slate-800">{selectedStudent?.name || 'No student selected'}</p>
          </div>
        </div>
        <button
          onClick={onChangeStudent}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {selectedStudent ? 'Change Student' : 'Choose Student'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
        {/* Progress Card */}
        <button
          onClick={onViewProgress}
          className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all group text-left flex flex-col min-h-[240px] sm:min-h-[16rem] touch-manipulation active:scale-[0.98]"
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
          className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all group text-left flex flex-col min-h-[240px] sm:min-h-[16rem] touch-manipulation active:scale-[0.98]"
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

        {/* Vocabulary Management Card */}
        <button
          onClick={onManageVocab}
          className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-green-300 hover:shadow-xl transition-all group text-left flex flex-col min-h-[240px] sm:min-h-[16rem] touch-manipulation active:scale-[0.98]"
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
      </div>
    </div>
  );
};
