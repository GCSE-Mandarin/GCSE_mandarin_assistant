"use client";

import React from 'react';
import { CheckCircle2, Loader2, User, X } from 'lucide-react';
import { Student } from '@/types';
import { useTutorStudent } from './TutorStudentProvider';

interface Props {
  open: boolean;
  required?: boolean;
  title?: string;
  description?: string;
  onClose?: () => void;
  onSelected?: (student: Student) => void;
}

export const TutorStudentSelector: React.FC<Props> = ({
  open,
  required = false,
  title = 'Choose a Student',
  description = 'Select which student you are teaching in this session.',
  onClose,
  onSelected,
}) => {
  const { students, loading, selectedStudent, selectStudent } = useTutorStudent();

  if (!open) return null;

  const handleClose = () => {
    if (required) return;
    onClose?.();
  };

  const handleSelect = (student: Student) => {
    selectStudent(student);
    onSelected?.(student);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
        onClick={event => event.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <User size={20} className="text-brand-600" /> {title}
            </h3>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
          {!required && (
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 size={32} className="text-brand-500 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-slate-100 p-4 rounded-full inline-flex mb-4">
                <User size={32} className="text-slate-400" />
              </div>
              <p className="font-semibold text-slate-700">No students found</p>
              <p className="text-sm text-slate-500 mt-1">Add a student from Student Progress first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map(student => {
                const isSelected = selectedStudent?.id === student.id;
                return (
                  <button
                    key={student.id}
                    onClick={() => handleSelect(student)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold shrink-0">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <span className={`font-medium flex-1 ${isSelected ? 'text-brand-800' : 'text-slate-700'}`}>
                      {student.name}
                    </span>
                    {isSelected && <CheckCircle2 size={18} className="text-brand-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
