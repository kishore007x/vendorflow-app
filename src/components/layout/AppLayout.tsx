import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Bell, Search, LogOut, Settings, User, Smartphone, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AIAccessBanner, AIAccessControl } from '@/components/AIAccessControl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ThemeCustomizer } from '@/components/ThemeCustomizer';
import { useThemeSettings } from '@/hooks/useThemeSettings';

interface AppLayoutProps {
  children: ReactNode;
}

const routePermissions: Record<string, UserRole[]> = {
  '/dashboard': ['admin', 'vendor', 'operations'],
  '/insights': ['admin', 'vendor', 'operations'],
  '/products': ['admin', 'vendor'],
  '/products-catalog': ['admin', 'vendor'],
  '/brands': ['admin', 'vendor'],
  '/affiliated': ['admin', 'vendor'],
  '/stock-reconciliation': ['admin', 'operations'],
  '/catalog-manager': ['admin'],
  '/product-health': ['admin', 'vendor', 'operations'],
  '/sku-mapping': ['admin', 'vendor'],
  '/inventory': ['admin', 'vendor', 'operations'],
  '/orders': ['admin', 'vendor', 'operations'],
  '/consolidated-orders': ['admin', 'operations'],
  '/returns': ['admin', 'operations'],
  '/settlements': ['admin', 'vendor'],
  '/reconciliation': ['admin', 'operations'],
  '/price-payout': ['admin', 'vendor'],
  '/finance': ['admin', 'vendor'],
  '/vendors': ['admin'],
  '/warehouses': ['admin', 'operations'],
  '/data-import': ['admin', 'operations'],
  '/video-management': ['admin', 'operations'],
  '/alerts': ['admin', 'vendor', 'operations'],
  '/tasks': ['admin', 'operations'],
  '/analytics': ['admin', 'vendor'],
  '/leads': ['admin', 'vendor'],
  '/customers': ['admin', 'vendor', 'operations'],
  '/whatsapp': ['admin'],
  '/social-insights': ['admin', 'vendor'],
  '/ecommerce': ['admin', 'vendor'],
  '/reports': ['admin', 'vendor', 'operations'],
  '/onboarding': ['admin'],
  '/system-settings': ['admin'],
  '/permissions': ['admin'],
  '/api-settings': ['admin'],
  '/legal-compliance': ['admin'],
  '/subscription': ['admin'],
  '/chatbot': ['admin'],
  '/support': ['admin', 'vendor', 'operations'],
  '/data-configuration': ['admin'],
  '/system-architecture': ['admin'],
};

export function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, updateSetting, resetToDefaults, ACCENT_PRESETS } = useThemeSettings();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #F2EAF7 0%, #e8d8f0 30%, #f0e6f5 60%, #F2EAF7 100%)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentPath = location.pathname;
  const allowedRoles = routePermissions[currentPath];
  const hasAccess = !allowedRoles || (user && allowedRoles.includes(user.role));

  const lastSynced = new Date();
  lastSynced.setMinutes(lastSynced.getMinutes() - 3);
  const syncLabel = `Last synced: ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          {/* Top Header – Liquid Glass */}
          <header
            className="h-14 px-4 flex items-center justify-between sticky top-0 z-10 rounded-none"
            style={{
              background: 'var(--glass-bg-strong)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderBottom: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              
              <div className="hidden md:flex items-center flex-1 justify-center">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search orders, products, vendors..." 
                    className="w-full pl-10 rounded-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden lg:block">
                {syncLabel}
              </span>

              <Badge
                variant="outline"
                className="gap-1 text-xs hidden lg:flex rounded-full px-3"
                style={{
                  background: 'var(--glass-bg-medium)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--glass-border)',
                  color: 'hsl(var(--accent))',
                }}
              >
                <Smartphone className="w-3 h-3" />
                Mobile Ready – PWA
              </Badge>

              <ThemeCustomizer settings={settings} onUpdate={updateSetting} onReset={resetToDefaults} accentPresets={ACCENT_PRESETS} />

              <AIAccessControl />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive">
                      3
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-80 rounded-2xl p-0 overflow-hidden"
                  style={{
                    background: 'var(--glass-bg-strong)',
                    backdropFilter: 'blur(40px)',
                    border: '1px solid var(--glass-border-strong)',
                    boxShadow: 'var(--shadow-xl), var(--shadow-glow)',
                  }}
                >
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <h4 className="font-semibold text-sm">Notifications</h4>
                  </div>
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-destructive" />
                      <span className="font-medium text-sm">Critical Low Stock</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Bluetooth Speaker - 5 units left</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-warning" />
                      <span className="font-medium text-sm">Settlement Delayed</span>
                    </div>
                    <span className="text-xs text-muted-foreground">FirstCry payment overdue by 7 days</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-info" />
                      <span className="font-medium text-sm">New Return Request</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Order ORD-2024-002 return initiated</span>
                  </DropdownMenuItem>
                  <div className="p-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <Button variant="ghost" className="w-full text-sm">
                      View all notifications
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback
                        className="text-xs font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg, #C59DD9, #7A3F91)' }}
                      >
                        {user?.name?.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col text-left">
                      <span className="text-sm font-medium leading-tight">{user?.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl"
                  style={{
                    background: 'var(--glass-bg-strong)',
                    backdropFilter: 'blur(40px)',
                    border: '1px solid var(--glass-border-strong)',
                    boxShadow: 'var(--shadow-xl), var(--shadow-glow)',
                  }}
                >
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/system-settings')}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/system-settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <AIAccessBanner />

          <main className="flex-1 p-6 overflow-auto">
            {!hasAccess ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <Alert variant="destructive" className="max-w-md rounded-2xl">
                  <ShieldAlert className="h-5 w-5" />
                  <AlertTitle>Access Restricted</AlertTitle>
                  <AlertDescription>
                    Your role <Badge variant="outline" className="mx-1 capitalize">{user?.role}</Badge> does not have permission to access this module. Contact your administrator to request access.
                  </AlertDescription>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/dashboard')}>
                    Return to Dashboard
                  </Button>
                </Alert>
              </div>
            ) : (
              children
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
