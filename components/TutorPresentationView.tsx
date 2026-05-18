'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LessonTemplate } from '../types';
import { generateSpeech } from '@/lib/services/geminiService';
import ReactMarkdown from 'react-markdown';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Volume2, Loader2,
  Pen, Eraser, Undo2, Redo2, Trash2, Minus, Plus, Maximize2, Minimize2,
  PanelRightClose, PanelRightOpen, UserPlus, CheckCircle2, Edit3, Save, X,
} from 'lucide-react';

interface Props {
  template: LessonTemplate;
  onBack: () => void;
  onAssign: () => void;
  onEditExercises: () => void;
  assigning?: boolean;
  selectedStudentName?: string;
  isAssignedToSelectedStudent?: boolean;
  onSavePages: (pages: string[]) => Promise<void>;
  savingPages?: boolean;
}

const STROKE_COLORS = [
  { name: 'Black', value: '#1e293b' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Blue', value: '#2563eb' },
];

const GRID_CELL_SIZE = 120;

function buildTianZiGeSvg(cellSize: number): string {
  const half = cellSize / 2;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cellSize}" height="${cellSize}">
      <rect width="${cellSize}" height="${cellSize}" fill="none" stroke="#d4d4d8" stroke-width="1.5"/>
      <line x1="${half}" y1="0" x2="${half}" y2="${cellSize}" stroke="#d4d4d8" stroke-width="0.75" stroke-dasharray="6,4"/>
      <line x1="0" y1="${half}" x2="${cellSize}" y2="${half}" stroke="#d4d4d8" stroke-width="0.75" stroke-dasharray="6,4"/>
    </svg>`
  )}`;
}

export const TutorPresentationView: React.FC<Props> = ({
  template,
  onBack,
  onAssign,
  onEditExercises,
  assigning = false,
  selectedStudentName,
  isAssignedToSelectedStudent = false,
  onSavePages,
  savingPages = false,
}) => {
  const [pages, setPages] = useState<string[]>(template.pages.length > 0 ? template.pages : [template.material || '']);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingPage, setEditingPage] = useState<number | null>(null);
  const [draftPage, setDraftPage] = useState('');
  const [pagesBeforeEdit, setPagesBeforeEdit] = useState<string[] | null>(null);
  const [pageBeforeEdit, setPageBeforeEdit] = useState<number | null>(null);

  const fontSizes = ['prose-sm', 'prose', 'prose-lg', 'prose-xl', 'prose-2xl'];
  const [fontSizeIndex, setFontSizeIndex] = useState(2);

  // Audio
  const [audioLoading, setAudioLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Canvas
  const canvasRef = useRef<ReactSketchCanvasRef | null>(null);
  const [erasing, setErasing] = useState(false);
  const [strokeColor, setStrokeColor] = useState(STROKE_COLORS[0].value);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [canvasVisible, setCanvasVisible] = useState(true);

  const gridBg = buildTianZiGeSvg(GRID_CELL_SIZE);

  useEffect(() => {
    const nextPages = template.pages.length > 0 ? template.pages : [template.material || ''];
    setPages(nextPages);
    setCurrentPage(page => Math.min(page, Math.max(nextPages.length - 1, 0)));
    setEditingPage(null);
    setDraftPage('');
    setPagesBeforeEdit(null);
    setPageBeforeEdit(null);
  }, [template]);

  const handlePrev = useCallback(() => {
    setCurrentPage(p => Math.max(0, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentPage(p => Math.min(pages.length - 1, p + 1));
  }, [pages.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (editingPage !== null || target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [editingPage, handlePrev, handleNext]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const playAudio = async (text: string) => {
    if (audioLoading) return;
    const matches = text.match(/[\u4e00-\u9fa50-9\u3000-\u303f\uff00-\uffef]+/g);
    const textToPlay = matches ? matches.join(' ') : text;
    if (!textToPlay.trim()) return;

    setAudioLoading(true);
    try {
      const speechResult = await generateSpeech(textToPlay);
      if (!speechResult) throw new Error('No audio returned');

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const base64 = typeof speechResult === 'string' ? speechResult : '';
      const binaryString = window.atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) {
      console.error('Audio playback failed', e);
    } finally {
      setAudioLoading(false);
    }
  };

  const toggleEraser = () => {
    const next = !erasing;
    setErasing(next);
    canvasRef.current?.eraseMode(next);
  };

  const startEditingCurrentPage = () => {
    setPagesBeforeEdit(null);
    setPageBeforeEdit(null);
    setEditingPage(currentPage);
    setDraftPage(pages[currentPage] || '');
  };

  const addPageAfterCurrent = () => {
    const updated = [...pages];
    const nextPageIndex = currentPage + 1;
    updated.splice(nextPageIndex, 0, '');
    setPagesBeforeEdit(pages);
    setPageBeforeEdit(currentPage);
    setPages(updated);
    setCurrentPage(nextPageIndex);
    setEditingPage(nextPageIndex);
    setDraftPage('');
  };

  const cancelEditing = () => {
    if (pagesBeforeEdit) {
      setPages(pagesBeforeEdit);
      setCurrentPage(pageBeforeEdit ?? Math.min(currentPage, Math.max(pagesBeforeEdit.length - 1, 0)));
    }
    setEditingPage(null);
    setDraftPage('');
    setPagesBeforeEdit(null);
    setPageBeforeEdit(null);
  };

  const savePageChanges = async () => {
    if (editingPage === null) return;

    const updated = [...pages];
    updated[editingPage] = draftPage;
    await onSavePages(updated);
    setPages(updated);
    setEditingPage(null);
    setDraftPage('');
    setPagesBeforeEdit(null);
    setPageBeforeEdit(null);
  };

  const progress = ((currentPage + 1) / pages.length) * 100;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-4 py-3 flex items-center justify-between gap-2 sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 sm:gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium py-1 px-1.5 sm:px-2 rounded-lg hover:bg-slate-50 shrink-0"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="hidden sm:block min-w-0">
            <h2 className="text-sm font-bold text-slate-800 line-clamp-1">{template.pointDescription}</h2>
            <div className="flex gap-2 text-xs text-slate-500">
              <span className="bg-slate-100 px-2 py-0.5 rounded">{template.stageTitle}</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded">{template.topicTitle}</span>
            </div>
          </div>
          <button
            onClick={onAssign}
            disabled={assigning || isAssignedToSelectedStudent}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ml-4 ${
              isAssignedToSelectedStudent
                ? 'bg-green-50 text-green-700 cursor-default'
                : 'bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50'
            }`}
            title={selectedStudentName ? `Assign to ${selectedStudentName}` : 'Assign to selected student'}
          >
            {assigning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isAssignedToSelectedStudent ? (
              <CheckCircle2 size={14} />
            ) : (
              <UserPlus size={14} />
            )}
            {isAssignedToSelectedStudent
              ? `Assigned${selectedStudentName ? ` to ${selectedStudentName}` : ''}`
              : `Assign${selectedStudentName ? ` to ${selectedStudentName}` : ''}`}
          </button>
          <button
            onClick={onEditExercises}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 bg-amber-50 text-amber-700 hover:bg-amber-100"
            title="Edit exercises for this lesson"
          >
            <Edit3 size={14} />
            Edit Exercises
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            <span className="hidden sm:inline">Page </span>{currentPage + 1} / {pages.length}
          </span>
          <div className="hidden sm:block sm:w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-brand-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setFontSizeIndex(Math.max(0, fontSizeIndex - 1))}
              disabled={fontSizeIndex === 0}
              className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="text-xs font-semibold text-slate-600 px-1.5 select-none">Aa</span>
            <button
              onClick={() => setFontSizeIndex(Math.min(fontSizes.length - 1, fontSizeIndex + 1))}
              disabled={fontSizeIndex === fontSizes.length - 1}
              className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          <button
            onClick={() => setCanvasVisible(v => !v)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${canvasVisible ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            title={canvasVisible ? 'Hide drawing canvas' : 'Show drawing canvas'}
          >
            {canvasVisible ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            {canvasVisible ? 'Hide Canvas' : 'Show Canvas'}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </header>

      {/* Main two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Lesson content */}
        <div className="flex-1 flex flex-col min-w-0" style={{ flex: '3 1 0%' }}>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 md:p-10 min-h-[400px]">
              <div className="mb-4 flex gap-2 justify-end">
                {editingPage === currentPage ? (
                  <>
                    <button
                      onClick={cancelEditing}
                      disabled={savingPages}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      onClick={savePageChanges}
                      disabled={savingPages}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {savingPages ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save Page
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={startEditingCurrentPage}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors"
                    >
                      <Edit3 size={14} /> Edit Page
                    </button>
                    <button
                      onClick={addPageAfterCurrent}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-700 text-sm font-medium transition-colors"
                    >
                      <Plus size={14} /> Add Page
                    </button>
                  </>
                )}
              </div>
              {editingPage === currentPage ? (
                <textarea
                  value={draftPage}
                  onChange={event => setDraftPage(event.target.value)}
                  className="w-full min-h-[420px] resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 font-mono text-sm leading-6"
                  placeholder="Write this page in Markdown..."
                  autoFocus
                />
              ) : (
                <div className={`prose prose-slate prose-headings:font-bold prose-p:text-slate-600 prose-li:text-slate-600 max-w-none transition-all duration-200 ${fontSizes[fontSizeIndex]}`}>
                  <ReactMarkdown>{pages[currentPage]}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          {/* Slide navigation footer */}
          <footer className="bg-white border-t border-slate-200 p-3 flex justify-between items-center shrink-0">
            <button
              onClick={handlePrev}
              disabled={currentPage === 0 || editingPage !== null}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={18} /> Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentPage >= pages.length - 1 || editingPage !== null}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all"
            >
              Next <ChevronRight size={18} />
            </button>
          </footer>
        </div>

        {/* Right: Drawing canvas with 田字格 */}
        <div
          className={`flex-col border-l border-slate-200 bg-white transition-all duration-300 ${canvasVisible ? 'hidden md:flex' : 'hidden'}`}
          style={{ flex: '2 1 0%' }}
        >
          {/* Canvas toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0 flex-wrap">
            <button
              onClick={() => { setErasing(false); canvasRef.current?.eraseMode(false); }}
              className={`p-2 rounded-lg transition-colors ${!erasing ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
              title="Pen"
            >
              <Pen size={16} />
            </button>
            <button
              onClick={toggleEraser}
              className={`p-2 rounded-lg transition-colors ${erasing ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
              title="Eraser"
            >
              <Eraser size={16} />
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            {STROKE_COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => { setStrokeColor(c.value); setErasing(false); canvasRef.current?.eraseMode(false); }}
                className={`w-6 h-6 rounded-full border-2 transition-all ${strokeColor === c.value && !erasing ? 'border-brand-500 scale-110' : 'border-slate-300'}`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 font-medium">Size</span>
              <input
                type="range"
                min={1}
                max={12}
                value={strokeWidth}
                onChange={e => setStrokeWidth(Number(e.target.value))}
                className="w-16 accent-brand-600"
              />
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <button
              onClick={() => canvasRef.current?.undo()}
              className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
              title="Undo"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={() => canvasRef.current?.redo()}
              className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
              title="Redo"
            >
              <Redo2 size={16} />
            </button>
            <button
              onClick={() => canvasRef.current?.clearCanvas()}
              className="p-2 text-slate-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
              title="Clear canvas"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Canvas area */}
          <div className="flex-1 relative overflow-hidden">
            <ReactSketchCanvas
              ref={canvasRef}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              eraserWidth={strokeWidth * 4}
              canvasColor="transparent"
              backgroundImage={gridBg}
              exportWithBackgroundImage={false}
              style={{ border: 'none' }}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
