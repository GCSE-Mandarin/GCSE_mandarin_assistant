"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TutorDashboard } from '@/components/TutorDashboard';
import { TutorStudentSelector } from '@/components/TutorStudentSelector';
import { useTutorStudent } from '@/components/TutorStudentProvider';
import { createClient } from '@/utils/supabase/client';

export default function TutorDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { selectedStudent, loading } = useTutorStudent();
  const [showStudentSelector, setShowStudentSelector] = useState(false);

  useEffect(() => {
    if (!loading && !selectedStudent) {
      setShowStudentSelector(true);
    }
  }, [loading, selectedStudent]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <TutorDashboard 
        onViewProgress={() => router.push('/tutor/progress')}
        onBack={handleLogout}
        onSettings={() => router.push('/tutor/settings')}
        onManageVocab={() => router.push('/tutor/vocab')}
        onCurriculum={() => router.push('/tutor/curriculum')}
        selectedStudent={selectedStudent}
        onChangeStudent={() => setShowStudentSelector(true)}
      />
      <TutorStudentSelector
        open={showStudentSelector}
        required={!selectedStudent}
        onClose={() => setShowStudentSelector(false)}
      />
    </>
  );
}
