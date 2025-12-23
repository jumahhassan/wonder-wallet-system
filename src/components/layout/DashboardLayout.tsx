import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Smartphone,
  Wallet,
  ArrowLeftRight,
  CheckSquare,
  Users,
  Settings,
  FileText,
  LogOut,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, AppRole } from '@/types/database';
import wondersLogo from '@/assets/wonders-logo.jpg';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  roles: AppRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['super_agent', 'sales_assistant', 'sales_agent'] },
  { label: 'Transactions', href: '/transactions', icon: <ArrowLeftRight className="w-5 h-5" />, roles: ['super_agent', 'sales_assistant', 'sales_agent'] },
  { label: 'Airtime', href: '/airtime', icon: <Smartphone className="w-5 h-5" />, roles: ['super_agent', 'sales_assistant', 'sales_agent'] },
  { label: 'Mobile Money', href: '/mobile-money', icon: <Wallet className="w-5 h-5" />, roles: ['super_agent', 'sales_assistant', 'sales_agent'] },
  { label: 'Cross-Border', href: '/cross-border', icon: <Globe className="w-5 h-5" />, roles: ['super_agent', 'sales_assistant', 'sales_agent'] },
  { label: 'Approvals', href: '/approvals', icon: <CheckSquare className="w-5 h-5" />, roles: ['super_agent', 'sales_assistant'] },
  { label: 'Agents', href: '/agents', icon: <Users className="w-5 h-5" />, roles: ['super_agent', 'sales_assistant'] },
  { label: 'Audit Logs', href: '/audit-logs', icon: <FileText className="w-5 h-5" />, roles: ['super_agent'] },
  { label: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" />, roles: ['super_agent'] },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredNavItems = navItems.filter((item) => role && item.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 gradient-sidebar border-r border-sidebar-border">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-center p-4 border-b border-sidebar-border">
            <img src={wondersLogo} alt="Wonders M Ltd" className="h-12 w-auto rounded" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user?.email ? getInitials(user.email) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60">
                      {role ? ROLE_LABELS[role] : 'Loading...'}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
