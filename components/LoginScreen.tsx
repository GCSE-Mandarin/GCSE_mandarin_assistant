import React, { useState } from 'react';
import { GraduationCap, BookOpen, ChevronRight, User } from 'lucide-react';

interface Props {
  onTutorSelect: () => void;
  onStudentLogin: (name: string) => void;
}

export const LoginScreen: React.FC<Props> = ({ onTutorSelect, onStudentLogin }) => {
  const [role, setRole] = useState<'selection' | 'student'>('selection');
  const [studentName, setStudentName] = useState('');

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentName.trim()) {
      onStudentLogin(studentName);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Mandarin Master Plan</h1>
        <p className="text-slate-500 text-lg">IGCSE Preparation Platform</p>
      </div>


      {role === 'selection' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button
            onClick={onTutorSelect}
            className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all group"
          >
            <div className="bg-brand-50 p-4 rounded-full mb-4 group-hover:bg-brand-100 transition-colors">
              <GraduationCap className="w-10 h-10 text-brand-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">I am a Tutor</h2>
            <p className="text-slate-500 text-center">Create lesson plans and assign exercises to students.</p>
          </button>

          <button
            onClick={() => setRole('student')}
            className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="bg-blue-50 p-4 rounded-full mb-4 group-hover:bg-blue-100 transition-colors">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">I am a Student</h2>
            <p className="text-slate-500 text-center">Log in to view your dashboard and complete exercises.</p>
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <button 
            onClick={() => setRole('selection')}
            className="text-sm text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1"
          >
            ← Back
          </button>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Student Login</h2>
          
          <form onSubmit={handleStudentSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                What's your name?
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Enter your name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-200 transform active:scale-[0.98]"
            >
              Enter Dashboard <ChevronRight size={18} />
            </button>
          </form>
        </div>
      )}

    </div>
  );
};