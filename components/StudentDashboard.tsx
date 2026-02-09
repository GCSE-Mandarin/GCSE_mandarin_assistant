
import React, { useEffect, useState } from 'react';
import { AssignedLesson } from '../types';
import { getLessonsByStudentId } from '@/lib/services/storage';
import { BookOpen, CheckCircle, Clock, LogOut, Loader2, RefreshCw, Languages } from 'lucide-react';

interface Props {
  studentName: string;
  onSelectLesson: (lesson: AssignedLesson) => void;
  onLogout: () => void;
  onPracticeVocab: () => void;
}

export const StudentDashboard: React.FC<Props> = ({ studentName, onSelectLesson, onLogout, onPracticeVocab }) => {
  const [lessons, setLessons] = useState<AssignedLesson[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLessons = async () => {
    setLoading(true);
    let data: AssignedLesson[] = [];
    
    // Try to fetch by ID first if available
    const studentId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;
    
    if (studentId) {
      data = await getLessonsByStudentId(studentId);
    } else {
      console.warn("No student ID found, cannot fetch lessons");
    }
    
    setLessons(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLessons();
  }, [studentName]);

  return (
    <div className="w-full">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
            <BookOpen className="text-blue-600" size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-800 truncate">Welcome, {studentName}</h1>
            <p className="text-xs text-slate-500">Your Assignments</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button 
                onClick={loadLessons}
                className="text-slate-400 hover:text-blue-600 transition-colors p-2 touch-manipulation"
                title="Refresh"
            >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
                onClick={onLogout}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 touch-manipulation"
                title="Logout"
            >
                <LogOut size={20} />
            </button>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-5xl mx-auto w-full pb-12">
        
        {/* Practice Vocabulary Section */}
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">Quick Actions</h2>
            </div>
            <button 
                onClick={onPracticeVocab}
                className="w-full sm:w-auto flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white p-4 sm:p-6 rounded-2xl shadow-lg shadow-brand-200 transition-all transform hover:-translate-y-1 active:scale-[0.98] group touch-manipulation"
            >
                <div className="bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0">
                    <Languages size={24} className="sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="text-left min-w-0">
                    <h3 className="font-bold text-base sm:text-lg">Practice Vocabulary</h3>
                    <p className="text-brand-100 text-xs sm:text-sm">Explore topics like Food, Time, and more.</p>
                </div>
            </button>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-4">Assigned Lessons</h2>

        {loading ? (
           <div className="flex justify-center items-center h-64">
             <Loader2 size={40} className="text-blue-500 animate-spin" />
           </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="inline-block p-6 rounded-full bg-slate-50 mb-4">
              <Clock className="w-12 h-12 text-slate-300" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700">No exercises yet!</h2>
            <p className="text-slate-500 mt-2">Ask your tutor to assign you some work.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => onSelectLesson(lesson)}
                className={`text-left p-6 rounded-2xl border transition-all duration-200 relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 ${
                  lesson.completed 
                    ? 'bg-slate-50 border-slate-200 opacity-75' 
                    : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${
                    lesson.completed ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {lessons.length - index}
                  </span>
                  {lesson.completed && (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle size={12} /> Done
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1">Exercise {lessons.length - index}</h3>
                <p className="text-sm text-slate-500 font-medium mb-3">{lesson.pointDescription}</p>
                
                <div className="flex gap-2 text-xs text-slate-400 mt-auto">
                    <span className="bg-slate-100 px-2 py-1 rounded">{lesson.topicTitle}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
