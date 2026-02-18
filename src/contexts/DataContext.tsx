import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaskWithSessions, ProfileWithRole, AppRole } from '@/types';
import { toast } from '@/hooks/use-toast';
import { getElapsedMs } from '@/lib/utils';

interface DataContextType {
  employees: ProfileWithRole[];
  tasks: TaskWithSessions[];
  loading: boolean;
  addTask: (task: { title: string; description: string; category: string; date: string; target_minutes?: number; user_id?: string }) => Promise<void>;
  updateTask: (id: string, updates: { title?: string; description?: string; category?: string; status?: string; date?: string; target_minutes?: number }) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  startTimer: (taskId: string) => Promise<void>;
  pauseTimer: (taskId: string) => Promise<void>;
  finishTask: (taskId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshEmployees: () => Promise<void>;
  toggleEmployeeActive: (profileId: string, isActive: boolean) => Promise<void>;
  updateEmployee: (id: string, updates: { name?: string; employee_type?: string; created_at?: string }) => Promise<void>;
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

  // Ref to track notified tasks to avoid spam
  const notifiedTasks = useRef<Record<string, Set<number>>>({});

  // Reminder Logic
  useEffect(() => {
    // Ensure tasks exist and is iterable
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return;

    const interval = setInterval(() => {
      tasks.forEach(task => {
        // Defensive checks: ensure task exists, has status 'In Progress', has target_minutes, and time_sessions
        if (task && task.status === 'In Progress' && task.target_minutes && task.time_sessions) {
          const sessions = task.time_sessions || [];
          const elapsedMs = getElapsedMs(sessions);

          const elapsedMinutes = elapsedMs / (1000 * 60);
          const remaining = task.target_minutes - elapsedMinutes;

          // Initialize set if not exists
          if (!notifiedTasks.current[task.id]) {
            notifiedTasks.current[task.id] = new Set();
          }

          const notifiedSet = notifiedTasks.current[task.id];

          // 10 minutes warning
          if (remaining <= 10 && remaining > 5 && !notifiedSet.has(10)) {
            toast({
              title: "Reminder: 10 Minutes Remaining",
              description: `Task "${task.title}" is due in 10 minutes.`,
            });
            notifiedSet.add(10);
          }

          // 5 minutes warning
          if (remaining <= 5 && remaining > 0 && !notifiedSet.has(5)) {
            toast({
              title: "Critical Reminder: 5 Minutes Remaining",
              description: `Task "${task.title}" is due in 5 minutes!`,
              variant: "destructive",
            });
            notifiedSet.add(5);
          }

          // Time up
          if (remaining <= 0 && !notifiedSet.has(0)) {
            toast({
              title: "Time's Up!",
              description: `Time limit for task "${task.title}" has been reached.`,
              variant: "destructive",
            });
            notifiedSet.add(0);
          }
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [tasks]);

  const addTask = useCallback(async (task: { title: string; description: string; category: string; date: string; target_minutes?: number; user_id?: string }) => {
    if (!user) return;
    const targetUserId = task.user_id || user.userId;
    console.log("Adding task for:", targetUserId, "Current User:", user.userId, "Role:", user.role);

    const { error } = await supabase.from('tasks').insert({
      user_id: targetUserId,
      title: task.title,
      description: task.description,
      category: task.category,
      date: task.date,
      target_minutes: task.target_minutes || null,
    });

    if (error) {
      console.error('Error adding task:', error);
      throw error;
    }

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

    await supabase.from('tasks').update({ status: 'Finished' }).eq('id', taskId);
    await refreshTasks();
  }, [tasks, refreshTasks]);

  const toggleEmployeeActive = async (profileId: string, isActive: boolean) => {
    if (!user || user.role !== 'admin') return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', profileId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update employee status.",
        variant: "destructive"
      });
      return;
    }
    await refreshEmployees();
  };

  /* New updateEmployee function */
  const updateEmployee = async (id: string, updates: { name?: string; employee_type?: string; created_at?: string }) => {
    if (!user || user.role !== 'admin') return;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating employee:', error);
      toast({ title: "Error", description: "Failed to update employee.", variant: "destructive" });
    }
    await refreshEmployees();
  };

  const deleteEmployee = async (id: string) => {
    if (!user || user.role !== 'admin') return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      console.error("Delete failed", error);
      toast({
        title: "Cannot Delete Employee",
        description: "Ensure the employee has no associated tasks or data before deleting.",
        variant: "destructive"
      });
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
