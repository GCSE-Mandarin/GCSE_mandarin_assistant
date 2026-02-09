"use client";

import { useRouter } from 'next/navigation';
import { StudentDashboard } from '@/components/StudentDashboard';
import { AssignedLesson } from '@/types';
import { useEffect, useState } from 'react';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        setStudentName(stored);
      } else {
        router.push('/');
      }
    }
  }, [router]);

  if (!studentName) return null;

  const handleSelectLesson = (lesson: AssignedLesson) => {
    router.push(`/student/lesson/${lesson.id}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/');
  };

  const handlePracticeVocab = () => {
    router.push('/student/vocab');
  };

  return (
    <StudentDashboard 
      studentName={studentName} 
      onSelectLesson={handleSelectLesson}
      onLogout={handleLogout}
      onPracticeVocab={handlePracticeVocab}
    />
  );
}
