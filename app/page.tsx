"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginScreen } from '@/components/LoginScreen';

export default function Home() {
  const router = useRouter();

  const handleTutorSelect = () => {
    router.push('/tutor/dashboard');
  };

  const handleStudentLogin = (name: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', name);
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
