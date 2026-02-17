"use client";

import { useRouter } from 'next/navigation';
import { StudentVocabPractice } from '@/components/StudentVocabPractice';
import { useEffect, useState } from 'react';

export default function StudentVocabPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('currentUser');
      const storedId = localStorage.getItem('currentUserId');
      if (storedName && storedId) {
        setStudentName(storedName);
        setStudentId(storedId);
      } else {
        router.push('/');
      }
    }
  }, [router]);

  if (!studentName || !studentId) return null;

  return (
    <StudentVocabPractice 
      studentId={studentId}
      studentName={studentName}
      onBack={() => router.push('/student/dashboard')}
    />
  );
}
