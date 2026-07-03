import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FinishTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  onConfirm: (details: { completion_notes?: string; project_link?: string }) => Promise<void>;
}

const FinishTaskDialog = ({ open, onOpenChange, taskTitle, onConfirm }: FinishTaskDialogProps) => {
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (skip = false) => {
    setLoading(true);
    try {
      await onConfirm(
        skip
          ? {}
          : {
              completion_notes: notes.trim() || undefined,
              project_link: link.trim() || undefined,
            }
      );
      setNotes('');
      setLink('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Task</DialogTitle>
          <DialogDescription>
            Add optional details for "{taskTitle}". You can skip these if not needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="completion-notes">
              Completion Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="completion-notes"
              placeholder="What did you deliver? Any notes about the work..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-link">
              Project / File Link <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="project-link"
              type="url"
              placeholder="https://... (Drive, Figma, video, ad, etc.)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => handleSubmit(true)} disabled={loading}>
            Skip & Finish
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={loading}>
            {loading ? 'Saving...' : 'Save & Finish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinishTaskDialog;
