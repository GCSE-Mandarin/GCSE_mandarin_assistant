"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentProgressView } from '@/components/StudentProgressView';
import { TutorStudentSelector } from '@/components/TutorStudentSelector';
import { useTutorStudent } from '@/components/TutorStudentProvider';

export default function ProgressPage() {
  const router = useRouter();
  const { selectedStudent, loading } = useTutorStudent();
  const [showStudentSelector, setShowStudentSelector] = useState(false);

  if (!loading && !selectedStudent) {
    return (
      <>
        <StudentProgressView onBack={() => router.push('/tutor/dashboard')} scopedStudent={null} />
        <TutorStudentSelector
          open
          required
          title="Choose a Student"
          description="Select a student to view their progress report."
          onClose={() => setShowStudentSelector(false)}
        />
      </>
    );
  }

  return (
    <>
      <StudentProgressView onBack={() => router.push('/tutor/dashboard')} scopedStudent={selectedStudent} />
      <TutorStudentSelector
        open={showStudentSelector}
        onClose={() => setShowStudentSelector(false)}
      />
    </>
  );
}
