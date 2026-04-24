"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { StageCurriculum } from '@/components/StageCurriculum';
import { Topic, Subtopic, LearningPoint } from '@/types';
import { Suspense } from 'react';

function CurriculumContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stageParam = searchParams.get('stage');
  const initialStageId = stageParam ? parseInt(stageParam) : undefined;

  const handleSelectPoint = (stage: Topic, topic: Subtopic, point: LearningPoint) => {
    router.push(`/tutor/editor/${stage.id}/${topic.id}/${point.id}`);
  };

  const handlePresentPoint = (point: LearningPoint) => {
    router.push(`/tutor/present/${encodeURIComponent(point.id)}`);
  };

  return (
    <>
      <StageCurriculum
        initialStageId={initialStageId}
        onSelectPoint={handleSelectPoint}
        onPresentPoint={handlePresentPoint}
        onBack={() => router.push('/tutor/dashboard')}
      />
    </>
  );
}

export default function CurriculumPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CurriculumContent />
    </Suspense>
  );
}
