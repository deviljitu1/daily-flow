import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { todayStr, getElapsedMs, formatDuration, getGreeting } from '@/lib/utils';
import TaskCard from '@/components/TaskCard';
import AddTaskDialog from '@/components/AddTaskDialog';
import StatCard from '@/components/StatCard';
import { ClipboardList, CheckCircle2, Clock, CalendarRange } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardCharts from '@/components/DashboardCharts';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { tasks, loading } = useData();
  const today = todayStr();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Actually context already filters by user_id for employees, so `tasks` should be correct if backend logic holds.
  const employeeTasks = tasks;

  const todayTasks = employeeTasks.filter(t => t.date === today);
  const ongoingTasks = employeeTasks.filter(t => t.status === 'In Progress');
  const completedTasks = employeeTasks.filter(t => t.status === 'Finished');
  const completedToday = todayTasks.filter(t => t.status === 'Finished').length;
  const totalTimeToday = todayTasks.reduce((sum, t) => sum + getElapsedMs(t.time_sessions), 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekTasks = employeeTasks.filter(t => t.date >= weekStartStr && t.date <= today);
  const weeklyTime = weekTasks.reduce((sum, t) => sum + getElapsedMs(t.time_sessions), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting()}, <span className="text-primary">{user?.name.split(' ')[0]}</span>
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            <span>
              {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              <span className="mx-2">|</span>
              {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </p>
        </div>
        <AddTaskDialog />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={ClipboardList} label="Tasks Today" value={todayTasks.length} />
        <StatCard icon={CheckCircle2} label="Completed" value={completedToday} />
        <StatCard icon={Clock} label="Time Today" value={formatDuration(totalTimeToday)} />
        <StatCard icon={Clock} label="This Week" value={formatDuration(weeklyTime)} />
      </div>

      <div className="mb-8">
        <DashboardCharts tasks={employeeTasks} />
      </div>

      <div className="glass-card rounded-xl p-6 border-none">
        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="today" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Today ({todayTasks.length})</TabsTrigger>
            <TabsTrigger value="ongoing" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Ongoing ({ongoingTasks.length})</TabsTrigger>
            <TabsTrigger value="completed" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Completed ({completedTasks.length})</TabsTrigger>
            <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">All Tasks ({employeeTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {hasTasks(todayTasks) ? (
              <div className="grid gap-4">
                {todayTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            ) : (
              <EmptyState message="No tasks for today. Click 'New Task' to calculate your productivity!" />
            )}
          </TabsContent>

          <TabsContent value="ongoing" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {hasTasks(ongoingTasks) ? (
              <div className="grid gap-4">
                {ongoingTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            ) : (
              <EmptyState message="No ongoing tasks right now." />
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {hasTasks(completedTasks) ? (
              <div className="grid gap-4">
                {completedTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            ) : (
              <EmptyState message="No completed tasks yet. Keep going!" />
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {hasTasks(employeeTasks) ? (
              <div className="grid gap-4">
                {employeeTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            ) : (
              <EmptyState message="You haven't created any tasks yet." />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Helper for empty state to reduce duplication
const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-muted rounded-xl bg-muted/20">
    <div className="p-4 bg-muted/50 rounded-full mb-3">
      <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
    </div>
    <p className="text-muted-foreground max-w-sm">{message}</p>
  </div>
);

const hasTasks = (tasks: any[]) => tasks && tasks.length > 0;

export default EmployeeDashboard;
