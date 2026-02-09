import React, { useState, useEffect } from 'react';
import { Stage, Topic, LearningPoint, Exercise, AssignedLesson } from '../types';
import { generateLearningMaterial, generateExercises } from '@/lib/services/geminiService';
import { saveLesson } from '@/lib/services/storage';
import ReactMarkdown from 'react-markdown';
import { Loader2, Save, ArrowLeft, RefreshCw, PenLine, Plus, Trash2, X, ChevronRight, BookOpen, Dumbbell, Send, Languages, AlertTriangle } from 'lucide-react';

interface Props {
  stage: Stage;
  topic: Topic;
  point: LearningPoint;
  studentName: string;
  onBack: () => void;
}

type EditorView = 'material' | 'exercises';

export const LessonEditor: React.FC<Props> = ({ stage, topic, point, studentName, onBack }) => {
  const [view, setView] = useState<EditorView>('material');
  
  // Material State
  const [materialLoading, setMaterialLoading] = useState(true);
  const [material, setMaterial] = useState('');
  const [editMaterialMode, setEditMaterialMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Exercises State
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editExercisesMode, setEditExercisesMode] = useState(false);
  
  // Saving State
  const [saving, setSaving] = useState(false);

  // Initial Load - Generate Material Only
  useEffect(() => {
    let mounted = true;
    const fetchMaterial = async () => {
      setMaterialLoading(true);
      setError(null);
      try {
        const data = await generateLearningMaterial(stage.title, topic.title, point.description);
        if (mounted) {
          setMaterial(data);
          setMaterialLoading(false);
          setExercises([]);
        }
      } catch (err: any) {
        if (mounted) {
          if (err.message === 'MISSING_API_KEY') {
            setError("Missing API Key. Please go to Settings to configure it.");
          } else {
            setError("Failed to generate content. Please try again.");
          }
          setMaterialLoading(false);
        }
      }
    };
    fetchMaterial();
    return () => { mounted = false; };
  }, [stage, topic, point]);

  // Handlers for Material
  const handleGenerateExercises = async () => {
    setView('exercises');
    if (exercises.length === 0) {
      setExercisesLoading(true);
      const data = await generateExercises(stage.title, topic.title, point.description, material);
      setExercises(data);
      setExercisesLoading(false);
    }
  };

  // Handlers for Exercises Editing
  const handleExerciseChange = (index: number, field: keyof Exercise, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleOptionChange = (exerciseIndex: number, optionIndex: number, value: string) => {
    const updated = [...exercises];
    const options = [...(updated[exerciseIndex].options || [])];
    options[optionIndex] = value;
    updated[exerciseIndex] = { ...updated[exerciseIndex], options };
    setExercises(updated);
  };

  const addOption = (exerciseIndex: number) => {
    const updated = [...exercises];
    const options = [...(updated[exerciseIndex].options || [])];
    options.push('');
    updated[exerciseIndex] = { ...updated[exerciseIndex], options };
    setExercises(updated);
  };

  const removeOption = (exerciseIndex: number, optionIndex: number) => {
    const updated = [...exercises];
    const options = [...(updated[exerciseIndex].options || [])];
    options.splice(optionIndex, 1);
    updated[exerciseIndex] = { ...updated[exerciseIndex], options };
    setExercises(updated);
  };

  const addNewExercise = () => {
    setExercises([
      ...exercises,
      { type: 'quiz', question: 'New Question', questionTranslation: 'New Question Translation', answer: '', options: ['Option A', 'Option B'] }
    ]);
  };

  const removeExercise = (index: number) => {
    const updated = [...exercises];
    updated.splice(index, 1);
    setExercises(updated);
  };

  const regenerateExercises = async () => {
    setExercisesLoading(true);
    setExercises([]); // Clear to show loading state better
    const data = await generateExercises(stage.title, topic.title, point.description, material);
    setExercises(data);
    setExercisesLoading(false);
  };

  const handleAssignToStudent = async () => {
    setSaving(true);
    const newLesson: AssignedLesson = {
      id: crypto.randomUUID(),
      studentName: studentName,
      stageTitle: stage.title,
      topicTitle: topic.title,
      pointDescription: point.description,
      material: material,
      exercises: exercises,
      assignedDate: new Date().toISOString(),
      completed: false
    };

    try {
        await saveLesson(newLesson);
        alert(`Lesson assigned to ${studentName} successfully!`);
        onBack();
    } catch (e) {
        alert("Failed to save lesson. Check your internet or Supabase settings.");
    } finally {
        setSaving(false);
    }
  };

  // Error Screen
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-red-100 p-4 rounded-full mb-4">
          <AlertTriangle className="text-red-600 w-12 h-12" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Generation Failed</h3>
        <p className="text-slate-600 mb-6 max-w-md">{error}</p>
        <button 
          onClick={onBack}
          className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-black transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Loading Screen
  if (materialLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin text-brand-500 mb-4">
          <Loader2 size={48} />
        </div>
        <h3 className="text-xl font-semibold text-slate-700">Planning Lesson...</h3>
        <p className="text-slate-500 mt-2">Generating material for "{point.description}"</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-800 line-clamp-1">{point.description}</h2>
            <div className="flex gap-2 text-xs text-slate-500">
              <span className="bg-slate-100 px-2 py-0.5 rounded">{stage.title}</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded">{topic.title}</span>
            </div>
          </div>
        </div>

        {/* View Switcher / Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
                onClick={() => setView('material')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'material' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <BookOpen size={16} /> Material
            </button>
            <button 
                onClick={handleGenerateExercises}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'exercises' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Dumbbell size={16} /> Exercises
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        
        {/* VIEW 1: MATERIAL */}
        {view === 'material' && (
            <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-3xl mx-auto bg-white shadow-sm border border-slate-200 rounded-2xl p-8 min-h-full">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-lg font-bold text-slate-800">Learning Material</h3>
                            <button 
                                onClick={() => setEditMaterialMode(!editMaterialMode)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${editMaterialMode ? 'bg-brand-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                            >
                                {editMaterialMode ? <Save size={16} /> : <PenLine size={16} />}
                                {editMaterialMode ? 'Done' : 'Edit'}
                            </button>
                        </div>

                        {editMaterialMode ? (
                            <textarea 
                                className="w-full h-[600px] p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-mono text-sm leading-relaxed"
                                value={material}
                                onChange={(e) => setMaterial(e.target.value)}
                            />
                        ) : (
                            <div className="prose prose-slate prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-p:text-slate-600 prose-li:text-slate-600 max-w-none">
                                <ReactMarkdown>{material}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Footer Action */}
                <div className="p-4 bg-white border-t border-slate-200 flex justify-center">
                    <button 
                        onClick={handleGenerateExercises}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-brand-200 transition-all transform active:scale-[0.98]"
                    >
                        Generate Exercises <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        )}

        {/* VIEW 2: EXERCISES */}
        {view === 'exercises' && (
            <div className="h-full flex flex-col">
                 {exercisesLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <Loader2 size={40} className="text-brand-500 animate-spin mb-4" />
                        <p className="text-slate-500">Creating custom exercises...</p>
                        <p className="text-xs text-slate-400 mt-2">This may take a moment</p>
                    </div>
                 ) : (
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
                        <div className="max-w-3xl mx-auto">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Practice Exercises</h3>
                                    <p className="text-sm text-slate-500">Review before assigning to {studentName}</p>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={regenerateExercises}
                                        className="p-2 text-slate-400 hover:text-brand-600 transition-colors"
                                        title="Regenerate"
                                    >
                                        <RefreshCw size={20} />
                                    </button>
                                    <button 
                                        onClick={() => setEditExercisesMode(!editExercisesMode)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${editExercisesMode ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        {editExercisesMode ? <Save size={16} /> : <PenLine size={16} />}
                                        {editExercisesMode ? 'Save Changes' : 'Edit Exercises'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6 mb-20">
                                {exercises.length > 0 ? (
                                    exercises.map((exercise, idx) => (
                                        <div key={idx} className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative transition-all ${editExercisesMode ? 'ring-1 ring-brand-100 border-brand-200' : ''}`}>
                                            
                                            {editExercisesMode && (
                                                <button 
                                                    onClick={() => removeExercise(idx)}
                                                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}

                                            {editExercisesMode ? (
                                                <div className="space-y-4">
                                                    <div className="flex gap-4">
                                                        <div className="w-1/3">
                                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
                                                            <select
                                                            value={exercise.type}
                                                            onChange={(e) => handleExerciseChange(idx, 'type', e.target.value)}
                                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                                            >
                                                            <option value="quiz">Quiz</option>
                                                            <option value="translation">Translation</option>
                                                            <option value="composition">Composition</option>
                                                            </select>
                                                        </div>
                                                        <div className="w-2/3">
                                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Model Answer</label>
                                                            <input
                                                            type="text"
                                                            value={exercise.answer || ''}
                                                            onChange={(e) => handleExerciseChange(idx, 'answer', e.target.value)}
                                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Question (Chinese)</label>
                                                        <textarea
                                                        value={exercise.question}
                                                        onChange={(e) => handleExerciseChange(idx, 'question', e.target.value)}
                                                        rows={2}
                                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none chinese-text"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Question Translation (English)</label>
                                                        <input
                                                        type="text"
                                                        value={exercise.questionTranslation || ''}
                                                        onChange={(e) => handleExerciseChange(idx, 'questionTranslation', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                                        placeholder="English translation"
                                                        />
                                                    </div>

                                                    {exercise.type === 'quiz' && (
                                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Options</label>
                                                        <div className="space-y-2">
                                                        {(exercise.options || []).map((opt, optIdx) => (
                                                            <div key={optIdx} className="flex items-center gap-2">
                                                            <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0"></div>
                                                            <input 
                                                                value={opt}
                                                                onChange={(e) => handleOptionChange(idx, optIdx, e.target.value)}
                                                                className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded bg-white focus:border-brand-500 outline-none chinese-text"
                                                            />
                                                            <button 
                                                                onClick={() => removeOption(idx, optIdx)}
                                                                className="text-slate-400 hover:text-red-500"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                            </div>
                                                        ))}
                                                        <button 
                                                            onClick={() => addOption(idx)}
                                                            className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-2 pl-6"
                                                        >
                                                            <Plus size={12} /> Add Option
                                                        </button>
                                                        </div>
                                                    </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className="bg-brand-50 text-brand-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                                                            {exercise.type}
                                                        </span>
                                                        <span className="text-slate-300 font-mono text-sm">#{idx + 1}</span>
                                                    </div>
                                                    <h4 className="text-lg text-slate-800 font-medium mb-1 chinese-text">{exercise.question}</h4>
                                                    {exercise.questionTranslation && (
                                                        <p className="text-sm text-slate-400 mb-4 italic flex items-center gap-1">
                                                            <Languages size={12} /> {exercise.questionTranslation}
                                                        </p>
                                                    )}
                                                    
                                                    {exercise.type === 'quiz' && Array.isArray(exercise.options) && (
                                                        <div className="space-y-2 mt-4">
                                                            {exercise.options.map((opt, i) => (
                                                                <div key={i} className="flex items-center p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group">
                                                                    <div className="w-4 h-4 rounded-full border border-slate-300 mr-3 group-hover:border-brand-400"></div>
                                                                    <span className="text-slate-600 chinese-text">{opt}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {exercise.type !== 'quiz' && (
                                                        <div className="mt-4 p-4 bg-slate-50 border-l-4 border-slate-200 rounded-r-lg">
                                                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Model Answer</p>
                                                            <p className="text-slate-700 chinese-text font-medium">{exercise.answer}</p>
                                                        </div>
                                                    )}
                                                    
                                                    {exercise.type === 'quiz' && (
                                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                                            <details className="group">
                                                                <summary className="flex cursor-pointer text-xs font-medium text-slate-400 uppercase hover:text-brand-500 transition-colors list-none">
                                                                    <span className="flex items-center gap-1">Show Answer <ChevronRight size={14} className="group-open:rotate-90 transition-transform"/></span>
                                                                </summary>
                                                                <p className="mt-2 text-sm text-slate-700 font-medium chinese-text pl-4 border-l-2 border-brand-200">{exercise.answer}</p>
                                                            </details>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
                                        <Dumbbell className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                                        <p className="text-slate-500 font-medium">No exercises generated yet.</p>
                                        <p className="text-sm text-slate-400 mb-6">Click regenerate or add one manually.</p>
                                        <button 
                                            onClick={regenerateExercises}
                                            className="text-brand-600 font-semibold hover:underline"
                                        >
                                            Try Generating Again
                                        </button>
                                    </div>
                                )}

                                {editExercisesMode && (
                                    <button 
                                        onClick={addNewExercise}
                                        className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={20} /> Add New Exercise
                                    </button>
                                )}
                            </div>

                            {/* Assign Bar */}
                            {exercises.length > 0 && (
                                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-center z-10">
                                    <button 
                                        onClick={handleAssignToStudent}
                                        disabled={saving}
                                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-200 transform active:scale-[0.98] transition-all disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                                        {saving ? 'Assigning...' : `Assign to ${studentName}`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                 )}
            </div>
        )}
      </main>
    </div>
  );
};
