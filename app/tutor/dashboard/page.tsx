"use client";

import { useRouter } from 'next/navigation';
import { TutorDashboard } from '@/components/TutorDashboard';

export default function TutorDashboardPage() {
  const router = useRouter();

  return (
    <TutorDashboard 
      onPlanLesson={() => router.push('/tutor/onboarding')}
      onViewProgress={() => router.push('/tutor/progress')}
      onBack={() => router.push('/')}
      onSettings={() => router.push('/tutor/settings')}
      onManageVocab={() => router.push('/tutor/vocab')}
      onCurriculum={() => router.push('/tutor/curriculum')}
    />
  );
}
