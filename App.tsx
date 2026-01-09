
import React, { useState } from 'react';
import { ViewState, StudentProfile, Stage, Topic, LearningPoint, AssignedLesson } from './types';
import { LoginScreen } from './components/LoginScreen';
import { TutorDashboard } from './components/TutorDashboard';
import { StudentProgressView } from './components/StudentProgressView';
import { StudentOnboarding } from './components/StudentOnboarding';
import { StageCurriculum } from './components/StageCurriculum';
import { LessonEditor } from './components/LessonEditor';
import { StudentDashboard } from './components/StudentDashboard';
import { StudentLessonView } from './components/StudentLessonView';
import { SettingsView } from './components/SettingsView';
import { StudentVocabPractice } from './components/StudentVocabPractice';
import { VocabManagement } from './components/VocabManagement';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('login');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  
  // Selection State
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<LearningPoint | null>(null);
  
  // Student View State
  const [studentName, setStudentName] = useState<string>('');
  const [activeLesson, setActiveLesson] = useState<AssignedLesson | null>(null);

  // Navigation Handlers
  const handleTutorSelect = () => {
    setView('tutor-dashboard');
  };

  const handleStudentLogin = (name: string) => {
    setStudentName(name);
    setView('student-dashboard');
  };

  const handlePlanLesson = () => {
    setView('onboarding');
  };

  const handleViewProgress = () => {
    setView('tutor-progress');
  };

  const handleSettings = () => {
    setView('settings');
  };

  const handleManageVocab = () => {
    setView('vocab-management');
  };

  const handleOnboardingComplete = (newProfile: StudentProfile) => {
    setProfile(newProfile);
    setView('curriculum');
  };

  const handlePointSelection = (stage: Stage, topic: Topic, point: LearningPoint) => {
    setSelectedStage(stage);
    setSelectedTopic(topic);
    setSelectedPoint(point);
    setView('editor');
  };

  const handleBackToCurriculum = () => {
    setView('curriculum');
    setSelectedTopic(null);
    setSelectedPoint(null);
  };

  const handleBackToOnboarding = () => {
    setView('onboarding');
    setProfile(null);
  };

  const handleBackToDashboard = () => {
    setView('tutor-dashboard');
    setProfile(null);
  };

  const handleStudentLessonSelect = (lesson: AssignedLesson) => {
    setActiveLesson(lesson);
    setView('student-lesson');
  };

  const handleStudentPracticeVocab = () => {
    setView('student-vocab');
  };

  const handleLogout = () => {
    setProfile(null);
    setStudentName('');
    setActiveLesson(null);
    setView('login');
  };

  return (
    <div className="w-full bg-slate-50 text-slate-900 min-h-screen">
      {view === 'login' && (
        <LoginScreen 
          onTutorSelect={handleTutorSelect} 
          onStudentLogin={handleStudentLogin} 
        />
      )}

      {view === 'tutor-dashboard' && (
        <TutorDashboard 
          onPlanLesson={handlePlanLesson}
          onViewProgress={handleViewProgress}
          onBack={handleLogout}
          onSettings={handleSettings}
          onManageVocab={handleManageVocab}
        />
      )}

      {view === 'settings' && (
        <SettingsView onBack={handleBackToDashboard} />
      )}

      {view === 'tutor-progress' && (
        <StudentProgressView 
          onBack={handleBackToDashboard}
        />
      )}

      {view === 'onboarding' && (
        <div className="min-h-screen relative">
          <button onClick={handleBackToDashboard} className="absolute top-4 left-4 z-10 text-slate-400 hover:text-slate-600 touch-manipulation">Back</button>
          <StudentOnboarding onComplete={handleOnboardingComplete} />
        </div>
      )}
      
      {view === 'curriculum' && profile && (
        <StageCurriculum 
          stageId={profile.stageId} 
          studentName={profile.name}
          onSelectPoint={handlePointSelection}
          onBack={handleBackToOnboarding}
        />
      )}

      {view === 'editor' && selectedStage && selectedTopic && selectedPoint && profile && (
        <LessonEditor 
          key={selectedPoint.id}
          stage={selectedStage}
          topic={selectedTopic}
          point={selectedPoint}
          studentName={profile.name}
          onBack={handleBackToCurriculum}
        />
      )}

      {view === 'student-dashboard' && (
        <StudentDashboard 
          studentName={studentName} 
          onSelectLesson={handleStudentLessonSelect}
          onLogout={handleLogout}
          onPracticeVocab={handleStudentPracticeVocab}
        />
      )}

      {view === 'student-lesson' && activeLesson && (
        <StudentLessonView 
          lesson={activeLesson}
          onBack={() => setView('student-dashboard')}
        />
      )}

      {view === 'student-vocab' && (
        <StudentVocabPractice 
          studentName={studentName}
          onBack={() => setView('student-dashboard')}
        />
      )}

      {view === 'vocab-management' && (
        <VocabManagement 
          onBack={handleBackToDashboard}
        />
      )}
    </div>
  );
};

export default App;
