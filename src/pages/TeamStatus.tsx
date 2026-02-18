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
    task_status: string | null;
}

const TeamStatus = () => {
    const { user } = useAuth();
    const [teamActivity, setTeamActivity] = useState<TeamMemberActivity[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTeamActivity = async () => {
        try {
            // Use the secure RPC function created in SQL
            const { data, error } = await supabase.rpc('get_team_activity');
            if (error) {
                console.error('Error fetching team activity:', error);
            } else {
                setTeamActivity(data || []);
            }
        } catch (error) {
            console.error('Unexpected error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamActivity();
        // Auto-refresh every 30 seconds to keep status live
        const interval = setInterval(fetchTeamActivity, 30000);
        return () => clearInterval(interval);
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
                                <CardTitle className="text-base font-semibold">{member.name}</CardTitle>
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
                                    <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Working on</p>
                                    <p className="text-sm font-medium text-foreground line-clamp-2" title={member.current_task_title}>
                                        {member.current_task_title}
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-2 p-3 bg-transparent rounded-lg border border-dashed border-muted">
                                    <p className="text-sm text-muted-foreground italic text-center">Not currently working on a task</p>
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
