"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { StageCurriculum } from '@/components/StageCurriculum';
import { Stage, Topic, LearningPoint } from '@/types';
import { Suspense } from 'react';

function CurriculumContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentName = searchParams.get('student');
  const stageId = searchParams.get('stage');
  const studentId = searchParams.get('studentId');

  if (!studentName || !stageId) return <div>Missing profile data</div>;

  const handleSelectPoint = (stage: Stage, topic: Topic, point: LearningPoint) => {
    const params = new URLSearchParams({
      student: studentName
    });
    if (studentId) {
      params.append('studentId', studentId);
    }
    router.push(`/tutor/editor/${stage.id}/${topic.id}/${point.id}?${params.toString()}`);
  };

  return (
    <StageCurriculum 
      stageId={parseInt(stageId)} 
      studentName={studentName}
      onSelectPoint={handleSelectPoint}
      onBack={() => router.push('/tutor/onboarding')}
    />
  );
}

export default function CurriculumPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CurriculumContent />
    </Suspense>
  );
}
