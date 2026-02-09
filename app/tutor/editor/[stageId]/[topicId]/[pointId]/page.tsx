"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { LessonEditor } from '@/components/LessonEditor';
import { CURRICULUM } from '@/data/curriculum';
import { Stage, Topic, LearningPoint } from '@/types';
import { Suspense, useMemo } from 'react';

function EditorContent({ params }: { params: { stageId: string, topicId: string, pointId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentName = searchParams.get('student') || 'Student';

  const { stageId, topicId, pointId } = params;

  // Find the exact objects
  const data = useMemo(() => {
    const stage = CURRICULUM.find(s => s.id === parseInt(stageId));
    if (!stage) return null;
    const topic = stage.topics.find(t => t.id === topicId);
    if (!topic) return null;
    const point = topic.points.find(p => p.id === pointId);
    if (!point) return null;
    return { stage, topic, point };
  }, [stageId, topicId, pointId]);

  if (!data) return <div>Curriculum point not found</div>;

  const handleBack = () => {
    const p = new URLSearchParams({
        student: studentName,
        stage: stageId
    });
    router.push(`/tutor/curriculum?${p.toString()}`);
  };

  return (
    <LessonEditor 
      key={data.point.id}
      stage={data.stage}
      topic={data.topic}
      point={data.point}
      studentName={studentName}
      onBack={handleBack}
    />
  );
}

export default function EditorPage({ params }: { params: { stageId: string, topicId: string, pointId: string } }) {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <EditorContent params={params} />
    </Suspense>
  );
}
