import React, { useEffect, useState } from 'react';
import { Student } from '../types';
import { getStudents, getAssignmentsByPointId, assignLessonToStudents, unassignLesson } from '@/lib/services/storage';
import { X, Loader2, Users, CheckCircle2 } from 'lucide-react';

interface Props {
  pointId: string;
  pointDescription: string;
  onClose: () => void;
}

export const AssignDialog: React.FC<Props> = ({ pointId, pointDescription, onClose }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [allStudents, existing] = await Promise.all([
        getStudents(),
        getAssignmentsByPointId(pointId),
      ]);
      setStudents(allStudents);
      const ids = new Set(existing.map(e => e.studentId));
      setAssignedIds(ids);
      setSelectedIds(new Set(ids));
      setLoading(false);
    };
    load();
  }, [pointId]);

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const toAssign = students.filter(s => selectedIds.has(s.id) && !assignedIds.has(s.id));
      const toUnassign = [...assignedIds].filter(id => !selectedIds.has(id));

      if (toAssign.length > 0) {
        await assignLessonToStudents(
          pointId,
          toAssign.map(s => ({ id: s.id, name: s.name }))
        );
      }

      for (const studentId of toUnassign) {
        await unassignLesson(pointId, studentId);
      }

      setAssignedIds(new Set(selectedIds));
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1200);
    } catch (e) {
      alert("Failed to update assignments. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = (() => {
    if (selectedIds.size !== assignedIds.size) return true;
    for (const id of selectedIds) {
      if (!assignedIds.has(id)) return true;
    }
    return false;
  })();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users size={20} className="text-brand-600" /> Assign Lesson
            </h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{pointDescription}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 size={32} className="text-brand-500 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No students found.</p>
              <p className="text-sm text-slate-400 mt-1">Create students first from the onboarding flow.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map(student => {
                const isSelected = selectedIds.has(student.id);
                return (
                  <button
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-brand-600' : 'border-2 border-slate-300'
                    }`}>
                      {isSelected && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                    <span className={`font-medium ${isSelected ? 'text-brand-800' : 'text-slate-700'}`}>
                      {student.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-sm text-slate-500">
            {selectedIds.size} student{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-6 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : null}
              {saving ? 'Saving...' : saved ? 'Done!' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
