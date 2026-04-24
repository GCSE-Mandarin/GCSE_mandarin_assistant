"use client";

import React, { useState } from 'react';
import { CheckCircle2, Loader2, User, UserPlus, X } from 'lucide-react';
import { createStudent } from '@/lib/services/storage';
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
  const { students, loading, selectedStudent, selectStudent, refreshStudents } = useTutorStudent();
  const [addingStudent, setAddingStudent] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [addStudentError, setAddStudentError] = useState<string | null>(null);

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

  const handleAddStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newStudentName.trim();
    if (!name) return;

    if (students.some(student => student.name.toLowerCase() === name.toLowerCase())) {
      setAddStudentError('A student with this name already exists.');
      return;
    }

    setAddingStudent(true);
    setAddStudentError(null);
    try {
      const created = await createStudent(name);
      if (!created) throw new Error('Failed to create student');
      await refreshStudents();
      handleSelect(created);
    } catch {
      setAddStudentError('Failed to add student. Please try again.');
    } finally {
      setAddingStudent(false);
    }
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
            <div className="space-y-4">
              {showAddStudent ? (
                <form onSubmit={handleAddStudent} className="p-4 rounded-xl border-2 border-brand-200 bg-brand-50 space-y-3">
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={event => { setNewStudentName(event.target.value); setAddStudentError(null); }}
                    placeholder="Student name"
                    className="w-full px-3 py-2 rounded-lg border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    autoFocus
                  />
                  {addStudentError && <p className="text-sm text-red-600">{addStudentError}</p>}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowAddStudent(false); setNewStudentName(''); setAddStudentError(null); }}
                      className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white rounded-lg transition-colors"
                      disabled={addingStudent}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingStudent || !newStudentName.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {addingStudent ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                      Add
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddStudent(true)}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  <UserPlus size={18} /> Add New Student
                </button>
              )}
              <div className="text-center py-8">
                <p className="font-semibold text-slate-700">No students found</p>
                <p className="text-sm text-slate-500 mt-1">Add a student to start teaching.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {showAddStudent ? (
                <form onSubmit={handleAddStudent} className="p-4 rounded-xl border-2 border-brand-200 bg-brand-50 space-y-3">
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={event => { setNewStudentName(event.target.value); setAddStudentError(null); }}
                    placeholder="Student name"
                    className="w-full px-3 py-2 rounded-lg border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    autoFocus
                  />
                  {addStudentError && <p className="text-sm text-red-600">{addStudentError}</p>}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowAddStudent(false); setNewStudentName(''); setAddStudentError(null); }}
                      className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white rounded-lg transition-colors"
                      disabled={addingStudent}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingStudent || !newStudentName.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {addingStudent ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                      Add
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddStudent(true)}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  <UserPlus size={18} /> Add New Student
                </button>
              )}
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
