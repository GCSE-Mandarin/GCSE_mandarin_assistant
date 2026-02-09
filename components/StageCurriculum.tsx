import React, { useState } from 'react';
import { Stage, Topic, LearningPoint } from '../types';
import { CURRICULUM } from '../data/curriculum';
import { BookOpen, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';

interface Props {
  stageId: number;
  studentName: string;
  onSelectPoint: (stage: Stage, topic: Topic, point: LearningPoint) => void;
  onBack: () => void;
}

export const StageCurriculum: React.FC<Props> = ({ stageId, studentName, onSelectPoint, onBack }) => {
  const stage = CURRICULUM.find(s => s.id === stageId);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  if (!stage) return <div>Stage not found</div>;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{studentName}'s Curriculum</h2>
            <p className="text-sm text-brand-600 font-medium">{stage.title}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Learning Topics</h3>
            <p className="text-slate-500">Select a learning point to generate today's lesson.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stage.topics.map((topic) => (
                <div 
                    key={topic.id} 
                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                        activeTopicId === topic.id ? 'shadow-lg border-brand-200 ring-1 ring-brand-100' : 'shadow-sm border-slate-200 hover:shadow-md'
                    }`}
                >
                    <div 
                        className="p-5 cursor-pointer bg-white border-b border-slate-100 flex justify-between items-center"
                        onClick={() => setActiveTopicId(activeTopicId === topic.id ? null : topic.id)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${activeTopicId === topic.id ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-600'}`}>
                                <BookOpen size={20} />
                            </div>
                            <h4 className="font-semibold text-slate-800">{topic.title}</h4>
                        </div>
                        <ChevronRight size={18} className={`text-slate-400 transition-transform ${activeTopicId === topic.id ? 'rotate-90' : ''}`}/>
                    </div>

                    {activeTopicId === topic.id && (
                        <div className="bg-slate-50/50">
                            {topic.points.map((point) => (
                                <button
                                    key={point.id}
                                    onClick={() => onSelectPoint(stage, topic, point)}
                                    className="w-full text-left px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-brand-50 group flex items-start gap-3 transition-colors"
                                >
                                    <CheckCircle2 size={18} className="text-slate-300 group-hover:text-brand-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-slate-700 group-hover:text-brand-800 font-medium">
                                        {point.description}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
      </main>
    </div>
  );
};
