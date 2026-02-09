"use client";

import { useRouter } from 'next/navigation';
import { StudentLessonView } from '@/components/StudentLessonView';
import { AssignedLesson } from '@/types';
import { useEffect, useState } from 'react';
import { getLessons } from '@/lib/services/storage';

export default function StudentLessonPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [lesson, setLesson] = useState<AssignedLesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLesson() {
      try {
        const lessons = await getLessons();
        const found = lessons.find(l => l.id === params.id);
        if (found) {
          setLesson(found);
        } else {
          // Handle not found
          console.error("Lesson not found");
        }
      } catch (e) {
        console.error("Failed to fetch lesson", e);
      } finally {
        setLoading(false);
      }
    }
    fetchLesson();
  }, [params.id]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading lesson...</div>;
  if (!lesson) return <div className="p-8 text-center text-brand-600">Lesson not found</div>;

  return (
    <StudentLessonView 
      lesson={lesson}
      onBack={() => router.push('/student/dashboard')}
    />
  );
}
