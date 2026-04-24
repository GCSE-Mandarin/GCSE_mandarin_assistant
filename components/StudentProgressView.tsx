
import React, { useEffect, useState } from 'react';
import { getAllAssignments, getVocabProgress, updateAssignment, createStudent, getStudents } from '@/lib/services/storage';
import { AssignedLesson, VocabProgress, Student } from '../types';
import { ArrowLeft, User, BookOpen, CheckCircle2, Loader2, Eye, X, Check, XCircle, Edit2, Save, UserPlus, ChevronRight } from 'lucide-react';

interface Props {
  onBack: () => void;
  scopedStudent?: Student | null;
}

interface StudentStats {
  totalLessons: number;
  completedLessons: number;
  averageScore: number;
  lessons: AssignedLesson[];
  vocab: Record<string, VocabProgress[]>;
}

export const StudentProgressView: React.FC<Props> = ({ onBack, scopedStudent }) => {
  const [studentData, setStudentData] = useState<Record<string, StudentStats>>({});
  const [loading, setLoading] = useState(true);

  // Two-level navigation
  const [selectedStudent, setSelectedStudent] = useState<string | null>(scopedStudent?.name ?? null);

  // Lesson detail modal
  const [selectedLesson, setSelectedLesson] = useState<AssignedLesson | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedScores, setEditedScores] = useState<number[]>([]);
  const [editedComments, setEditedComments] = useState<string[]>([]);
  const [editedOverallComment, setEditedOverallComment] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Add student
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState<string | null>(null);

  useEffect(() => {
    if (scopedStudent) {
      setSelectedStudent(scopedStudent.name);
    }
  }, [scopedStudent]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [allLessons, allVocab, allStudents] = await Promise.all([
        getAllAssignments(),
        getVocabProgress(),
        getStudents(),
      ]);
      const stats: Record<string, StudentStats> = {};

      const studentMatchesScope = (student: Student) => {
        return !scopedStudent || student.id === scopedStudent.id;
      };

      allStudents.filter(studentMatchesScope).forEach(student => {
        stats[student.name] = { totalLessons: 0, completedLessons: 0, averageScore: 0, lessons: [], vocab: {} };
      });

      allLessons.forEach(lesson => {
        if (scopedStudent && lesson.studentId !== scopedStudent.id && lesson.studentName !== scopedStudent.name) return;
        const name = lesson.studentName;
        if (!stats[name]) {
          stats[name] = { totalLessons: 0, completedLessons: 0, averageScore: 0, lessons: [], vocab: {} };
        }
        stats[name].lessons.push(lesson);
        stats[name].totalLessons += 1;
        if (lesson.completed) stats[name].completedLessons += 1;
      });

      allVocab.forEach(v => {
        if (scopedStudent && v.studentId !== scopedStudent.id && v.studentName !== scopedStudent.name) return;
        const name = v.studentName;
        if (!stats[name]) {
          stats[name] = { totalLessons: 0, completedLessons: 0, averageScore: 0, lessons: [], vocab: {} };
        }
        if (!stats[name].vocab[v.category]) stats[name].vocab[v.category] = [];
        if (!stats[name].vocab[v.category].find(e => e.word === v.word)) {
          stats[name].vocab[v.category].push(v);
        }
      });

      Object.keys(stats).forEach(name => {
        const completed = stats[name].lessons.filter(l => l.completed);
        if (completed.length > 0) {
          const total = completed.reduce((acc, l) => acc + (l.score || 0), 0);
          stats[name].averageScore = Math.round(total / completed.length);
        }
      });

      setStudentData(stats);
      setLoading(false);
    };
    fetchData();
  }, [scopedStudent]);

  const students = Object.keys(studentData).sort();

  const handleLessonSelect = (lesson: AssignedLesson) => {
    setSelectedLesson(lesson);
    setIsEditing(false);
    const exerciseScores = lesson.exerciseScores || [];
    const tutorAdjustedScores = lesson.tutorAdjustedScores || exerciseScores;
    setEditedScores([...tutorAdjustedScores]);
    setEditedComments([...(lesson.tutorComments || new Array(lesson.exercises.length).fill(''))]);
    setEditedOverallComment(lesson.tutorOverallComment || '');
  };

  const calculateOverallScore = (scores: number[]): number => {
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, s) => a + s, 0) / scores.length);
  };

  const handleSaveAdjustments = async () => {
    if (!selectedLesson) return;
    setSaving(true);
    try {
      const overallScore = calculateOverallScore(editedScores);
      await updateAssignment(selectedLesson.id, {
        tutorAdjustedScores: editedScores,
        tutorComments: editedComments,
        tutorOverallComment: editedOverallComment,
        score: overallScore,
      });

      const updatedLesson: AssignedLesson = {
        ...selectedLesson,
        tutorAdjustedScores: editedScores,
        tutorComments: editedComments,
        tutorOverallComment: editedOverallComment,
        score: overallScore,
      };
      setSelectedLesson(updatedLesson);

      const allLessons = await getAllAssignments();
      const allVocab = await getVocabProgress();
      const stats: Record<string, StudentStats> = {};

      allLessons.forEach(lesson => {
        const name = lesson.studentName;
        if (!stats[name]) {
          stats[name] = { totalLessons: 0, completedLessons: 0, averageScore: 0, lessons: [], vocab: {} };
        }
        stats[name].lessons.push(lesson);
        stats[name].totalLessons += 1;
        if (lesson.completed) stats[name].completedLessons += 1;
      });

      allVocab.forEach(v => {
        const name = v.studentName;
        if (!stats[name]) {
          stats[name] = { totalLessons: 0, completedLessons: 0, averageScore: 0, lessons: [], vocab: {} };
        }
        if (!stats[name].vocab[v.category]) stats[name].vocab[v.category] = [];
        if (!stats[name].vocab[v.category].find(e => e.word === v.word)) {
          stats[name].vocab[v.category].push(v);
        }
      });

      Object.keys(stats).forEach(name => {
        const completed = stats[name].lessons.filter(l => l.completed);
        if (completed.length > 0) {
          const total = completed.reduce((acc, l) => acc + (l.score || 0), 0);
          stats[name].averageScore = Math.round(total / completed.length);
        }
      });

      setStudentData(stats);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save adjustments:', error);
      alert('Failed to save adjustments. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newStudentName.trim();
    if (!name) return;
    setAddingStudent(true);
    setAddStudentError(null);
    try {
      const existing = await getStudents();
      if (existing.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        setAddStudentError('A student with this name already exists.');
        setAddingStudent(false);
        return;
      }
      const created = await createStudent(name);
      if (!created) throw new Error('Failed to create student');
      setStudentData(prev => ({
        ...prev,
        [created.name]: { totalLessons: 0, completedLessons: 0, averageScore: 0, lessons: [], vocab: {} },
      }));
      setNewStudentName('');
      setShowAddStudent(false);
    } catch (err) {
      setAddStudentError('Failed to add student. Please try again.');
    } finally {
      setAddingStudent(false);
    }
  };

  // ── LEVEL 2: Student detail ──────────────────────────────────────────────
  if (selectedStudent !== null) {
    const data = studentData[selectedStudent];

    if (loading || !data) {
      return (
        <div className="h-full bg-slate-50 flex flex-col relative">
          <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 shrink-0">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-slate-800">{selectedStudent}</h1>
          </header>
          <div className="flex items-center justify-center h-64">
            <Loader2 size={40} className="text-brand-500 animate-spin" />
          </div>
        </div>
      );
    }

    const vocabCategories = Object.keys(data?.vocab || {});

    return (
      <div className="h-full bg-slate-50 flex flex-col relative">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setSelectedLesson(null);
              setIsEditing(false);
              if (scopedStudent) {
                onBack();
              } else {
                setSelectedStudent(null);
              }
            }}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-base shrink-0">
            {selectedStudent.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{selectedStudent}</h1>
            <p className="text-xs text-slate-500">Student Progress Report</p>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-6xl mx-auto w-full overflow-y-auto">
          {/* Stats bar */}
          <div className="flex items-center gap-6 bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 mb-6">
            <div className="text-center">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Lessons</div>
              <div className="text-2xl font-bold text-slate-700">{data.totalLessons}</div>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="text-center">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Completion</div>
              <div className="text-2xl font-semibold text-slate-700">
                {data.totalLessons > 0 ? Math.round((data.completedLessons / data.totalLessons) * 100) : 0}%
              </div>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="text-center">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg Score</div>
              <div className={`text-2xl font-bold ${data.averageScore >= 80 ? 'text-green-600' : data.averageScore >= 60 ? 'text-yellow-600' : 'text-slate-600'}`}>
                {data.completedLessons > 0 ? `${data.averageScore}%` : '—'}
              </div>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="text-center">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Vocab Topics</div>
              <div className="text-2xl font-semibold text-slate-700">{vocabCategories.length}</div>
            </div>
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lessons */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Assigned Lessons</h3>
              {data.lessons.length === 0 ? (
                <p className="text-slate-400 text-sm italic">No lessons assigned yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.lessons.map(lesson => (
                    <div key={lesson.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-700 truncate">{lesson.pointDescription}</h4>
                        <p className="text-xs text-slate-500">{new Date(lesson.assignedDate).toLocaleDateString()}</p>
                      </div>
                      {lesson.completed ? (
                        <div className="flex items-center gap-2">
                          <span className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                            (lesson.score || 0) >= 80 ? 'bg-green-100 text-green-700' :
                            (lesson.score || 0) >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {lesson.score || 0}%
                          </span>
                          <button
                            onClick={() => handleLessonSelect(lesson)}
                            className="p-1.5 hover:bg-white rounded-full text-slate-400 hover:text-blue-600 transition-colors shadow-sm"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="flex-shrink-0 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vocabulary */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Vocabulary Mastery</h3>
              {vocabCategories.length === 0 ? (
                <p className="text-slate-400 text-sm italic">No vocabulary practice recorded.</p>
              ) : (
                <div className="space-y-3">
                  {vocabCategories.map(cat => {
                    const words = data.vocab[cat];
                    return (
                      <div key={cat} className="p-3 bg-slate-50 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-slate-700 text-sm">{cat}</span>
                          <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                            {words.length} words
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {words.map((w, i) => (
                            <span key={i} title={`${w.pinyin}: ${w.meaning}`} className="inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded text-sm text-slate-600 chinese-text cursor-help">
                              {w.word}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Lesson Details Modal */}
        {selectedLesson && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-lg">Results: {selectedLesson.pointDescription}</h3>
                  <p className="text-xs text-slate-500">Student: {selectedLesson.studentName}</p>
                  {!isEditing && selectedLesson.tutorOverallComment && (
                    <p className="text-sm text-blue-600 mt-2 italic">&quot;{selectedLesson.tutorOverallComment}&quot;</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                      title="Edit Scores & Comments"
                    >
                      <Edit2 size={20} />
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedLesson(null); setIsEditing(false); }}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-1 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                <div className="space-y-4">
                  {selectedLesson.exercises.map((ex, idx) => {
                    const userAnswers = selectedLesson.userAnswers || [];
                    const exerciseScores = selectedLesson.exerciseScores || [];
                    const exerciseFeedback = selectedLesson.exerciseFeedback || [];
                    const tutorAdjustedScores = selectedLesson.tutorAdjustedScores || exerciseScores;
                    const tutorComments = selectedLesson.tutorComments || [];
                    const displayScore = isEditing ? (editedScores[idx] ?? exerciseScores[idx] ?? 0) : (tutorAdjustedScores[idx] ?? exerciseScores[idx] ?? 0);
                    const originalScore = exerciseScores[idx] || 0;
                    const exFeedback = exerciseFeedback[idx] || '';
                    const tutorComment = tutorComments[idx] || '';
                    const userAns = userAnswers[idx] || '(No answer)';
                    const borderColor = displayScore === 100 ? 'border-green-300' : displayScore >= 50 ? 'border-yellow-300' : 'border-red-300';
                    const bgColor = displayScore === 100 ? 'bg-green-50' : displayScore >= 50 ? 'bg-yellow-50' : 'bg-red-50';
                    const scoreColor = displayScore === 100 ? 'text-green-600' : displayScore >= 50 ? 'text-yellow-600' : 'text-red-600';
                    const iconColor = displayScore === 100 ? 'text-green-500' : displayScore >= 50 ? 'text-yellow-500' : 'text-red-500';

                    return (
                      <div key={idx} className={`bg-white p-5 rounded-xl border-2 ${borderColor} ${bgColor}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              displayScore === 100 ? 'bg-green-500' : displayScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}>
                              {idx + 1}
                            </div>
                            <h4 className="font-bold text-slate-800 chinese-text text-lg">{ex.question}</h4>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editedScores[idx] ?? originalScore}
                                  onChange={(e) => {
                                    const newScores = [...editedScores];
                                    newScores[idx] = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                    setEditedScores(newScores);
                                  }}
                                  className="w-20 px-2 py-1 border border-slate-300 rounded text-lg font-bold text-center"
                                />
                                <span className="text-slate-500">%</span>
                              </div>
                            ) : (
                              <>
                                <span className={`font-bold text-lg ${scoreColor}`}>{displayScore}%</span>
                                {displayScore !== originalScore && (
                                  <span className="text-xs text-slate-400 line-through">(was {originalScore}%)</span>
                                )}
                                {displayScore === 100 ? <Check className={iconColor} size={20} /> : <XCircle className={iconColor} size={20} />}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="ml-9 space-y-3">
                          <div className={`p-3 rounded-lg ${displayScore === 100 ? 'bg-green-100' : displayScore >= 50 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-60">Student Answer</p>
                            <p className={`font-medium chinese-text ${displayScore === 100 ? 'text-green-800' : displayScore >= 50 ? 'text-yellow-800' : 'text-red-800'}`}>
                              {userAns}
                            </p>
                          </div>
                          {exFeedback && (
                            <div className="p-3 rounded-lg bg-white border border-slate-200">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">AI Feedback</p>
                              <p className="text-sm text-slate-700">{exFeedback}</p>
                            </div>
                          )}
                          {ex.answer && (
                            <div className="p-3 rounded-lg bg-slate-100">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Correct Answer</p>
                              <p className="font-medium text-slate-800 chinese-text">{ex.answer}</p>
                            </div>
                          )}
                          {isEditing ? (
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Your Comment</p>
                              <textarea
                                value={editedComments[idx] || ''}
                                onChange={(e) => {
                                  const newComments = [...editedComments];
                                  newComments[idx] = e.target.value;
                                  setEditedComments(newComments);
                                }}
                                placeholder="Add a comment for the student..."
                                className="w-full p-2 border border-blue-300 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                              />
                            </div>
                          ) : tutorComment && (
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Tutor Comment</p>
                              <p className="text-sm text-blue-900">{tutorComment}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isEditing && (
                    <div className="bg-blue-50 border-2 border-blue-200 p-5 rounded-xl">
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Overall Comment</p>
                      <textarea
                        value={editedOverallComment}
                        onChange={(e) => setEditedOverallComment(e.target.value)}
                        placeholder="Add an overall comment for this lesson..."
                        className="w-full p-3 border border-blue-300 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        const exerciseScores = selectedLesson.exerciseScores || [];
                        const tutorAdjustedScores = selectedLesson.tutorAdjustedScores || exerciseScores;
                        setEditedScores([...tutorAdjustedScores]);
                        setEditedComments([...(selectedLesson.tutorComments || new Array(selectedLesson.exercises.length).fill(''))]);
                        setEditedOverallComment(selectedLesson.tutorOverallComment || '');
                      }}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAdjustments}
                      disabled={saving}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setSelectedLesson(null); setIsEditing(false); }}
                    className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-black transition-colors font-medium ml-auto"
                  >
                    Close Results
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LEVEL 1: Overview ────────────────────────────────────────────────────
  return (
    <div className="h-full bg-slate-50 flex flex-col relative">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-800">Student Progress</h1>
        </div>
        <button
          onClick={() => { setShowAddStudent(true); setNewStudentName(''); setAddStudentError(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <UserPlus size={16} /> Add Student
        </button>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={40} className="text-brand-500 animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-slate-100 p-6 rounded-full inline-block mb-4">
              <User className="text-slate-400 w-12 h-12" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">No students yet</h3>
            <p className="text-slate-500 mb-6">Add a student to get started.</p>
            <button
              onClick={() => { setShowAddStudent(true); setNewStudentName(''); setAddStudentError(null); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <UserPlus size={16} /> Add Your First Student
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map(name => {
              const data = studentData[name];
              const completionPct = data.totalLessons > 0 ? Math.round((data.completedLessons / data.totalLessons) * 100) : 0;
              return (
                <button
                  key={name}
                  onClick={() => setSelectedStudent(name)}
                  className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-md transition-all p-5 flex items-center gap-5 text-left group"
                >
                  <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-xl shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-slate-800 group-hover:text-brand-700 transition-colors">{name}</h2>
                    <div className="flex gap-4 text-sm text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1"><BookOpen size={13} /> {data.totalLessons} lesson{data.totalLessons !== 1 ? 's' : ''}</span>
                      {data.totalLessons > 0 && (
                        <span className="flex items-center gap-1"><CheckCircle2 size={13} /> {completionPct}% complete</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {data.completedLessons > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg Score</div>
                        <div className={`text-lg font-bold ${data.averageScore >= 80 ? 'text-green-600' : data.averageScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {data.averageScore}%
                        </div>
                      </div>
                    )}
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-brand-100 p-2 rounded-lg">
                  <UserPlus size={20} className="text-brand-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Add New Student</h3>
              </div>
              <button
                onClick={() => setShowAddStudent(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Student Name</label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={e => { setNewStudentName(e.target.value); setAddStudentError(null); }}
                  placeholder="e.g. Alex Smith"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                  autoFocus
                  required
                />
                {addStudentError && <p className="mt-1.5 text-sm text-red-600">{addStudentError}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
                  disabled={addingStudent}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStudent || !newStudentName.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {addingStudent ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                  {addingStudent ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
