import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { TASK_CATEGORIES } from '@/types';
import { todayStr } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

const AddTaskDialog = () => {
  const { user } = useAuth();
  const { addTask } = useData();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Development');
  const [date, setDate] = useState(todayStr());
  const [targetMinutes, setTargetMinutes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;
    setSubmitting(true);
    try {
      await addTask({
        title: title.trim(),
        description: description.trim(),
        category,
        date,
        target_minutes: targetMinutes ? parseInt(targetMinutes) : undefined,
      });
      setTitle('');
      setDescription('');
      setCategory('Development');
      setDate(todayStr());
      setTargetMinutes('');
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02]">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Implement user authentication"
              required
              maxLength={200}
              className="bg-muted/30 border-muted-foreground/20 focus:bg-background transition-colors"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add details about what you'll be working on..."
              maxLength={1000}
              rows={3}
              className="bg-muted/30 border-muted-foreground/20 focus:bg-background transition-colors resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-muted/30 border-muted-foreground/20 focus:bg-background transition-colors">
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
              <Label htmlFor="date" className="text-sm font-medium">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-muted/30 border-muted-foreground/20 focus:bg-background transition-colors"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="target-time" className="text-sm font-medium">Target Duration (Minutes)</Label>
              <Input
                id="target-time"
                type="number"
                min="1"
                placeholder="e.g. 30"
                value={targetMinutes}
                onChange={e => setTargetMinutes(e.target.value)}
                className="bg-muted/30 border-muted-foreground/20 focus:bg-background transition-colors"
              />
              <p className="text-xs text-muted-foreground">Optional. You will be reminded when time is almost up.</p>
            </div>
          </div>
          <Button type="submit" className="w-full font-semibold shadow-md" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Task'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
