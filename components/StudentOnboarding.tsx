import React, { useState, useEffect } from 'react';
import { Stage, StudentProfile, Student } from '../types';
import { CURRICULUM } from '../data/curriculum';
import { getStudents, createStudent } from '@/lib/services/storage';
import { User, GraduationCap, ChevronRight, Loader2 } from 'lucide-react';

interface Props {
  onComplete: (profile: StudentProfile) => void;
}

export const StudentOnboarding: React.FC<Props> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [existingStudents, setExistingStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      const students = await getStudents();
      setExistingStudents(students);
      setLoadingStudents(false);
      
      // If no students exist, switch to create mode automatically
      if (students.length === 0) {
        setMode('create');
      }
    };
    fetchStudents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (mode === 'create') {
      setCreating(true);
      try {
        const newStudent = await createStudent(name.trim());
        if (newStudent) {
          onComplete({ 
            name: newStudent.name, 
            stageId: selectedStage,
            studentId: newStudent.id  // Pass new ID
          });
        } else {
          onComplete({ name: name.trim(), stageId: selectedStage });
        }
      } catch (err) {
        console.error(err);
        onComplete({ name: name.trim(), stageId: selectedStage });
      } finally {
        setCreating(false);
      }
    } else {
      // Select existing
      const selectedStudent = existingStudents.find(s => s.name === name);
      onComplete({ 
        name: name.trim(), 
        stageId: selectedStage,
        studentId: selectedStudent?.id // Pass existing ID
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-10 max-w-2xl mx-auto px-6">
      <div className="text-center mb-10">
        <div className="bg-brand-100 p-4 rounded-full inline-block mb-4">
          <GraduationCap className="w-12 h-12 text-brand-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">New Student Plan</h1>
        <p className="text-slate-500">Prepare your student for IGCSE Mandarin success.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full bg-white shadow-xl rounded-2xl p-8 border border-slate-100">
        <div className="space-y-6">
          
          {/* Student Selection / Creation Toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              <span className="flex items-center gap-2"><User size={16} /> Student</span>
            </label>
            
            {loadingStudents ? (
               <div className="flex items-center gap-2 text-slate-500 p-3 bg-slate-50 rounded-lg">
                 <Loader2 size={16} className="animate-spin" /> Loading students...
               </div>
            ) : (
              <div className="space-y-3">
                {existingStudents.length > 0 && (
                  <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                    <button
                      type="button"
                      onClick={() => { setMode('select'); setName(''); }}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'select' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Select Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode('create'); setName(''); }}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'create' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Create New
                    </button>
                  </div>
                )}

                {mode === 'select' && existingStudents.length > 0 ? (
                  <select
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={mode === 'select'}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-white appearance-none"
                  >
                    <option value="">-- Choose a student --</option>
                    {existingStudents.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      required={mode === 'create'}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                      placeholder="e.g. Alex Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Current Level / Stage
            </label>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {CURRICULUM.map((stage) => (
                <div
                  key={stage.id}
                  onClick={() => setSelectedStage(stage.id)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    selectedStage === stage.id
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                      : 'border-slate-200 hover:border-brand-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-semibold ${selectedStage === stage.id ? 'text-brand-700' : 'text-slate-800'}`}>
                      {stage.title}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 bg-white rounded-md border border-slate-100 text-slate-500 shadow-sm">
                      {stage.duration}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{stage.goal}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={creating || (mode === 'select' && !name) || (mode === 'create' && !name)}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-brand-200 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {creating ? <Loader2 className="animate-spin" /> : <>Start Planning <ChevronRight size={18} /></>}
          </button>
        </div>
      </form>
    </div>
  );
};
