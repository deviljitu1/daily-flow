import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getGreeting } from '@/lib/utils';
import { Clock, Users, Activity, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface TeamMemberActivity {
    user_id: string;
    name: string;
    role: string;
    is_active: boolean;
    current_task_title: string | null;
    task_description: string | null;
    task_status: string | null;
    todo_tasks: { title: string }[] | null;
    progress_tasks: { title: string }[] | null;
    completed_tasks: { title: string }[] | null;
}

const TeamStatus = () => {
    const { user } = useAuth();
    const [teamActivity, setTeamActivity] = useState<TeamMemberActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTeamActivity = async () => {
        try {
            // Use the secure RPC function created in SQL
            const { data, error: fetchError } = await supabase.rpc('get_team_activity');
            if (fetchError) {
                console.error('Error fetching team activity:', fetchError);
                setError(fetchError.message);
            } else {
                setTeamActivity(data || []);
                setError(null);
            }
        } catch (err: any) {
            console.error('Unexpected error:', err);
            setError(err.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamActivity();

        // Real-time subscription for instant updates
        const channel = supabase
            .channel('team-status-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks' },
                () => fetchTeamActivity()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                () => fetchTeamActivity()
            )
            .subscribe();

        // Auto-refresh fallback (every 10 seconds)
        const interval = setInterval(fetchTeamActivity, 10000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const activeMembers = teamActivity.filter(m => m.current_task_title);
    const idleMembers = teamActivity.filter(m => !m.current_task_title);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Team <span className="text-primary">Status</span>
                    </h1>
                    <p className="text-muted-foreground mt-2 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span>See who is working on what in real-time.</span>
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                    <p className="font-bold">Error loading status:</p>
                    <p className="text-sm font-mono">{error}</p>
                </div>
            )}

            {!loading && teamActivity.length === 0 && !error && (
                <div className="p-8 text-center bg-muted/20 rounded-xl border border-dashed">
                    <Users className="h-10 w-10 mx-auto text-muted-foreground opacity-50 mb-3" />
                    <p className="text-lg font-medium">No team members found</p>
                    <p className="text-sm text-muted-foreground">The team might be empty or permissions are restricted.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamActivity.map((member) => (
                    <Card key={member.user_id} className={`glass-card border-l-4 ${member.current_task_title ? 'border-l-green-500' : 'border-l-muted'} hover:scale-[1.02] transition-transform duration-200`}>
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                    {member.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    {member.name}
                                    {user?.userId === member.user_id && (
                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-primary/20 text-primary bg-primary/5">
                                            You
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription className="text-xs uppercase font-medium text-muted-foreground">
                                    {member.role || 'Employee'}
                                </CardDescription>
                            </div>
                            {member.current_task_title ? (
                                <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                                    Active
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                    Idle
                                </Badge>
                            )}
                        </CardHeader>
                        <CardContent>
                            {member.current_task_title ? (
                                <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-muted/50">
                                    <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Active Work</p>
                                    <p className="text-sm font-medium text-foreground line-clamp-2" title={member.current_task_title || ''}>
                                        {member.current_task_title}
                                    </p>
                                    {member.task_description && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={member.task_description}>
                                            {member.task_description}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-2 p-3 bg-transparent rounded-lg border border-dashed border-muted">
                                    <p className="text-sm text-muted-foreground italic text-center">Not currently working on a task</p>
                                </div>
                            )}

                            {/* Progress Work (Paused) */}
                            {member.progress_tasks && member.progress_tasks.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Progress Work</p>
                                    <ul className="space-y-1">
                                        {member.progress_tasks.map((t, idx) => (
                                            <li key={idx} className="text-sm flex items-start gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                                <span className="opacity-90">{t.title}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Remaining Work (Todo) */}
                            {member.todo_tasks && member.todo_tasks.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Remaining Work</p>
                                    <ul className="space-y-1">
                                        {member.todo_tasks.map((t, idx) => (
                                            <li key={idx} className="text-sm flex items-start gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                                                <span className="opacity-90">{t.title}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Finished Work */}
                            {member.completed_tasks && member.completed_tasks.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Finished Work</p>
                                    <ul className="space-y-1">
                                        {member.completed_tasks.map((t, idx) => (
                                            <li key={idx} className="text-sm flex items-start gap-2 text-muted-foreground">
                                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                                <span className="line-through opacity-70">{t.title}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default TeamStatus;
