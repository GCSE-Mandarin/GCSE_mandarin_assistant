"use client";

import { useRouter } from 'next/navigation';
import { TutorPresentationView } from '@/components/TutorPresentationView';
import { TutorStudentSelector } from '@/components/TutorStudentSelector';
import { useTutorStudent } from '@/components/TutorStudentProvider';
import { CURRICULUM } from '@/data/curriculum';
import { assignLessonToStudents, getAssignmentsByPointId, getLessonTemplate, updateLessonTemplate } from '@/lib/services/storage';
import { LessonTemplate, Student } from '@/types';
import { Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

function PresentContent({ params }: { params: { pointId: string } }) {
  const router = useRouter();
  const { pointId } = params;
  const [template, setTemplate] = useState<LessonTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const { selectedStudent } = useTutorStudent();
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [savingPages, setSavingPages] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isAssignedToSelectedStudent, setIsAssignedToSelectedStudent] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const t = await getLessonTemplate(decodeURIComponent(pointId));
      setTemplate(t);
      setLoading(false);
    };
    load();
  }, [pointId]);

  useEffect(() => {
    const loadAssignmentStatus = async () => {
      if (!template || !selectedStudent) {
        setIsAssignedToSelectedStudent(false);
        return;
      }

      const assignments = await getAssignmentsByPointId(template.pointId);
      setIsAssignedToSelectedStudent(assignments.some(assignment => assignment.studentId === selectedStudent.id));
    };

    void loadAssignmentStatus();
  }, [template, selectedStudent]);

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

  const assignToStudent = async (student: Student) => {
    setAssigning(true);
    setAssignmentMessage(null);
    try {
      await assignLessonToStudents(template.pointId, [{ id: student.id, name: student.name }]);
      setIsAssignedToSelectedStudent(true);
      setAssignmentMessage(`Assigned to ${student.name}.`);
      window.setTimeout(() => setAssignmentMessage(null), 3000);
    } catch {
      alert('Failed to assign lesson. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssign = () => {
    if (!selectedStudent) {
      setShowStudentSelector(true);
      return;
    }
    void assignToStudent(selectedStudent);
  };

  const handleEditExercises = () => {
    for (const stage of CURRICULUM) {
      for (const topic of stage.topics) {
        const point = topic.points.find(p => p.id === template.pointId);
        if (point) {
          router.push(`/tutor/editor/${stage.id}/${topic.id}/${point.id}?view=exercises&back=present`);
          return;
        }
      }
    }

    alert('Could not find this lesson in the curriculum.');
  };

  const handleSavePages = async (pages: string[]) => {
    setSavingPages(true);
    setSaveMessage(null);
    try {
      const updatedTemplate: LessonTemplate = {
        ...template,
        pages,
        material: pages.join('\n---\n'),
      };
      await updateLessonTemplate(updatedTemplate);
      setTemplate(updatedTemplate);
      setSaveMessage('Lesson pages saved.');
      window.setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      alert('Failed to save lesson pages. Please try again.');
      throw new Error('Failed to save lesson pages');
    } finally {
      setSavingPages(false);
    }
  };

  return (
    <>
      <TutorPresentationView
        template={template}
        onBack={() => router.push('/tutor/curriculum')}
        onAssign={handleAssign}
        onEditExercises={handleEditExercises}
        assigning={assigning}
        selectedStudentName={selectedStudent?.name}
        isAssignedToSelectedStudent={isAssignedToSelectedStudent}
        onSavePages={handleSavePages}
        savingPages={savingPages}
      />
      {assignmentMessage && (
        <div className="fixed bottom-6 right-6 z-40 bg-green-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          {assignmentMessage}
        </div>
      )}
      {saveMessage && (
        <div className="fixed bottom-6 right-6 z-40 bg-blue-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          {saveMessage}
        </div>
      )}
      <TutorStudentSelector
        open={showStudentSelector}
        required={false}
        title="Choose a Student"
        description="Select a student to assign this lesson."
        onClose={() => setShowStudentSelector(false)}
        onSelected={student => {
          void assignToStudent(student);
        }}
      />
    </>
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
