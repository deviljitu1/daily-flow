import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Task, User } from '@/types';
import { seedEmployees, seedTasks } from '@/data/seed';

interface DataContextType {
  employees: User[];
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'timeSessions' | 'status'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  startTimer: (taskId: string) => void;
  pauseTimer: (taskId: string) => void;
  finishTask: (taskId: string) => void;
  addEmployee: (emp: Omit<User, 'id'>) => void;
  updateEmployee: (id: string, updates: Partial<User>) => void;
  toggleEmployeeActive: (id: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<User[]>(() => {
    const saved = localStorage.getItem('wt_employees');
    return saved ? JSON.parse(saved) : seedEmployees;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('wt_tasks');
    return saved ? JSON.parse(saved) : seedTasks;
  });

  useEffect(() => {
    localStorage.setItem('wt_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('wt_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'timeSessions' | 'status'>) => {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      status: 'Not Started',
      timeSessions: [],
      createdAt: Date.now(),
    };
    setTasks(prev => [newTask, ...prev]);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const startTimer = useCallback((taskId: string) => {
    setTasks(prev => {
      const target = prev.find(t => t.id === taskId);
      if (!target) return prev;

      return prev.map(t => {
        // Pause any other running timer for this user
        if (t.userId === target.userId && t.id !== taskId && t.timeSessions.some(s => s.end === null)) {
          return {
            ...t,
            timeSessions: t.timeSessions.map(s => (s.end === null ? { ...s, end: Date.now() } : s)),
          };
        }
        // Start timer on target
        if (t.id === taskId) {
          return {
            ...t,
            status: 'In Progress' as const,
            timeSessions: [...t.timeSessions, { start: Date.now(), end: null }],
          };
        }
        return t;
      });
    });
  }, []);

  const pauseTimer = useCallback((taskId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          timeSessions: t.timeSessions.map(s => (s.end === null ? { ...s, end: Date.now() } : s)),
        };
      })
    );
  }, []);

  const finishTask = useCallback((taskId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: 'Finished' as const,
          timeSessions: t.timeSessions.map(s => (s.end === null ? { ...s, end: Date.now() } : s)),
        };
      })
    );
  }, []);

  const addEmployee = useCallback((emp: Omit<User, 'id'>) => {
    setEmployees(prev => [...prev, { ...emp, id: crypto.randomUUID() }]);
  }, []);

  const updateEmployee = useCallback((id: string, updates: Partial<User>) => {
    setEmployees(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)));
  }, []);

  const toggleEmployeeActive = useCallback((id: string) => {
    setEmployees(prev => prev.map(e => (e.id === id ? { ...e, isActive: !e.isActive } : e)));
  }, []);

  return (
    <DataContext.Provider
      value={{
        employees,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        startTimer,
        pauseTimer,
        finishTask,
        addEmployee,
        updateEmployee,
        toggleEmployeeActive,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
