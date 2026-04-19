import { createClient } from '@/utils/supabase/client';
import { AssignedLesson, LessonTemplate, VocabProgress, VocabList, Student } from '@/types';

// Create a single client instance for browser operations
const supabaseInstance = createClient();

export const getSupabase = () => {
  return supabaseInstance;
};

const getTutorId = async () => {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

// --- SAVE LESSON ---
export const saveLesson = async (lesson: AssignedLesson): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const tutorId = await getTutorId();
  if (!tutorId) throw new Error("Not logged in as tutor");

  const { error } = await supabase.from('lessons').insert({
    id: lesson.id,
    student_name: lesson.studentName,
    student_id: lesson.studentId,
    data: lesson,
    tutor_id: tutorId
  });

  if (error) {
    console.error("Supabase Save Error:", error);
    throw new Error("Failed to save to cloud");
  }
};

// --- GET ALL LESSONS ---
export const getLessons = async (): Promise<AssignedLesson[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('lessons')
    .select('data')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Supabase Fetch Error:", error);
    return [];
  }
  
  return data.map((row: any) => row.data as AssignedLesson);
};

// --- GET LESSONS FOR STUDENT (By ID) ---
export const getLessonsByStudentId = async (studentId: string): Promise<AssignedLesson[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('data')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return [];
    }
    return data.map((row: any) => row.data as AssignedLesson);
  } catch (e) {
    console.error("Failed to fetch lessons by ID", e);
    return [];
  }
};


// --- UPDATE LESSON ---
export const updateLesson = async (updatedLesson: AssignedLesson): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase
    .from('lessons')
    .update({ data: updatedLesson })
    .eq('id', updatedLesson.id);

  if (error) {
    console.error("Supabase Update Error:", error);
    throw new Error("Failed to update lesson");
  }
};

// =============================================================
// LESSON TEMPLATES
// =============================================================

const parsePages = (row: any): string[] => {
  const pages = row.pages;
  if (Array.isArray(pages) && pages.length > 0) return pages;
  const mat = row.material || '';
  if (!mat) return [];
  return mat.split('---').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
};

export const getLessonTemplate = async (pointId: string): Promise<LessonTemplate | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('lesson_templates')
      .select('*')
      .eq('point_id', pointId)
      .single();

    if (error || !data) return null;

    const pages = parsePages(data);
    return {
      pointId: data.point_id,
      stageTitle: data.stage_title,
      topicTitle: data.topic_title,
      pointDescription: data.point_description,
      pages,
      material: pages.join('\n---\n'),
      originalMaterial: data.original_material,
      exercises: data.exercises || [],
      originalExercises: data.original_exercises,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (e) {
    console.error("Failed to fetch lesson template", e);
    return null;
  }
};

export const getAllLessonTemplates = async (): Promise<LessonTemplate[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('lesson_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return [];
    }

    return data.map((row: any) => {
      const pages = parsePages(row);
      return {
        pointId: row.point_id,
        stageTitle: row.stage_title,
        topicTitle: row.topic_title,
        pointDescription: row.point_description,
        pages,
        material: pages.join('\n---\n'),
        originalMaterial: row.original_material,
        exercises: row.exercises || [],
        originalExercises: row.original_exercises,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  } catch (e) {
    console.error("Failed to fetch lesson templates", e);
    return [];
  }
};

export const saveLessonTemplate = async (template: LessonTemplate): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const tutorId = await getTutorId();
  if (!tutorId) throw new Error("Not logged in as tutor");

  const { error } = await supabase
    .from('lesson_templates')
    .upsert({
      point_id: template.pointId,
      stage_title: template.stageTitle,
      topic_title: template.topicTitle,
      point_description: template.pointDescription,
      pages: template.pages,
      material: template.pages.join('\n---\n'),
      original_material: template.originalMaterial,
      exercises: template.exercises,
      original_exercises: template.originalExercises,
      updated_at: new Date().toISOString(),
      created_by: tutorId,
    }, { onConflict: 'point_id' });

  if (error) {
    console.error("Supabase Save Error:", error);
    throw new Error("Failed to save lesson template");
  }
};

export const updateLessonTemplate = async (template: LessonTemplate): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase
    .from('lesson_templates')
    .update({
      pages: template.pages,
      material: template.pages.join('\n---\n'),
      original_material: template.originalMaterial,
      exercises: template.exercises,
      original_exercises: template.originalExercises,
      updated_at: new Date().toISOString(),
    })
    .eq('point_id', template.pointId);

  if (error) {
    console.error("Supabase Update Error:", error);
    throw new Error("Failed to update lesson template");
  }
};

// =============================================================
// LESSON ASSIGNMENTS
// =============================================================

export const assignLessonToStudents = async (
  pointId: string,
  students: { id: string; name: string }[]
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const tutorId = await getTutorId();
  if (!tutorId) throw new Error("Not logged in as tutor");

  const rows = students.map(s => ({
    point_id: pointId,
    student_id: s.id,
    student_name: s.name,
    tutor_id: tutorId,
    assigned_date: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('lesson_assignments')
    .upsert(rows, { onConflict: 'point_id,student_id', ignoreDuplicates: true });

  if (error) {
    console.error("Supabase Assign Error:", error);
    throw new Error("Failed to assign lesson to students");
  }
};

export const unassignLesson = async (pointId: string, studentId: string): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase
    .from('lesson_assignments')
    .delete()
    .eq('point_id', pointId)
    .eq('student_id', studentId);

  if (error) {
    console.error("Supabase Unassign Error:", error);
    throw new Error("Failed to unassign lesson");
  }
};

export const getAssignmentsForStudent = async (studentId: string): Promise<AssignedLesson[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('lesson_assignments')
      .select('*, lesson_templates(*)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return [];
    }

    return data.map((row: any) => {
      const t = row.lesson_templates;
      const pages = t ? parsePages(t) : [];
      return {
        id: row.id,
        pointId: row.point_id,
        studentName: row.student_name,
        studentId: row.student_id,
        stageTitle: t?.stage_title || '',
        topicTitle: t?.topic_title || '',
        pointDescription: t?.point_description || '',
        pages,
        material: pages.join('\n---\n'),
        originalMaterial: t?.original_material,
        exercises: t?.exercises || [],
        originalExercises: t?.original_exercises,
        assignedDate: row.assigned_date || row.created_at,
        completed: row.completed || false,
        score: row.score,
        userAnswers: row.user_answers,
        exerciseScores: row.exercise_scores,
        exerciseFeedback: row.exercise_feedback,
        tutorAdjustedScores: row.tutor_adjusted_scores,
        tutorComments: row.tutor_comments,
        tutorOverallComment: row.tutor_overall_comment,
      } as AssignedLesson;
    });
  } catch (e) {
    console.error("Failed to fetch assignments for student", e);
    return [];
  }
};

export const getAssignmentsByPointId = async (
  pointId: string
): Promise<{ studentId: string; studentName: string }[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('lesson_assignments')
      .select('student_id, student_name')
      .eq('point_id', pointId);

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return [];
    }

    return data.map((row: any) => ({
      studentId: row.student_id,
      studentName: row.student_name,
    }));
  } catch (e) {
    console.error("Failed to fetch assignments by point", e);
    return [];
  }
};

export const updateAssignment = async (
  assignmentId: string,
  updates: {
    completed?: boolean;
    score?: number;
    userAnswers?: string[];
    exerciseScores?: number[];
    exerciseFeedback?: string[];
    tutorAdjustedScores?: number[];
    tutorComments?: string[];
    tutorOverallComment?: string;
  }
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const row: Record<string, any> = {};
  if (updates.completed !== undefined) row.completed = updates.completed;
  if (updates.score !== undefined) row.score = updates.score;
  if (updates.userAnswers !== undefined) row.user_answers = updates.userAnswers;
  if (updates.exerciseScores !== undefined) row.exercise_scores = updates.exerciseScores;
  if (updates.exerciseFeedback !== undefined) row.exercise_feedback = updates.exerciseFeedback;
  if (updates.tutorAdjustedScores !== undefined) row.tutor_adjusted_scores = updates.tutorAdjustedScores;
  if (updates.tutorComments !== undefined) row.tutor_comments = updates.tutorComments;
  if (updates.tutorOverallComment !== undefined) row.tutor_overall_comment = updates.tutorOverallComment;

  const { error } = await supabase
    .from('lesson_assignments')
    .update(row)
    .eq('id', assignmentId);

  if (error) {
    console.error("Supabase Update Error:", error);
    throw new Error("Failed to update assignment");
  }
};

export const getAllAssignments = async (): Promise<AssignedLesson[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('lesson_assignments')
      .select('*, lesson_templates(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return [];
    }

    return data.map((row: any) => {
      const t = row.lesson_templates;
      const pages = t ? parsePages(t) : [];
      return {
        id: row.id,
        pointId: row.point_id,
        studentName: row.student_name,
        studentId: row.student_id,
        stageTitle: t?.stage_title || '',
        topicTitle: t?.topic_title || '',
        pointDescription: t?.point_description || '',
        pages,
        material: pages.join('\n---\n'),
        originalMaterial: t?.original_material,
        exercises: t?.exercises || [],
        originalExercises: t?.original_exercises,
        assignedDate: row.assigned_date || row.created_at,
        completed: row.completed || false,
        score: row.score,
        userAnswers: row.user_answers,
        exerciseScores: row.exercise_scores,
        exerciseFeedback: row.exercise_feedback,
        tutorAdjustedScores: row.tutor_adjusted_scores,
        tutorComments: row.tutor_comments,
        tutorOverallComment: row.tutor_overall_comment,
      } as AssignedLesson;
    });
  } catch (e) {
    console.error("Failed to fetch all assignments", e);
    return [];
  }
};

// =============================================================
// VOCABULARY PROGRESS
// =============================================================
export const getVocabProgress = async (studentId?: string): Promise<VocabProgress[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('vocab_progress')
      .select('data');

    if (error) {
       console.error("Supabase Fetch Error:", error);
       return [];
    }

    const allProgress = data.map((row: any) => row.data as VocabProgress);
    
    if (studentId) {
      return allProgress.filter(p => p.studentId === studentId);
    }
    return allProgress;
    
  } catch (e) {
    console.error("Cloud fetch for vocab failed", e);
    return [];
  }
};

export const saveVocabProgress = async (progress: VocabProgress): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  try {
    // Check if exists
    const { data, error: selectError } = await supabase.from('vocab_progress').select('id').eq('id', progress.id).single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.warn("Supabase select error:", selectError);
    }
    
    if (data) {
      const { error: updateError } = await supabase.from('vocab_progress').update({
        student_name: progress.studentName,
        data: progress,
        updated_at: new Date()
      }).eq('id', progress.id);
      
      if (updateError) throw updateError;
    } else {
      const tutorId = await getTutorId();
      if (!tutorId) throw new Error("Not logged in as tutor");

      const { error: insertError } = await supabase.from('vocab_progress').insert({
        id: progress.id,
        student_name: progress.studentName,
        data: progress,
        tutor_id: tutorId
      });
      
      if (insertError) throw insertError;
    }
  } catch (e) {
    console.error("Cloud save failed:", e);
    throw new Error("Failed to save vocabulary progress");
  }
};

// --- VOCABULARY LISTS ---
export const saveVocabList = async (vocabList: VocabList): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  try {
    const { data, error: selectError } = await supabase.from('vocab_lists').select('id').eq('id', vocabList.id).single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.warn("Supabase select error:", selectError);
    }
    
    if (data) {
      const { error: updateError } = await supabase.from('vocab_lists').update({
        category: vocabList.category,
        data: vocabList,
        updated_at: new Date()
      }).eq('id', vocabList.id);
      
      if (updateError) throw updateError;
    } else {
      const tutorId = await getTutorId();
      if (!tutorId) throw new Error("Not logged in as tutor");

      const { error: insertError } = await supabase.from('vocab_lists').insert({
        id: vocabList.id,
        category: vocabList.category,
        data: vocabList,
        tutor_id: tutorId
      });
      
      if (insertError) throw insertError;
    }
  } catch (e) {
    console.error("Cloud save failed:", e);
    throw new Error("Failed to save vocabulary list");
  }
};

export const getVocabLists = async (): Promise<VocabList[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('vocab_lists')
      .select('data')
      .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Cloud fetch for vocab lists failed", error);
        return [];
    }
    return data.map((row: any) => row.data as VocabList);
  } catch (e) {
    console.error("Cloud fetch for vocab lists failed", e);
    return [];
  }
};

export const getVocabListByCategory = async (category: string): Promise<VocabList | null> => {
  const allLists = await getVocabLists();
  return allLists.find(list => list.category === category) || null;
};

export const deleteVocabList = async (id: string): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase.from('vocab_lists').delete().eq('id', id);
  if (error) {
      console.error("Failed to delete from cloud", error);
      throw new Error("Failed to delete vocabulary list");
  }
};

// --- STUDENTS ---
export const getStudents = async (): Promise<Student[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error("Supabase students fetch error:", error);
      return [];
    }
    return data as Student[];
  } catch (e) {
    console.error("Failed to fetch students", e);
    return [];
  }
};

export const createStudent = async (name: string): Promise<Student | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const tutorId = await getTutorId();
    if (!tutorId) return null;

    const { data, error } = await supabase
      .from('students')
      .insert([{ name, tutor_id: tutorId }])
      .select()
      .single();

    if (error) {
      console.error("Supabase student create error:", error);
      return null;
    }
    return data as Student;
  } catch (e) {
    console.error("Failed to create student", e);
    return null;
  }
};

export const findStudentByName = async (name: string): Promise<Student | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .ilike('name', name)
      .single();

    if (error || !data) {
      return null;
    }
    return data as Student;
  } catch (e) {
    console.error("Failed to find student", e);
    return null;
  }
};

