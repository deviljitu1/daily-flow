import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { todayStr, getElapsedMs, formatDuration } from '@/lib/utils';
import { EMPLOYEE_TYPES, TaskStatus } from '@/types';
import TaskCard from '@/components/TaskCard';
import StatCard from '@/components/StatCard';
import { Users, ClipboardList, CheckCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const AdminDashboard = () => {
  const { employees, tasks, loading } = useData();
  const today = todayStr();
  const [dateFilter, setDateFilter] = useState(today);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const activeEmployees = employees.filter(e => e.is_active && e.role === 'employee');
  const todayTasks = tasks.filter(t => t.date === today);
  const completedToday = todayTasks.filter(t => t.status === 'Finished').length;
  const totalTimeToday = todayTasks.reduce((sum, t) => sum + getElapsedMs(t.time_sessions), 0);

  let filteredTasks = [...tasks];
  if (dateFilter) filteredTasks = filteredTasks.filter(t => t.date === dateFilter);
  if (employeeFilter !== 'all') filteredTasks = filteredTasks.filter(t => t.user_id === employeeFilter);
  if (typeFilter !== 'all') {
    const empIds = employees.filter(e => e.employee_type === typeFilter).map(e => e.user_id);
    filteredTasks = filteredTasks.filter(t => empIds.includes(t.user_id));
  }
  if (statusFilter !== 'all') filteredTasks = filteredTasks.filter(t => t.status === (statusFilter as TaskStatus));

  const getEmployeeName = (userId: string) => {
    const emp = employees.find(e => e.user_id === userId);
    return emp ? `${emp.name} (${emp.employee_type})` : 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Active Employees" value={activeEmployees.length} />
        <StatCard icon={ClipboardList} label="Tasks Today" value={todayTasks.length} />
        <StatCard icon={CheckCircle} label="Completed Today" value={completedToday} />
        <StatCard icon={Clock} label="Total Hours Today" value={formatDuration(totalTimeToday)} />
      </div>

      <div className="glass-card rounded-xl p-6 border-none space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Filters</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</Label>
            <Input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-background/50 border-input/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</Label>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="bg-background/50 border-input/50">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees
                  .filter(e => e.role === 'employee')
                  .map(e => (
                    <SelectItem key={e.user_id} value={e.user_id}>
                      {e.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-background/50 border-input/50">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {EMPLOYEE_TYPES.map(t => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-background/50 border-input/50">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Not Started">Not Started</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Finished">Finished</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Tasks <span className="text-muted-foreground text-base font-normal ml-2">({filteredTasks.length})</span></h2>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-3 border-dashed border-2">
            <div className="p-4 bg-muted/50 rounded-full">
              <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">No tasks found</p>
            <p className="text-sm text-muted-foreground/60 w-full max-w-xs">
              Try adjusting your filters to see more results.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} showUser={getEmployeeName(task.user_id)} readOnly />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
