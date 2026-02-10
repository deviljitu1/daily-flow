import { Tables, Enums } from '@/integrations/supabase/types';

export type EmployeeType = Enums<'employee_type'>;
export type TaskStatus = Enums<'task_status'>;
export type AppRole = Enums<'app_role'>;

export type Profile = Tables<'profiles'>;
export type TimeSession = Tables<'time_sessions'>;
export type UserRoleRow = Tables<'user_roles'>;

export interface TaskWithSessions extends Tables<'tasks'> {
  time_sessions: TimeSession[];
}

export interface ProfileWithRole extends Profile {
  role: AppRole;
}

export interface AuthUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  employeeType: EmployeeType;
  isActive: boolean;
  role: AppRole;
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
