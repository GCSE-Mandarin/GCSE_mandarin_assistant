import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AssignedLesson, VocabProgress, VocabList, Student } from '@/types';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Missing Supabase environment variables.");
    return null;
  }

  try {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  } catch (e) {
    console.error("Failed to init Supabase", e);
    return null;
  }
};

// --- SAVE LESSON ---
export const saveLesson = async (lesson: AssignedLesson): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase.from('lessons').insert({
    id: lesson.id,
    student_name: lesson.studentName,
    student_id: lesson.studentId,
    data: lesson
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

// --- VOCABULARY PROGRESS ---
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
      const { error: insertError } = await supabase.from('vocab_progress').insert({
        id: progress.id,
        student_name: progress.studentName,
        data: progress
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
      const { error: insertError } = await supabase.from('vocab_lists').insert({
        id: vocabList.id,
        category: vocabList.category,
        data: vocabList
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
    const { data, error } = await supabase
      .from('students')
      .insert([{ name }])
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

