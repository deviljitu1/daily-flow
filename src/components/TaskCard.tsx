import { useState, useEffect } from 'react';
import { TaskStatus, TaskWithSessions } from '@/types';
import { useData } from '@/contexts/DataContext';
import { formatTimer, formatDuration, getElapsedMs, cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, CheckCircle, Clock } from 'lucide-react';

const statusConfig: Record<TaskStatus, { className: string; label: string }> = {
  'Not Started': { className: 'bg-status-idle/15 text-status-idle border-status-idle/30', label: 'Not Started' },
  'In Progress': { className: 'bg-status-active/15 text-status-active border-status-active/30', label: 'In Progress' },
  Finished: { className: 'bg-status-done/15 text-status-done border-status-done/30', label: 'Finished' },
};

interface TaskCardProps {
  task: TaskWithSessions;
  showUser?: string;
  readOnly?: boolean;
}

const TaskCard = ({ task, showUser, readOnly }: TaskCardProps) => {
  const { startTimer, pauseTimer, finishTask } = useData();
  const isRunning = task.time_sessions.some(s => s.end_time === null);
  const isFinished = task.status === 'Finished';
  const [elapsed, setElapsed] = useState(() => getElapsedMs(task.time_sessions));
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setElapsed(getElapsedMs(task.time_sessions));
    if (isRunning) {
      const iv = setInterval(() => setElapsed(getElapsedMs(task.time_sessions)), 1000);
      return () => clearInterval(iv);
    }
  }, [task.time_sessions, isRunning]);

  const config = statusConfig[task.status];

  const handleAction = async (fn: (id: string) => Promise<void>) => {
    setActionLoading(true);
    try {
      await fn(task.id);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-card-foreground">{task.title}</h3>
            <Badge variant="outline" className={cn('text-xs border', config.className)}>
              {config.label}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {task.category}
            </Badge>
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
          )}
          {showUser && <p className="text-xs text-muted-foreground">{showUser}</p>}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 font-mono text-sm min-w-[80px]">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {isRunning ? (
              <span className="text-status-active font-semibold">{formatTimer(elapsed)}</span>
            ) : (
              <span className="text-muted-foreground">
                {elapsed > 0 ? (isFinished ? formatDuration(elapsed) : formatTimer(elapsed)) : '00:00:00'}
              </span>
            )}
          </div>

          {!isFinished && !readOnly && (
            <div className="flex items-center gap-1">
              {isRunning ? (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleAction(pauseTimer)}
                  disabled={actionLoading}
                  className="h-8 w-8"
                >
                  <Pause className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleAction(startTimer)}
                  disabled={actionLoading}
                  className="h-8 w-8"
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleAction(finishTask)}
                disabled={actionLoading}
                className="h-8 w-8 text-status-done hover:bg-status-done/10"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TaskCard;
