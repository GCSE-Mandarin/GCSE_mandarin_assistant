"use client";

import { useRouter } from 'next/navigation';
import { StudentOnboarding } from '@/components/StudentOnboarding';
import { StudentProfile } from '@/types';

export default function OnboardingPage() {
  const router = useRouter();

  const handleComplete = (profile: StudentProfile) => {
    // Navigate to curriculum with query params
    const params = new URLSearchParams({
      student: profile.name,
      stage: profile.stageId.toString()
    });
    if (profile.studentId) {
      params.append('studentId', profile.studentId);
    }
    router.push(`/tutor/curriculum?${params.toString()}`);
  };

  return (
    <div className="min-h-screen relative bg-slate-50">
       <button 
         onClick={() => router.push('/tutor/dashboard')} 
         className="absolute top-4 left-4 z-10 text-slate-400 hover:text-slate-600 touch-manipulation"
       >
         Back
       </button>
       <StudentOnboarding onComplete={handleComplete} />
    </div>
  );
}
