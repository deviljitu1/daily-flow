import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { TASK_CATEGORIES, TaskWithSessions } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditTaskDialogProps {
    task: TaskWithSessions;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const EditTaskDialog = ({ task, open, onOpenChange }: EditTaskDialogProps) => {
    const { updateTask, members } = useData();
    const { user } = useAuth();
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [category, setCategory] = useState(task.category);
    const [date, setDate] = useState(task.date);
    const [targetMinutes, setTargetMinutes] = useState(task.target_minutes ? String(task.target_minutes) : '');
    const [assignedTo, setAssignedTo] = useState(task.user_id);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setTitle(task.title);
            setDescription(task.description || '');
            setCategory(task.category);
            setDate(task.date);
            setTargetMinutes(task.target_minutes ? String(task.target_minutes) : '');
            setAssignedTo(task.user_id);
        }
    }, [open, task]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            const updates: Record<string, unknown> = {
                title: title.trim(),
                description: description.trim(),
                category,
                date,
                target_minutes: targetMinutes ? parseInt(targetMinutes) : undefined,
            };
            if (user?.role === 'admin' && assignedTo !== task.user_id) {
                updates.user_id = assignedTo;
            }
            await updateTask(task.id, updates);
            onOpenChange(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-title">Task Title</Label>
                        <Input
                            id="edit-title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Task title"
                            required
                            maxLength={200}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-desc">Description</Label>
                        <Textarea
                            id="edit-desc"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Task description"
                            maxLength={1000}
                            rows={3}
                            className="resize-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TASK_CATEGORIES.map(c => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-date">Date</Label>
                            <Input id="edit-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-target-time">Target Duration (Minutes)</Label>
                        <Input
                            id="edit-target-time"
                            type="number"
                            min="1"
                            placeholder="e.g. 30"
                            value={targetMinutes}
                            onChange={e => setTargetMinutes(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Optional. Set reminders for task completion.</p>
                    </div>

                    {user?.role === 'admin' && (
                        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                            <Label className="text-sm font-semibold">👥 Reassign To</Label>
                            <Select value={assignedTo} onValueChange={setAssignedTo}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {members
                                        .filter(emp => emp.is_active)
                                        .map(emp => (
                                            <SelectItem key={emp.id} value={emp.user_id}>
                                                {emp.name} — {emp.employee_type}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Change the team member responsible for this task.
                            </p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditTaskDialog;
