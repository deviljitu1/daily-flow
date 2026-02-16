import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
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
    const { updateTask } = useData();
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [category, setCategory] = useState(task.category);
    const [date, setDate] = useState(task.date);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setTitle(task.title);
            setDescription(task.description || '');
            setCategory(task.category);
            setDate(task.date);
        }
    }, [open, task]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            await updateTask(task.id, {
                title: title.trim(),
                description: description.trim(),
                category,
                date,
            });
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
