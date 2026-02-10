import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { EMPLOYEE_TYPES, EmployeeType } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserCheck, UserX } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Employees = () => {
  const { employees, toggleEmployeeActive, refreshEmployees, loading } = useData();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [empType, setEmpType] = useState<EmployeeType>('Developer');
  const [submitting, setSubmitting] = useState(false);

  const employeeList = employees.filter(e => e.role === 'employee');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: {
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          employee_type: empType,
          role: 'employee',
        },
      });

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }

      if (data?.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      toast({ title: 'Success', description: 'Employee created successfully' });
      setName('');
      setEmail('');
      setPassword('');
      setEmpType('Developer');
      setOpen(false);
      await refreshEmployees();
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (profileId: string, currentActive: boolean) => {
    await toggleEmployeeActive(profileId, !currentActive);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <Label htmlFor="emp-name">Full Name</Label>
                <Input
                  id="emp-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="emp-email">Email</Label>
                <Input
                  id="emp-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="john@company.com"
                  required
                  maxLength={255}
                />
              </div>
              <div>
                <Label htmlFor="emp-password">Password</Label>
                <Input
                  id="emp-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  maxLength={100}
                />
              </div>
              <div>
                <Label>Employee Type</Label>
                <Select value={empType} onValueChange={v => setEmpType(v as EmployeeType)}>
                  <SelectTrigger>
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
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Creating...' : 'Add Employee'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employeeList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No employees yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              employeeList.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{emp.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{emp.employee_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {emp.is_active ? (
                      <Badge variant="outline" className="bg-status-done/15 text-status-done border-status-done/30">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-status-idle/15 text-status-idle border-status-idle/30">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggle(emp.id, emp.is_active)}
                      className="gap-1"
                    >
                      {emp.is_active ? (
                        <>
                          <UserX className="h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Employees;
