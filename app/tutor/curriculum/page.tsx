"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { StageCurriculum } from '@/components/StageCurriculum';
import { AssignDialog } from '@/components/AssignDialog';
import { Stage, Topic, LearningPoint } from '@/types';
import { Suspense, useState } from 'react';

function CurriculumContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stageParam = searchParams.get('stage');
  const initialStageId = stageParam ? parseInt(stageParam) : undefined;

  const [assignTarget, setAssignTarget] = useState<{ pointId: string; description: string } | null>(null);

  const handleSelectPoint = (stage: Stage, topic: Topic, point: LearningPoint) => {
    router.push(`/tutor/editor/${stage.id}/${topic.id}/${point.id}`);
  };

  const handleAssignPoint = (_stage: Stage, _topic: Topic, point: LearningPoint) => {
    setAssignTarget({ pointId: point.id, description: point.description });
  };

  return (
    <>
      <StageCurriculum
        initialStageId={initialStageId}
        onSelectPoint={handleSelectPoint}
        onAssignPoint={handleAssignPoint}
        onBack={() => router.push('/tutor/dashboard')}
      />
      {assignTarget && (
        <AssignDialog
          pointId={assignTarget.pointId}
          pointDescription={assignTarget.description}
          onClose={() => setAssignTarget(null)}
        />
      )}
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
