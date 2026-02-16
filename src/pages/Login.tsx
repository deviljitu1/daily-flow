import { useState, FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Clock, ArrowRight, Loader2 } from 'lucide-react';

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
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
    <div className="min-h-screen flex w-full">
      {/* Left branding panel with animated gradient */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-primary/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-primary/5 animate-gradient-xy" />

        {/* Animated Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px] opacity-70 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] opacity-70 animate-pulse delay-700" />

        <div className="relative z-10 flex flex-col justify-center px-20 text-foreground h-full">
          <div className="mb-8 p-4 bg-white/10 w-fit rounded-2xl backdrop-blur-md border border-white/20 shadow-xl">
            <Clock className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-6xl font-bold mb-6 tracking-tight leading-tight">
            Seamlessly <br />
            <span className="text-primary">Track Time.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
            Elevate your productivity with WorkTracker. effortless time management for modern teams.
          </p>
        </div>

        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
        <div className="w-full max-w-[420px] space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20 animate-in fade-in zoom-in-95">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="h-12 bg-muted/30 border-input/60 focus:bg-background transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm font-medium text-primary hover:underline underline-offset-4">Forgot password?</a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-12 bg-muted/30 border-input/60 focus:bg-background transition-all duration-300"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium shadow-lg hover:shadow-primary/25 transition-all duration-300"
              disabled={loginLoading}
            >
              {loginLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Sign in <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Demo Access</span>
            </div>
          </div>

          <Card className="glass-card border-none p-6 space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="font-medium text-foreground">Admin:</span>
                <span className="font-mono bg-muted px-2 py-0.5 rounded">admin@demo.com</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="font-medium text-foreground">Employee:</span>
                <span className="font-mono bg-muted px-2 py-0.5 rounded">employee@demo.com</span>
              </div>
            </div>

            {!seedDone && (
              <Button
                variant="outline"
                className="w-full h-10 border-dashed hover:border-primary hover:text-primary transition-all"
                onClick={handleSeedDemo}
                disabled={seeding}
              >
                {seeding ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Seeding...
                  </div>
                ) : 'Seed Demo Data'}
              </Button>
            )}
            {seedDone && (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium bg-green-500/10 p-2 rounded-lg">
                <span>✓</span> Demo data ready
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
