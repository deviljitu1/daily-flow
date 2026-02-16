import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { EMPLOYEE_TYPES, EmployeeType, ProfileWithRole } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatJoinDate, getEmployeeTitle, getTenure } from '@/lib/utils';
import { CalendarDays, Clock, ShieldCheck } from 'lucide-react';

interface EditEmployeeDialogProps {
    employee: ProfileWithRole;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const EditEmployeeDialog = ({ employee, open, onOpenChange }: EditEmployeeDialogProps) => {
    const { updateEmployee } = useData();
    const [name, setName] = useState(employee.name);
    const [empType, setEmpType] = useState<EmployeeType>(employee.employee_type);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setName(employee.name);
            setEmpType(employee.employee_type);
        }
    }, [open, employee]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        try {
            await updateEmployee(employee.id, {
                name: name.trim(),
                employee_type: empType,
            });
            onOpenChange(false);
        } finally {
            setSubmitting(false);
        }
    };

    const calculatedTitle = getEmployeeTitle(empType, employee.created_at);
    const tenure = getTenure(employee.created_at);
    const joinDate = formatJoinDate(employee.created_at);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] glass-card border-none">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Edit Employee</DialogTitle>
                </DialogHeader>

                <div className="bg-muted/30 p-4 rounded-lg space-y-3 mb-4 border border-border/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        <span>Joined: <span className="text-foreground font-medium">{joinDate}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>Tenure: <span className="text-foreground font-medium">{tenure}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span>Current Title: <span className="text-primary font-bold">{calculatedTitle}</span></span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Full Name</Label>
                        <Input
                            id="edit-name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="John Doe"
                            required
                            maxLength={100}
                            className="bg-background/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Position</Label>
                        <Select value={empType} onValueChange={v => setEmpType(v as EmployeeType)}>
                            <SelectTrigger className="bg-background/50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {EMPLOYEE_TYPES.map(t => (
                                    <SelectItem key={t} value={t}>
                                        {t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            Changing position will update their calculated title.
                        </p>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting} className="shadow-lg shadow-primary/20">
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditEmployeeDialog;
