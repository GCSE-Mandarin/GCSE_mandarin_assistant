"use client";

import { useRouter } from 'next/navigation';
import { TutorDashboard } from '@/components/TutorDashboard';
import { createClient } from '@/utils/supabase/client';

export default function TutorDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <TutorDashboard 
      onPlanLesson={() => router.push('/tutor/onboarding')}
      onViewProgress={() => router.push('/tutor/progress')}
      onBack={handleLogout}
      onSettings={() => router.push('/tutor/settings')}
      onManageVocab={() => router.push('/tutor/vocab')}
      onCurriculum={() => router.push('/tutor/curriculum')}
    />
  );
}
