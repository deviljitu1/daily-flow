import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaskWithSessions, ProfileWithRole, AppRole } from '@/types';

interface DataContextType {
  employees: ProfileWithRole[];
  tasks: TaskWithSessions[];
  loading: boolean;
  addTask: (task: { title: string; description: string; category: string; date: string }) => Promise<void>;
  updateTask: (id: string, updates: { title?: string; description?: string; category?: string; status?: string; date?: string }) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  startTimer: (taskId: string) => Promise<void>;
  pauseTimer: (taskId: string) => Promise<void>;
  finishTask: (taskId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshEmployees: () => Promise<void>;
  toggleEmployeeActive: (profileId: string, isActive: boolean) => Promise<void>;
  updateEmployee: (id: string, updates: { name?: string; employee_type?: string }) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<ProfileWithRole[]>([]);
  const [tasks, setTasks] = useState<TaskWithSessions[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTasks = useCallback(async () => {
    if (!user) return;

    let query = supabase
      .from('tasks')
      .select('*, time_sessions(*)')
      .order('created_at', { ascending: false });

    if (user.role !== 'admin') {
      query = query.eq('user_id', user.userId);
    }

    const { data } = await query;
    setTasks((data as unknown as TaskWithSessions[]) || []);
  }, [user]);

  const refreshEmployees = useCallback(async () => {
    if (!user || user.role !== 'admin') return;

    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('*');

    const withRoles: ProfileWithRole[] = (profiles || []).map(p => ({
      ...p,
      role: ((roles || []).find(r => r.user_id === p.user_id)?.role as AppRole) || 'employee',
    }));

    setEmployees(withRoles);
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([refreshTasks(), refreshEmployees()]).finally(() => setLoading(false));
    } else {
      setTasks([]);
      setEmployees([]);
      setLoading(false);
    }
  }, [user, refreshTasks, refreshEmployees]);

  const addTask = useCallback(async (task: { title: string; description: string; category: string; date: string }) => {
    if (!user) return;
    await supabase.from('tasks').insert({
      user_id: user.userId,
      title: task.title,
      description: task.description,
      category: task.category,
      date: task.date,
    });
    await refreshTasks();
  }, [user, refreshTasks]);

  const updateTask = useCallback(async (id: string, updates: Record<string, unknown>) => {
    await supabase.from('tasks').update(updates).eq('id', id);
    await refreshTasks();
  }, [refreshTasks]);

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    await refreshTasks();
  }, [refreshTasks]);

  const startTimer = useCallback(async (taskId: string) => {
    if (!user) return;

    // Close any open sessions for other tasks of this user
    const openSessions = tasks
      .filter(t => t.user_id === user.userId && t.id !== taskId)
      .flatMap(t => t.time_sessions.filter(s => s.end_time === null));

    for (const session of openSessions) {
      await supabase.from('time_sessions').update({ end_time: Date.now() }).eq('id', session.id);
    }

    // Start new session
    await supabase.from('time_sessions').insert({
      task_id: taskId,
      start_time: Date.now(),
    });

    // Update task status
    await supabase.from('tasks').update({ status: 'In Progress' }).eq('id', taskId);
    await refreshTasks();
  }, [user, tasks, refreshTasks]);

  const pauseTimer = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const openSessions = task.time_sessions.filter(s => s.end_time === null);
    for (const session of openSessions) {
      await supabase.from('time_sessions').update({ end_time: Date.now() }).eq('id', session.id);
    }
    await refreshTasks();
  }, [tasks, refreshTasks]);

  const finishTask = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Close open sessions
    const openSessions = task.time_sessions.filter(s => s.end_time === null);
    for (const session of openSessions) {
      await supabase.from('time_sessions').update({ end_time: Date.now() }).eq('id', session.id);
    }

    // Mark finished
    await supabase.from('tasks').update({ status: 'Finished' }).eq('id', taskId);
    await refreshTasks();
  }, [tasks, refreshTasks]);

  /* Existing logic */
  const toggleEmployeeActive = async (profileId: string, isActive: boolean) => {
    if (!user || user.role !== 'admin') return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', profileId);

    if (error) {
      console.error('Error toggling employee active status:', error);
      throw error;
    }
    await refreshEmployees();
  };

  const updateEmployee = async (id: string, updates: { name?: string; employee_type?: string }) => {
    if (!user || user.role !== 'admin') return;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
    await refreshEmployees();
  };

  const deleteEmployee = async (id: string) => {
    if (!user || user.role !== 'admin') return;
    // Note: Due to foreign key constraints, we might want to soft delete usually.
    // But user asked for delete. Let's try hard delete first, but if it fails (due to tasks), we might need to handle it.
    // For now, let's assume we want to delete profile.
    // Ideally we should delete tasks first or cascade.
    // But usually 'profiles' are linked to 'auth.users'.
    // Deleting from 'profiles' might not be enough if we want to delete the user login too.
    // However, for this context, let's stick to profile deletion.

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
    await refreshEmployees();
  };

  return (
    <DataContext.Provider
      value={{
        employees,
        tasks,
        loading,
        addTask,
        updateTask,
        deleteTask,
        startTimer,
        pauseTimer,
        finishTask,
        refreshTasks,
        refreshEmployees,
        toggleEmployeeActive,
        updateEmployee,
        deleteEmployee,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
