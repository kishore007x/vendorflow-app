import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package, Shield, Settings, Sparkles } from 'lucide-react';

const roles: { id: UserRole; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'admin', label: 'Administrator', icon: Shield, description: 'Full system access' },
  { id: 'vendor', label: 'Vendor', icon: Package, description: 'Product & inventory management' },
  { id: 'operations', label: 'Operations', icon: Settings, description: 'Order & fulfillment' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login, signup, emailNotVerified, logout } = useAuth();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [showVerifyScreen, setShowVerifyScreen] = useState(false);

  useEffect(() => {
    if (authUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [authUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedRole) {
      setError('Please select a role before signing in.');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      await new Promise(resolve => setTimeout(resolve, 100));
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', selectedRole)
          .maybeSingle();
        if (!roleData) {
          await supabase.auth.signOut();
          setError('Role mismatch. Contact administrator.');
          setIsLoading(false);
          return;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await signup(email, password, name);
      setShowVerifyScreen(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show email verification screen
  if (showVerifyScreen || emailNotVerified) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden p-4"
        style={{
          background: 'linear-gradient(160deg, #F2EAF7 0%, #e0ccea 30%, #d4b8e0 60%, #F2EAF7 100%)',
        }}
      >
        <div className="w-full max-w-md relative z-10">
          <div
            className="rounded-2xl overflow-hidden p-8 text-center"
            style={{
              background: 'var(--glass-bg-card)',
              backdropFilter: 'blur(40px)',
              border: '1px solid var(--glass-border-strong)',
              boxShadow: 'var(--shadow-xl), var(--shadow-glow)',
            }}
          >
            <div
              className="inline-flex items-center justify-center rounded-2xl mb-6"
              style={{
                width: '72px',
                height: '72px',
                background: 'linear-gradient(135deg, #C59DD9 0%, #7A3F91 100%)',
                boxShadow: '0 0 30px rgba(197, 157, 217, 0.5)',
              }}
            >
              <Package className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h2>
            <p className="text-muted-foreground text-sm mb-6">
              We've sent a verification link to <strong className="text-foreground">{email}</strong>. Please click the link to verify your account before signing in.
            </p>
            <div className="p-4 rounded-xl mb-6" style={{ background: 'rgba(60, 160, 100, 0.1)' }}>
              <p className="text-sm font-medium" style={{ color: 'hsl(var(--success))' }}>
                ✉️ Verification email sent successfully
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowVerifyScreen(false);
                if (emailNotVerified) logout();
              }}
            >
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden p-4"
      style={{
        background: 'linear-gradient(160deg, #F2EAF7 0%, #e0ccea 30%, #d4b8e0 60%, #F2EAF7 100%)',
      }}
    >
      {/* Animated glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full blur-[100px] animate-float"
          style={{ background: 'rgba(197, 157, 217, 0.3)' }}
        />
        <div
          className="absolute -bottom-40 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] animate-float"
          style={{ background: 'rgba(122, 63, 145, 0.2)', animationDelay: '3s' }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full blur-[80px] animate-float"
          style={{ background: 'rgba(43, 13, 62, 0.08)', animationDelay: '1.5s' }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-slide-up">
          <div
            className="inline-flex items-center justify-center rounded-2xl mb-4 relative animate-glow"
            style={{
              width: '72px',
              height: '72px',
              background: 'linear-gradient(135deg, #C59DD9 0%, #7A3F91 100%)',
              boxShadow: '0 0 30px rgba(197, 157, 217, 0.5), 0 8px 24px rgba(122, 63, 145, 0.3)',
            }}
          >
            <Package className="w-9 h-9 text-white" />
            <Sparkles className="w-4 h-4 text-white/60 absolute -top-1 -right-1" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient">VendorFlow</h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">Multi-Portal E-Commerce Management</p>
        </div>

        {/* Glass Login Card */}
        <div
          className="rounded-2xl overflow-hidden animate-fade-in"
          style={{
            background: 'var(--glass-bg-card)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid var(--glass-border-strong)',
            boxShadow: 'var(--shadow-xl), var(--shadow-glow), var(--shadow-inner-glass)',
            animationDelay: '0.15s',
          }}
        >

          <Tabs defaultValue="login">
            <div className="px-6 pt-6 pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:text-white font-semibold"
                  style={{ }}
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="data-[state=active]:text-white font-semibold"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="px-6 pb-8">
              {/* Login Tab */}
              <TabsContent value="login" className="mt-0 space-y-5">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground/80">Select Role</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {roles.map((role, idx) => {
                        const Icon = role.icon;
                        const isSelected = selectedRole === role.id;
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => setSelectedRole(role.id)}
                            className="relative flex flex-col items-center p-3.5 rounded-xl transition-all duration-300 group hover:scale-[1.03]"
                            style={{
                              background: isSelected ? 'rgba(122, 63, 145, 0.12)' : 'var(--glass-bg)',
                              border: isSelected ? '2px solid rgba(122, 63, 145, 0.5)' : '2px solid var(--glass-border)',
                              boxShadow: isSelected ? '0 0 20px rgba(197, 157, 217, 0.3)' : 'var(--shadow-inner-glass)',
                              backdropFilter: 'blur(16px)',
                            }}
                          >
                            <div
                              className="p-2 rounded-lg mb-1.5 transition-all duration-300"
                              style={{
                                background: isSelected ? 'rgba(122, 63, 145, 0.2)' : 'var(--glass-bg-medium)',
                              }}
                            >
                              <Icon
                                className="w-5 h-5 transition-colors duration-300"
                                style={{ color: isSelected ? '#7A3F91' : 'hsl(var(--muted-foreground))' }}
                              />
                            </div>
                            <span
                              className="text-xs font-semibold transition-colors duration-300"
                              style={{ color: isSelected ? '#7A3F91' : 'hsl(var(--foreground) / 0.7)' }}
                            >
                              {role.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedRole && (
                      <p className="text-xs text-muted-foreground text-center animate-fade-in">
                        {roles.find(r => r.id === selectedRole)?.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-semibold text-foreground/80">Email</Label>
                    <Input id="login-email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-semibold text-foreground/80">Password</Label>
                    <Input id="login-password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl text-sm font-medium animate-fade-in" style={{ background: 'rgba(220, 70, 70, 0.1)', color: 'hsl(var(--destructive))' }}>{error}</div>
                  )}

                  <Button type="submit" className="w-full h-11 font-semibold text-sm tracking-wide" disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup" className="mt-0 space-y-5">
                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-semibold text-foreground/80">Full Name</Label>
                    <Input id="signup-name" type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-semibold text-foreground/80">Email</Label>
                    <Input id="signup-email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-semibold text-foreground/80">Password</Label>
                    <Input id="signup-password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11" />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl text-sm font-medium animate-fade-in" style={{ background: 'rgba(220, 70, 70, 0.1)', color: 'hsl(var(--destructive))' }}>{error}</div>
                  )}
                  {success && (
                    <div className="p-3 rounded-xl text-sm font-medium animate-fade-in" style={{ background: 'rgba(60, 160, 100, 0.1)', color: 'hsl(var(--success))' }}>{success}</div>
                  )}

                  <Button type="submit" className="w-full h-11 font-semibold text-sm tracking-wide" disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          Multi-Portal VMS • Amazon • Flipkart • Meesho • FirstCry • Blinkit
        </p>
      </div>
    </div>
  );
}
