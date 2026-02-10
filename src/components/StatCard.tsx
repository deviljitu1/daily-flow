import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

const StatCard = ({ icon: Icon, label, value }: StatCardProps) => (
  <Card className="p-4 flex items-center gap-4">
    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  </Card>
);

export default StatCard;
