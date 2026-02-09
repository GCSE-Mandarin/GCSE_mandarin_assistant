import React, { useState } from 'react';
import { Stage, StudentProfile } from '../types';
import { CURRICULUM } from '../data/curriculum';
import { User, GraduationCap, ChevronRight } from 'lucide-react';

interface Props {
  onComplete: (profile: StudentProfile) => void;
}

export const StudentOnboarding: React.FC<Props> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [selectedStage, setSelectedStage] = useState<number>(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete({ name, stageId: selectedStage });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-6">
      <div className="text-center mb-10">
        <div className="bg-brand-100 p-4 rounded-full inline-block mb-4">
          <GraduationCap className="w-12 h-12 text-brand-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">New Student Plan</h1>
        <p className="text-slate-500">Prepare your student for IGCSE Mandarin success.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full bg-white shadow-xl rounded-2xl p-8 border border-slate-100">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <span className="flex items-center gap-2"><User size={16} /> Student Name</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              placeholder="e.g. Alex Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Current Level / Stage
            </label>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {CURRICULUM.map((stage) => (
                <div
                  key={stage.id}
                  onClick={() => setSelectedStage(stage.id)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    selectedStage === stage.id
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                      : 'border-slate-200 hover:border-brand-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-semibold ${selectedStage === stage.id ? 'text-brand-700' : 'text-slate-800'}`}>
                      {stage.title}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 bg-white rounded-md border border-slate-100 text-slate-500 shadow-sm">
                      {stage.duration}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{stage.goal}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-brand-200 transform active:scale-[0.98]"
          >
            Start Planning <ChevronRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};
