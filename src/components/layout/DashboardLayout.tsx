import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
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
  AlertTriangle,
  Menu,
  X,
  CreditCard,
  DollarSign,
  Receipt,
  PiggyBank,
  Building2,
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
  // Super Agent menu
  { label: 'Users Management', href: '/users', icon: <Users className="w-5 h-5" />, roles: ['super_agent'] },
  { label: 'Wallets & Funds', href: '/wallets', icon: <Wallet className="w-5 h-5" />, roles: ['super_agent'] },
  { label: 'Transactions', href: '/transactions', icon: <ArrowLeftRight className="w-5 h-5" />, roles: ['super_agent'] },
  { label: 'Escalated Requests', href: '/escalated-requests', icon: <AlertTriangle className="w-5 h-5" />, roles: ['super_agent'] },
  { label: 'Reports', href: '/reports', icon: <FileText className="w-5 h-5" />, roles: ['super_agent'] },
  { label: 'Audit Logs', href: '/audit-logs', icon: <FileText className="w-5 h-5" />, roles: ['super_agent'] },
  { label: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" />, roles: ['super_agent'] },
  // Sales Assistant menu
  { label: 'Sales Requests', href: '/sales-requests', icon: <CheckSquare className="w-5 h-5" />, roles: ['sales_assistant'] },
  { label: 'Agents', href: '/agents', icon: <Users className="w-5 h-5" />, roles: ['sales_assistant'] },
  { label: 'SIM Cards', href: '/sim-cards', icon: <CreditCard className="w-5 h-5" />, roles: ['sales_assistant'] },
  { label: 'Transactions', href: '/transactions', icon: <ArrowLeftRight className="w-5 h-5" />, roles: ['sales_assistant'] },
  { label: 'Reports', href: '/reports', icon: <FileText className="w-5 h-5" />, roles: ['sales_assistant'] },
  // Sales Agent menu
  { label: 'New Sale', href: '/new-sale', icon: <Smartphone className="w-5 h-5" />, roles: ['sales_agent'] },
  { label: 'My Transactions', href: '/my-transactions', icon: <ArrowLeftRight className="w-5 h-5" />, roles: ['sales_agent'] },
  { label: 'My Commission', href: '/my-commission', icon: <Wallet className="w-5 h-5" />, roles: ['sales_agent'] },
  { label: 'My Clients', href: '/my-clients', icon: <Users className="w-5 h-5" />, roles: ['sales_agent'] },
  // HR/Finance menu
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['hr_finance'] },
  { label: 'Employees', href: '/hr/employees', icon: <Users className="w-5 h-5" />, roles: ['hr_finance'] },
  { label: 'Payroll', href: '/hr/payroll', icon: <DollarSign className="w-5 h-5" />, roles: ['hr_finance'] },
  { label: 'Allocations', href: '/hr/allocations', icon: <CreditCard className="w-5 h-5" />, roles: ['hr_finance'] },
  { label: 'Expenses', href: '/hr/expenses', icon: <Receipt className="w-5 h-5" />, roles: ['hr_finance'] },
  { label: 'Advances', href: '/hr/advances', icon: <PiggyBank className="w-5 h-5" />, roles: ['hr_finance'] },
  { label: 'Transactions', href: '/hr/transactions', icon: <ArrowLeftRight className="w-5 h-5" />, roles: ['hr_finance'] },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNavItems = navItems.filter((item) => role && item.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const handleNavClick = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  const SidebarContent = () => (
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
              onClick={() => handleNavClick(item.href)}
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
              <div className="flex-1 text-left min-w-0">
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
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-50 h-14 gradient-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
          <img src={wondersLogo} alt="Wonders M Ltd" className="h-8 w-auto rounded" />
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0 gradient-sidebar border-l border-sidebar-border">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 gradient-sidebar border-r border-sidebar-border">
          <SidebarContent />
        </aside>
      )}

      {/* Main content */}
      <main className={cn(
        "flex-1 p-4 md:p-6 lg:p-8",
        isMobile ? "pt-18 mt-14" : "ml-64"
      )}>
        {children}
      </main>
    </div>
  );
}
