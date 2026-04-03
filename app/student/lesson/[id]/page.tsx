"use client";

import { useRouter } from 'next/navigation';
import { StudentLessonView } from '@/components/StudentLessonView';
import { AssignedLesson } from '@/types';
import { useEffect, useState } from 'react';
import { getAssignmentsForStudent } from '@/lib/services/storage';

export default function StudentLessonPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [lesson, setLesson] = useState<AssignedLesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLesson() {
      try {
        const studentId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;
        if (!studentId) {
          console.error("No student ID found");
          setLoading(false);
          return;
        }
        const lessons = await getAssignmentsForStudent(studentId);
        const found = lessons.find(l => l.id === params.id);
        if (found) {
          setLesson(found);
        } else {
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
