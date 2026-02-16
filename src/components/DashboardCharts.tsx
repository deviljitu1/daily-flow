import { useMemo } from 'react';
import { TaskWithSessions } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getElapsedMs, formatDuration } from '@/lib/utils';

interface DashboardChartsProps {
    tasks: TaskWithSessions[];
}

const COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff'];
const STATUS_COLORS = {
    'Not Started': '#94a3b8',
    'In Progress': '#8b5cf6',
    'Finished': '#10b981',
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background/95 backdrop-blur-sm border border-border p-2 rounded shadow-md text-sm">
                <p className="font-medium">{label}</p>
                <p className="text-muted-foreground">
                    {payload[0].name}: <span className="font-bold text-foreground">{payload[0].value}</span>
                </p>
            </div>
        );
    }
    return null;
};

const DashboardCharts = ({ tasks }: DashboardChartsProps) => {
    const categoryData = useMemo(() => {
        const counts: Record<string, number> = {};
        tasks.forEach(t => {
            counts[t.category] = (counts[t.category] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [tasks]);

    const statusData = useMemo(() => {
        const counts: Record<string, number> = {
            'Not Started': 0,
            'In Progress': 0,
            'Finished': 0,
        };
        tasks.forEach(t => {
            if (counts[t.status] !== undefined) {
                counts[t.status]++;
            }
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [tasks]);

    const timeData = useMemo(() => {
        const counts: Record<string, number> = {};
        tasks.forEach(t => {
            const ms = getElapsedMs(t.time_sessions);
            if (ms > 0) {
                // Convert to hours for better visualization, or minutes
                const minutes = Math.round(ms / 60000);
                counts[t.category] = (counts[t.category] || 0) + minutes;
            }
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value })) // value in minutes
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 categories by time
    }, [tasks]);

    // Custom tooltip for time chart to show formatted time
    const TimeTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background/95 backdrop-blur-sm border border-border p-2 rounded shadow-md text-sm">
                    <p className="font-medium">{label}</p>
                    <p className="text-muted-foreground">
                        Time: <span className="font-bold text-foreground">{formatDuration(payload[0].value * 60000)}</span>
                    </p>
                </div>
            );
        }
        return null;
    };


    if (tasks.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Category Distribution */}
            <Card className="glass-card border-none">
                <CardHeader>
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Tasks by Category</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} cursor={false} />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="glass-card border-none">
                <CardHeader>
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Tasks by Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData} layout="vertical" margin={{ left: 0, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#cbd5e1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Time per Category */}
            <Card className="glass-card border-none md:col-span-2 lg:col-span-1">
                <CardHeader>
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Time Spent (Minutes)</CardTitle>
                </CardHeader>
                <CardContent>
                    {timeData.length > 0 ? (
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={timeData} margin={{ bottom: 20 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={60} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} content={<TimeTooltip />} />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[250px] w-full flex items-center justify-center text-muted-foreground text-sm">
                            No time stats available yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardCharts;
