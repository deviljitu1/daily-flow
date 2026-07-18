import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaskWithSessions, ProfileWithRole, AppRole, Client, Project, TaskPriority, ApprovalStatus } from '@/types';
import { toast } from '@/hooks/use-toast';
import { getElapsedMs } from '@/lib/utils';
import { getNotificationPrefs, playNotificationSound } from '@/lib/notifications';

export interface NewTaskInput {
  title: string;
  description: string;
  category: string;
  date: string;
  target_minutes?: number;
  user_id?: string;
  client_id?: string | null;
  project_id?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  is_billable?: boolean;
  hourly_rate_override?: number | null;
}

export type TaskUpdateInput = Partial<NewTaskInput> & {
  status?: string;
  approval_status?: ApprovalStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
};

interface DataContextType {
  members: ProfileWithRole[];
  tasks: TaskWithSessions[];
  clients: Client[];
  projects: Project[];
  loading: boolean;
  addTask: (task: NewTaskInput) => Promise<void>;
  updateTask: (id: string, updates: TaskUpdateInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  startTimer: (taskId: string) => Promise<void>;
  pauseTimer: (taskId: string) => Promise<void>;
  finishTask: (taskId: string, details?: { completion_notes?: string; project_link?: string }) => Promise<void>;
  approveTask: (taskId: string) => Promise<void>;
  rejectTask: (taskId: string, reason: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  refreshClients: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  addClient: (input: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addProject: (input: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  toggleMemberActive: (profileId: string, isActive: boolean) => Promise<void>;
  updateMember: (id: string, updates: { name?: string; employee_type?: string; created_at?: string }) => Promise<void>;
  updateMemberPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteMember: (id: string) => Promise<void>;
}


const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProfileWithRole[]>([]);
  const [tasks, setTasks] = useState<TaskWithSessions[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshClients = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('clients').select('*').order('name');
    setClients((data as Client[]) || []);
  }, [user]);

  const refreshProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setProjects((data as Project[]) || []);
  }, [user]);

  const addClient = useCallback(async (input: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!user) return;
    const { error } = await supabase.from('clients').insert({ ...input, created_by: user.userId });
    if (error) throw error;
    await refreshClients();
  }, [user, refreshClients]);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    const { error } = await supabase.from('clients').update(updates as never).eq('id', id);
    if (error) throw error;
    await refreshClients();
  }, [refreshClients]);

  const deleteClient = useCallback(async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    await Promise.all([refreshClients(), refreshProjects(), refreshTasksRef.current?.()]);
  }, []);

  const addProject = useCallback(async (input: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!user) return;
    const { error } = await supabase.from('projects').insert({ ...input, created_by: user.userId });
    if (error) throw error;
    await refreshProjects();
  }, [user, refreshProjects]);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const { error } = await supabase.from('projects').update(updates as never).eq('id', id);
    if (error) throw error;
    await refreshProjects();
  }, [refreshProjects]);

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    await refreshProjects();
  }, [refreshProjects]);

  const refreshTasksRef = useRef<(() => Promise<void>) | null>(null);


  const refreshTasks = useCallback(async () => {
    if (!user) return;

    let query = supabase
      .from('tasks')
      .select('*, time_sessions(*)')
      .order('created_at', { ascending: false });

    // Assuming RLS handles "Admins view all" and "Employees view own".
    // However, the previous logic explicitly filtered by user.userId if not admin.
    // If we want Admins to see ALL tasks, we should NOT filter by user.userId for admins.

    if (user.role !== 'admin') {
      query = query.eq('user_id', user.userId);
    }

    // For admins, we fetch everything. The RLS policy "Admins can view all tasks" allows this.

    const { data } = await query;
    setTasks((data as unknown as TaskWithSessions[]) || []);
  }, [user]);

  const refreshMembers = useCallback(async () => {
    if (!user) return;

    const { data: profiles } = await supabase.from('profiles').select('*');

    let roles: { user_id: string; role: AppRole }[] = [];
    if (user.role === 'admin') {
      const { data } = await supabase.from('user_roles').select('*');
      if (data) roles = data as { user_id: string; role: AppRole }[];
    } else {
      // For non-admin, we can try to fetch roles, but if RLS prevents it, we just proceed.
      // However, to keep it simple and safe:
      // The user will see everyone as 'employee' unless we fetch roles differently.
      // For Chat purposes, 'role' isn't critical.
    }

    const withRoles: ProfileWithRole[] = (profiles || []).map(p => ({
      ...p,
      role: (roles.find(r => r.user_id === p.user_id)?.role as AppRole) || 'employee',
    }));

    setMembers(withRoles);
  }, [user]);

  useEffect(() => {
    refreshTasksRef.current = refreshTasks;
  }, [refreshTasks]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([refreshTasks(), refreshMembers(), refreshClients(), refreshProjects()]).finally(() => setLoading(false));
    } else {
      setTasks([]);
      setMembers([]);
      setClients([]);
      setProjects([]);
      setLoading(false);
    }
  }, [user, refreshTasks, refreshMembers, refreshClients, refreshProjects]);


  // Ref to track notified tasks to avoid spam
  const notifiedTasks = useRef<Record<string, Set<number>>>({});

  // Reminder Logic
  useEffect(() => {
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return;

    const interval = setInterval(() => {
      const prefs = getNotificationPrefs();
      if (!prefs.remindersEnabled) return;

      tasks.forEach(task => {
        if (task && task.status === 'In Progress' && task.target_minutes && task.time_sessions) {
          const sessions = task.time_sessions || [];
          const elapsedMs = getElapsedMs(sessions);
          const elapsedMinutes = elapsedMs / (1000 * 60);
          const remaining = task.target_minutes - elapsedMinutes;

          if (!notifiedTasks.current[task.id]) {
            notifiedTasks.current[task.id] = new Set();
          }
          const notifiedSet = notifiedTasks.current[task.id];

          if (remaining <= 10 && remaining > 5 && !notifiedSet.has(10)) {
            playNotificationSound();
            toast({
              title: 'Reminder: 10 minutes remaining',
              description: `Task "${task.title}" is due in 10 minutes.`,
              duration: 6000,
            });
            notifiedSet.add(10);
          }

          if (remaining <= 5 && remaining > 0 && !notifiedSet.has(5)) {
            playNotificationSound();
            toast({
              title: 'Critical: 5 minutes remaining',
              description: `Task "${task.title}" is due in 5 minutes.`,
              variant: 'destructive',
              duration: 6000,
            });
            notifiedSet.add(5);
          }

          if (remaining <= 0 && !notifiedSet.has(0)) {
            playNotificationSound();
            toast({
              title: "Time's up",
              description: `Time limit for task "${task.title}" has been reached.`,
              variant: 'destructive',
              duration: 6000,
            });
            notifiedSet.add(0);
          }
        }
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [tasks]);

  const addTask = useCallback(async (task: { title: string; description: string; category: string; date: string; target_minutes?: number; user_id?: string }) => {
    if (!user) return;

    // Check if task duration is set.
    const targetUserId = task.user_id || user.userId;

    const { error } = await supabase.from('tasks').insert({
      user_id: targetUserId,
      title: task.title,
      description: task.description || '',
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
    await supabase.from('tasks').update(updates as never).eq('id', id);
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

  const finishTask = useCallback(async (taskId: string, details?: { completion_notes?: string; project_link?: string }) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Close open sessions
    const openSessions = task.time_sessions.filter(s => s.end_time === null);
    for (const session of openSessions) {
      await supabase.from('time_sessions').update({ end_time: Date.now() }).eq('id', session.id);
    }

    const updates: Record<string, unknown> = { status: 'Finished' };
    if (details?.completion_notes) updates.completion_notes = details.completion_notes;
    if (details?.project_link) updates.project_link = details.project_link;

    await supabase.from('tasks').update(updates as never).eq('id', taskId);
    await refreshTasks();
  }, [tasks, refreshTasks]);

  const toggleMemberActive = async (profileId: string, isActive: boolean) => {
    if (!user || user.role !== 'admin') return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', profileId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update member status.",
        variant: "destructive"
      });
      return;
    }
    await refreshMembers();
  };

  /* New updateMember function */
  const updateMember = async (id: string, updates: { name?: string; employee_type?: string; created_at?: string }) => {
    if (!user || user.role !== 'admin') return;
    const { error } = await supabase
      .from('profiles')
      .update(updates as never)
      .eq('id', id);

    if (error) {
      console.error('Error updating member:', error);
      toast({ title: "Error", description: "Failed to update member.", variant: "destructive" });
    }
    await refreshMembers();
  };

  const updateMemberPassword = async (userId: string, newPassword: string) => {
    if (!user || user.role !== 'admin') return { success: false, error: 'Unauthorized' };
    try {
      const { data, error } = await supabase.functions.invoke('update-member-password', {
        body: { target_user_id: userId, new_password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { success: true };
    } catch (error: any) {
      console.error('Error updating password:', error);
      return { success: false, error: error.message || 'Failed to update password' };
    }
  };

  const deleteMember = async (id: string) => {
    if (!user || user.role !== 'admin') return;
    const { data, error } = await supabase.functions.invoke('delete-employee', {
      body: { profile_id: id },
    });
    if (error || (data && (data as { error?: string }).error)) {
      const msg = (data as { error?: string } | null)?.error || error?.message || 'Delete failed';
      console.error('Delete failed', msg);
      toast({
        title: 'Cannot Delete Team Member',
        description: msg,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Team member deleted' });
    await Promise.all([refreshMembers(), refreshTasks()]);
  };

  return (
    <DataContext.Provider
      value={{
        members,
        tasks,
        loading,
        addTask,
        updateTask,
        deleteTask,
        startTimer,
        pauseTimer,
        finishTask,
        refreshTasks,
        refreshMembers,
        toggleMemberActive,
        updateMember,
        updateMemberPassword,
        deleteMember,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
