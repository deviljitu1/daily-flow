import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { todayStr, getElapsedMs, formatDuration, getGreeting } from '@/lib/utils';
import TaskCard from '@/components/TaskCard';
import AddTaskDialog from '@/components/AddTaskDialog';
import StatCard from '@/components/StatCard';
import { ClipboardList, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { tasks, loading } = useData();
  const today = todayStr();

  const myTasks = tasks.filter(t => t.user_id === user?.userId);
  const todayTasks = myTasks.filter(t => t.date === today);
  const ongoingTasks = myTasks.filter(t => t.status === 'In Progress');
  const completedToday = todayTasks.filter(t => t.status === 'Finished').length;
  const totalTimeToday = todayTasks.reduce((sum, t) => sum + getElapsedMs(t.time_sessions), 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekTasks = myTasks.filter(t => t.date >= weekStartStr && t.date <= today);
  const weeklyTime = weekTasks.reduce((sum, t) => sum + getElapsedMs(t.time_sessions), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            Good {getGreeting()}, {user?.name.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <AddTaskDialog />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={ClipboardList} label="Tasks Today" value={todayTasks.length} />
        <StatCard icon={CheckCircle} label="Completed" value={completedToday} />
        <StatCard icon={Clock} label="Time Today" value={formatDuration(totalTimeToday)} />
        <StatCard icon={Clock} label="This Week" value={formatDuration(weeklyTime)} />
      </div>

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today ({todayTasks.length})</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing ({ongoingTasks.length})</TabsTrigger>
          <TabsTrigger value="all">All Tasks ({myTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-3">
          {todayTasks.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center">No tasks for today. Click "Add Task" to get started!</p>
          ) : (
            todayTasks.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </TabsContent>

        <TabsContent value="ongoing" className="space-y-3">
          {ongoingTasks.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center">No ongoing tasks.</p>
          ) : (
            ongoingTasks.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {myTasks.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center">No tasks yet.</p>
          ) : (
            myTasks.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDashboard;
