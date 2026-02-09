"use client";

import { useRouter } from 'next/navigation';
import { StudentVocabPractice } from '@/components/StudentVocabPractice';
import { useEffect, useState } from 'react';

export default function StudentVocabPage() {
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

  return (
    <StudentVocabPractice 
      studentName={studentName}
      onBack={() => router.push('/student/dashboard')}
    />
  );
}
