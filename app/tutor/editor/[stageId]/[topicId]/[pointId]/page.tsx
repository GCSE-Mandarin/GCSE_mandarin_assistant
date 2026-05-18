"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { LessonEditor } from '@/components/LessonEditor';
import { CURRICULUM } from '@/data/curriculum';
import { Suspense, useMemo } from 'react';

function EditorContent({ params }: { params: { stageId: string, topicId: string, pointId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { stageId, topicId, pointId } = params;
  const initialView = searchParams.get('view') === 'exercises' ? 'exercises' : 'material';
  const backTarget = searchParams.get('back');

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
    if (backTarget === 'present') {
      router.push(`/tutor/present/${encodeURIComponent(pointId)}`);
      return;
    }

    const p = new URLSearchParams({ stage: stageId });
    router.push(`/tutor/curriculum?${p.toString()}`);
  };

  return (
    <LessonEditor 
      key={data.point.id}
      stage={data.stage}
      topic={data.topic}
      point={data.point}
      onBack={handleBack}
      initialView={initialView}
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
