export type UserRole = 'admin' | 'employee';

export type EmployeeType =
  | 'Developer'
  | 'Graphic Designer'
  | 'Digital Marketer'
  | 'Video Editor'
  | 'Content Writer'
  | 'SEO Executive'
  | 'Sales'
  | 'Other';

export type TaskStatus = 'Not Started' | 'In Progress' | 'Finished';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  employeeType: EmployeeType;
  isActive: boolean;
}

export interface TimeSession {
  start: number;
  end: number | null;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  date: string;
  status: TaskStatus;
  timeSessions: TimeSession[];
  createdAt: number;
}

export const EMPLOYEE_TYPES: EmployeeType[] = [
  'Developer',
  'Graphic Designer',
  'Digital Marketer',
  'Video Editor',
  'Content Writer',
  'SEO Executive',
  'Sales',
  'Other',
];

export const TASK_CATEGORIES = [
  'Development',
  'Design',
  'Marketing',
  'Content',
  'SEO',
  'Sales',
  'Meeting',
  'Other',
];
