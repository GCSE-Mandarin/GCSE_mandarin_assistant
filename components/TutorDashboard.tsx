import React from 'react';
import { PenTool, BarChart3, ArrowLeft, GraduationCap, Settings, BookOpen } from 'lucide-react';

interface Props {
  onPlanLesson: () => void;
  onViewProgress: () => void;
  onBack: () => void;
  onSettings: () => void;
  onManageVocab: () => void;
}

export const TutorDashboard: React.FC<Props> = ({ onPlanLesson, onViewProgress, onBack, onSettings, onManageVocab }) => {
  return (
    <div className="bg-slate-50">
      <div className="w-full max-w-4xl mx-auto relative p-6 pb-12">
        <button 
          onClick={onSettings}
          className="absolute top-6 right-6 p-3 rounded-full bg-white shadow-sm border border-slate-200 text-slate-500 hover:text-slate-800 hover:shadow-md transition-all z-10"
          title="Settings & API Key"
        >
          <Settings size={24} />
        </button>
        
        <button 
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Login
        </button>

        <div className="text-center mb-12">
          <div className="bg-brand-100 p-4 rounded-full inline-block mb-4">
            <GraduationCap className="w-12 h-12 text-brand-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Tutor Dashboard</h1>
          <p className="text-slate-500">Manage your curriculum and track student success.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Plan Lesson Card */}
          <button
            onClick={onPlanLesson}
            className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-300 hover:shadow-xl transition-all group text-left flex flex-col h-64"
          >
            <div className="bg-brand-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand-100 transition-colors">
              <PenTool className="text-brand-600 w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Plan Lessons</h3>
            <p className="text-slate-500 mb-auto">Create new learning modules and generate custom exercises for your students.</p>
            <div className="mt-6 flex items-center text-brand-600 font-semibold group-hover:translate-x-1 transition-transform">
              Start Planning →
            </div>
          </button>

          {/* Vocabulary Management Card */}
          <button
            onClick={onManageVocab}
            className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-green-300 hover:shadow-xl transition-all group text-left flex flex-col h-64"
          >
            <div className="bg-green-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-100 transition-colors">
              <BookOpen className="text-green-600 w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Vocabulary Lists</h3>
            <p className="text-slate-500 mb-auto">Upload and manage vocabulary lists for student practice.</p>
            <div className="mt-6 flex items-center text-green-600 font-semibold group-hover:translate-x-1 transition-transform">
              Manage Lists →
            </div>
          </button>

          {/* Progress Card */}
          <button
            onClick={onViewProgress}
            className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all group text-left flex flex-col h-64"
          >
            <div className="bg-blue-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
              <BarChart3 className="text-blue-600 w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Student Progress</h3>
            <p className="text-slate-500 mb-auto">View performance analytics, completed exercises, and lesson history.</p>
            <div className="mt-6 flex items-center text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
              View Reports →
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};