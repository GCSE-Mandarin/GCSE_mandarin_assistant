"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getStudents } from '@/lib/services/storage';
import { Student } from '@/types';

const STORAGE_KEY = 'tutor:selectedStudent';

interface TutorStudentContextValue {
  selectedStudent: Student | null;
  students: Student[];
  loading: boolean;
  selectStudent: (student: Student) => void;
  clearSelectedStudent: () => void;
  refreshStudents: () => Promise<Student[]>;
}

const TutorStudentContext = createContext<TutorStudentContextValue | null>(null);

export const TutorStudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      setSelectedStudent(JSON.parse(stored) as Student);
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const refreshStudents = useCallback(async () => {
    setLoading(true);
    try {
      const allStudents = await getStudents();
      setStudents(allStudents);
      setSelectedStudent(prev => {
        if (!prev) return prev;
        const freshStudent = allStudents.find(student => student.id === prev.id);
        if (!freshStudent) {
          window.sessionStorage.removeItem(STORAGE_KEY);
          return null;
        }
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(freshStudent));
        return freshStudent;
      });
      return allStudents;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStudents();
  }, [refreshStudents]);

  const selectStudent = useCallback((student: Student) => {
    setSelectedStudent(student);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(student));
  }, []);

  const clearSelectedStudent = useCallback(() => {
    setSelectedStudent(null);
    window.sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<TutorStudentContextValue>(() => ({
    selectedStudent,
    students,
    loading,
    selectStudent,
    clearSelectedStudent,
    refreshStudents,
  }), [clearSelectedStudent, loading, refreshStudents, selectStudent, selectedStudent, students]);

  return (
    <TutorStudentContext.Provider value={value}>
      {children}
    </TutorStudentContext.Provider>
  );
};

export const useTutorStudent = () => {
  const context = useContext(TutorStudentContext);
  if (!context) {
    throw new Error('useTutorStudent must be used within TutorStudentProvider');
  }
  return context;
};
