import React, { useState, useEffect } from 'react';
import { Stage, Topic, LearningPoint, LessonTemplate } from '../types';
import { CURRICULUM } from '../data/curriculum';
import { getAllLessonTemplates } from '@/lib/services/storage';
import { BookOpen, CheckCircle2, ChevronRight, ArrowLeft, Users, Loader2, Presentation } from 'lucide-react';

interface Props {
  initialStageId?: number;
  onSelectPoint: (stage: Stage, topic: Topic, point: LearningPoint) => void;
  onAssignPoint: (stage: Stage, topic: Topic, point: LearningPoint) => void;
  onPresentPoint: (point: LearningPoint) => void;
  onBack: () => void;
}

export const StageCurriculum: React.FC<Props> = ({ initialStageId, onSelectPoint, onAssignPoint, onPresentPoint, onBack }) => {
  const [activeStageId, setActiveStageId] = useState<number | null>(initialStageId ?? null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      const all = await getAllLessonTemplates();
      setTemplates(new Set(all.map(t => t.pointId)));
      setLoading(false);
    };
    fetchTemplates();
  }, []);

  const hasTemplate = (pointId: string) => templates.has(pointId);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Curriculum Management</h2>
            <p className="text-sm text-slate-500">Create lesson templates and assign to students</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 size={40} className="text-brand-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {CURRICULUM.map((stage) => (
              <div key={stage.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setActiveStageId(activeStageId === stage.id ? null : stage.id)}
                  className="w-full text-left p-5 flex justify-between items-center hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{stage.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{stage.goal}</p>
                  </div>
                  <ChevronRight
                    size={20}
                    className={`text-slate-400 transition-transform flex-shrink-0 ml-4 ${activeStageId === stage.id ? 'rotate-90' : ''}`}
                  />
                </button>

                {activeStageId === stage.id && (
                  <div className="border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
                      {stage.topics.map((topic) => (
                        <div 
                          key={topic.id}
                          className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                            activeTopicId === topic.id ? 'shadow-lg border-brand-200 ring-1 ring-brand-100' : 'shadow-sm border-slate-200 hover:shadow-md'
                          }`}
                        >
                          <div 
                            className="p-4 cursor-pointer bg-white border-b border-slate-100 flex justify-between items-center"
                            onClick={() => setActiveTopicId(activeTopicId === topic.id ? null : topic.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${activeTopicId === topic.id ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-600'}`}>
                                <BookOpen size={18} />
                              </div>
                              <h4 className="font-semibold text-slate-800 text-sm">{topic.title}</h4>
                            </div>
                            <ChevronRight size={16} className={`text-slate-400 transition-transform ${activeTopicId === topic.id ? 'rotate-90' : ''}`}/>
                          </div>

                          {activeTopicId === topic.id && (
                            <div className="bg-slate-50/50">
                              {topic.points.map((pt) => {
                                const exists = hasTemplate(pt.id);
                                return (
                                  <div
                                    key={pt.id}
                                    className="w-full text-left px-4 py-3 border-b border-slate-100 last:border-0 flex items-center gap-3 group"
                                  >
                                    <CheckCircle2
                                      size={18}
                                      className={`flex-shrink-0 ${exists ? 'text-green-500' : 'text-slate-300'}`}
                                    />
                                    <button
                                      onClick={() => onSelectPoint(stage, topic, pt)}
                                      className="flex-1 text-left text-sm text-slate-700 hover:text-brand-800 font-medium transition-colors"
                                    >
                                      {pt.description}
                                    </button>
                                    {exists && (
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <button
                                          onClick={() => onPresentPoint(pt)}
                                          className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                        >
                                          <Presentation size={14} /> Present
                                        </button>
                                        <button
                                          onClick={() => onAssignPoint(stage, topic, pt)}
                                          className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
                                        >
                                          <Users size={14} /> Assign
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
