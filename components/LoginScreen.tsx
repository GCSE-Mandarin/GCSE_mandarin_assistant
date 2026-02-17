import React, { useState } from 'react';
import { GraduationCap, BookOpen, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { findStudentByName } from '@/lib/services/storage';
import { Student } from '@/types';

interface Props {
  onTutorSelect: () => void;
  onStudentLogin: (student: Student) => void;
}

export const LoginScreen: React.FC<Props> = ({ onTutorSelect, onStudentLogin }) => {
  const [role, setRole] = useState<'selection' | 'student'>('selection');
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentName.trim()) {
      setLoading(true);
      setError('');
      
      try {
        const student = await findStudentByName(studentName.trim());
        if (student) {
          onStudentLogin(student);
        } else {
          setError('Student not found. Please ask your tutor for access.');
        }
      } catch (err) {
        setError('Login failed. Please checks your internet connection.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="text-center mb-6 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2 sm:mb-3">Mandarin Master Plan</h1>
        <p className="text-slate-500 text-base sm:text-lg">IGCSE Preparation Platform</p>
      </div>


      {role === 'selection' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl">
          <button
            onClick={onTutorSelect}
            className="flex flex-col items-center p-6 sm:p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all group touch-manipulation active:scale-[0.98]"
          >
            <div className="bg-brand-50 p-3 sm:p-4 rounded-full mb-3 sm:mb-4 group-hover:bg-brand-100 transition-colors">
              <GraduationCap className="w-9 h-9 sm:w-10 sm:h-10 text-brand-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">I am a Tutor</h2>
            <p className="text-sm sm:text-base text-slate-500 text-center">Create lesson plans and assign exercises to students.</p>
          </button>

          <button
            onClick={() => setRole('student')}
            className="flex flex-col items-center p-6 sm:p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group touch-manipulation active:scale-[0.98]"
          >
            <div className="bg-blue-50 p-3 sm:p-4 rounded-full mb-3 sm:mb-4 group-hover:bg-blue-100 transition-colors">
              <BookOpen className="w-9 h-9 sm:w-10 sm:h-10 text-blue-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">I am a Student</h2>
            <p className="text-sm sm:text-base text-slate-500 text-center">Log in to view your dashboard and complete exercises.</p>
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
          <button 
            onClick={() => { setRole('selection'); setError(''); }}
            className="text-sm text-slate-400 hover:text-slate-600 mb-4 sm:mb-6 flex items-center gap-1 touch-manipulation py-2"
          >
            ← Back
          </button>
          
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4 sm:mb-6">Student Login</h2>
          
          <form onSubmit={handleStudentSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                What's your name?
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  className={`w-full px-4 py-3 text-base rounded-lg border ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'} outline-none transition-all`}
                  placeholder="Enter your name"
                  value={studentName}
                  onChange={(e) => {
                      setStudentName(e.target.value);
                      setError('');
                  }}
                />
              </div>
              {error && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                  </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-200 transform active:scale-[0.98] touch-manipulation disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Checking...
                  </>
              ) : (
                  <>Enter Dashboard <ChevronRight size={18} /></>
              )}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
