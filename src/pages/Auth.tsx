import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Wallet } from 'lucide-react';
import wondersLogo from '@/assets/wonders-logo.jpg';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && role) {
      navigate('/dashboard');
    }
  }, [user, role, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    
    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.'
          : error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-sidebar flex-col justify-between p-12">
        <div>
          <img src={wondersLogo} alt="Wonders M Ltd" className="h-14 w-auto rounded-lg" />
        </div>
        
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-display font-bold text-sidebar-foreground">
              Empowering Financial Transactions
            </h2>
            <p className="text-lg text-sidebar-foreground/70">
              Secure, fast, and reliable fintech solutions for South Sudan and beyond.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
              <Shield className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold text-sidebar-foreground">Secure</h3>
              <p className="text-sm text-sidebar-foreground/70">Enterprise-grade security</p>
            </div>
            <div className="p-4 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
              <Wallet className="w-8 h-8 text-success mb-2" />
              <h3 className="font-semibold text-sidebar-foreground">Multi-Currency</h3>
              <p className="text-sm text-sidebar-foreground/70">USD, SSP, KES, UGX</p>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-sidebar-foreground/50">
          © 2024 Wonders M Ltd. All rights reserved.
        </p>
      </div>
      
      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md shadow-xl border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden flex items-center justify-center mb-4">
              <img src={wondersLogo} alt="Wonders M Ltd" className="h-12 w-auto rounded-lg" />
            </div>
            <CardTitle className="text-2xl font-display">Welcome Back</CardTitle>
            <CardDescription>Sign in to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? 'border-destructive' : ''}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Contact your Super Agent administrator for account access.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
