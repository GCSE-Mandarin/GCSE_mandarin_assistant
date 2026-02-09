"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginScreen } from '@/components/LoginScreen';
import { Student } from '@/types';


export default function Home() {
  const router = useRouter();

  const handleTutorSelect = () => {
    router.push('/tutor/dashboard');
  };

  const handleStudentLogin = (student: Student) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', student.name);
      localStorage.setItem('currentUserId', student.id);
    }
    router.push('/student/dashboard');
  };

  return (
    <LoginScreen 
      onTutorSelect={handleTutorSelect} 
      onStudentLogin={handleStudentLogin} 
    />
  );
}
