import { useState, FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.error) {
        setError(result.error);
      } else {
        navigate('/');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    setError('');
    try {
      const { data, error } = await supabase.functions.invoke('seed-demo-data');
      if (error) {
        setError('Failed to seed demo data: ' + error.message);
      } else {
        setSeedDone(true);
      }
    } catch (err) {
      setError('Failed to seed demo data.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-foreground rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-foreground rounded-full blur-3xl" />
        </div>
        <div className="relative text-primary-foreground max-w-md">
          <Clock className="h-16 w-16 mb-8 opacity-90" />
          <h1 className="text-4xl font-bold mb-4">WorkTracker</h1>
          <p className="text-lg opacity-80 leading-relaxed">
            Track your daily work, manage time efficiently, and stay productive. Know who worked on what, when, and for how long.
          </p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Clock className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">WorkTracker</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <Card className="mt-8 p-4 bg-muted border-0">
            <p className="font-medium text-sm mb-2">Demo Credentials</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Admin:</span> admin@demo.com / admin123
              </p>
              <p>
                <span className="font-medium text-foreground">Employee:</span> employee@demo.com / employee123
              </p>
            </div>
            {!seedDone && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={handleSeedDemo}
                disabled={seeding}
              >
                {seeding ? 'Seeding demo data...' : 'Seed Demo Data'}
              </Button>
            )}
            {seedDone && (
              <p className="text-xs text-status-done mt-2 font-medium">✓ Demo data seeded! You can now log in.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
