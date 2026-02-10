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
  const { employees, tasks } = useData();
  const today = todayStr();
  const [dateFilter, setDateFilter] = useState(today);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const activeEmployees = employees.filter(e => e.isActive && e.role === 'employee');
  const todayTasks = tasks.filter(t => t.date === today);
  const completedToday = todayTasks.filter(t => t.status === 'Finished').length;
  const totalTimeToday = todayTasks.reduce((sum, t) => sum + getElapsedMs(t.timeSessions), 0);

  // Apply filters
  let filteredTasks = [...tasks];
  if (dateFilter) filteredTasks = filteredTasks.filter(t => t.date === dateFilter);
  if (employeeFilter !== 'all') filteredTasks = filteredTasks.filter(t => t.userId === employeeFilter);
  if (typeFilter !== 'all') {
    const empIds = employees.filter(e => e.employeeType === typeFilter).map(e => e.id);
    filteredTasks = filteredTasks.filter(t => empIds.includes(t.userId));
  }
  if (statusFilter !== 'all') filteredTasks = filteredTasks.filter(t => t.status === (statusFilter as TaskStatus));

  const getEmployeeName = (userId: string) => {
    const emp = employees.find(e => e.id === userId);
    return emp ? `${emp.name} (${emp.employeeType})` : 'Unknown';
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of all employee activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Active Employees" value={activeEmployees.length} />
        <StatCard icon={ClipboardList} label="Tasks Today" value={todayTasks.length} />
        <StatCard icon={CheckCircle} label="Completed Today" value={completedToday} />
        <StatCard icon={Clock} label="Total Hours Today" value={formatDuration(totalTimeToday)} />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Date</Label>
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Employee</Label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees
                .filter(e => e.role === 'employee')
                .map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Employee Type</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {EMPLOYEE_TYPES.map(t => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
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

      {/* Task list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Tasks ({filteredTasks.length})
        </h2>
        {filteredTasks.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">No tasks match the current filters.</p>
        ) : (
          filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} showUser={getEmployeeName(task.userId)} />
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
