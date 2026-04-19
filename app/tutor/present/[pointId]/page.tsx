"use client";

import { useRouter } from 'next/navigation';
import { TutorPresentationView } from '@/components/TutorPresentationView';
import { getLessonTemplate } from '@/lib/services/storage';
import { LessonTemplate } from '@/types';
import { Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

function PresentContent({ params }: { params: { pointId: string } }) {
  const router = useRouter();
  const { pointId } = params;
  const [template, setTemplate] = useState<LessonTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const t = await getLessonTemplate(decodeURIComponent(pointId));
      setTemplate(t);
      setLoading(false);
    };
    load();
  }, [pointId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={40} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <p className="text-slate-600 font-medium">Lesson template not found.</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-black transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <TutorPresentationView
      template={template}
      onBack={() => router.push('/tutor/curriculum')}
    />
  );
}

export default function PresentPage({ params }: { params: { pointId: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={40} className="text-brand-500 animate-spin" />
      </div>
    }>
      <PresentContent params={params} />
    </Suspense>
  );
}
