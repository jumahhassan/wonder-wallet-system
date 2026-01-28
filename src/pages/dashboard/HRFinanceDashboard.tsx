import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Users,
  TrendingUp,
  Building2,
  Wallet,
  FileText,
  CreditCard,
  PiggyBank,
  Receipt,
  Award,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { CURRENCY_SYMBOLS, ROLE_LABELS, TRANSACTION_TYPE_LABELS } from '@/types/database';

interface DashboardStats {
  totalEmployees: number;
  activeAgents: number;
  pendingPayroll: number;
  totalPayrollThisMonth: number;
  totalCommissionsThisMonth: number;
  pendingAllocations: number;
  totalExpensesThisMonth: number;
  pendingExpenses: number;
  totalAdvances: number;
  totalTransactionsThisMonth: number;
  transactionVolumeThisMonth: number;
}

interface TopAgent {
  id: string;
  name: string;
  email: string;
  totalSales: number;
  totalCommission: number;
  transactionCount: number;
}

interface RecentTransaction {
  id: string;
  agent_name: string;
  transaction_type: string;
  amount: number;
  currency: string;
  commission_amount: number;
  status: string;
  created_at: string;
}

interface PendingAllocation {
  id: string;
  employee_name: string;
  allocation_type: string;
  amount: number;
  currency: string;
  allocation_date: string;
}

export default function HRFinanceDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeAgents: 0,
    pendingPayroll: 0,
    totalPayrollThisMonth: 0,
    totalCommissionsThisMonth: 0,
    pendingAllocations: 0,
    totalExpensesThisMonth: 0,
    pendingExpenses: 0,
    totalAdvances: 0,
    totalTransactionsThisMonth: 0,
    transactionVolumeThisMonth: 0,
  });
  const [topAgents, setTopAgents] = useState<TopAgent[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [pendingAllocations, setPendingAllocations] = useState<PendingAllocation[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState({
    currentMonth: 0,
    previousMonth: 0,
    percentChange: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const currentMonthStart = startOfMonth(new Date()).toISOString();
    const currentMonthEnd = endOfMonth(new Date()).toISOString();
    const previousMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
    const previousMonthEnd = endOfMonth(subMonths(new Date(), 1)).toISOString();

    try {
      // Fetch all employees
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: userRoles } = await supabase.from('user_roles').select('*');
      
      const agentIds = userRoles?.filter(r => r.role === 'sales_agent').map(r => r.user_id) || [];
      
      // Fetch transactions for current month
      const { data: currentMonthTx } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', currentMonthStart)
        .lte('created_at', currentMonthEnd);
      
      // Fetch transactions for previous month
      const { data: previousMonthTx } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', previousMonthStart)
        .lte('created_at', previousMonthEnd);
      
      // Fetch pending payroll
      const { data: pendingPayroll } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('status', 'pending');
      
      // Fetch this month's payroll
      const { data: monthPayroll } = await supabase
        .from('payroll_records')
        .select('*')
        .gte('created_at', currentMonthStart);
      
      // Fetch pending allocations
      const { data: pendingAllocs } = await supabase
        .from('employee_allocations')
        .select('*')
        .eq('status', 'pending');
      
      // Fetch this month's expenses
      const { data: monthExpenses } = await supabase
        .from('company_expenses')
        .select('*')
        .gte('expense_date', format(startOfMonth(new Date()), 'yyyy-MM-dd'));
      
      // Fetch pending expenses
      const { data: pendingExpenses } = await supabase
        .from('company_expenses')
        .select('*')
        .eq('status', 'pending');
      
      // Fetch active advances
      const { data: activeAdvances } = await supabase
        .from('salary_advances')
        .select('*')
        .in('status', ['approved', 'active']);
      
      // Calculate stats
      const totalCommissions = (currentMonthTx || [])
        .filter(tx => tx.approval_status === 'approved')
        .reduce((sum, tx) => sum + Number(tx.commission_amount || 0), 0);
      
      const transactionVolume = (currentMonthTx || [])
        .filter(tx => tx.approval_status === 'approved')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
      
      const totalPayroll = (monthPayroll || []).reduce((sum, p) => sum + Number(p.net_amount), 0);
      const totalExpenses = (monthExpenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
      const totalAdvancesAmount = (activeAdvances || []).reduce((sum, a) => sum + Number(a.remaining_balance), 0);
      
      // Calculate monthly comparison
      const currentTotal = transactionVolume;
      const previousTotal = (previousMonthTx || [])
        .filter(tx => tx.approval_status === 'approved')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
      const percentChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
      
      setStats({
        totalEmployees: profiles?.length || 0,
        activeAgents: agentIds.length,
        pendingPayroll: pendingPayroll?.length || 0,
        totalPayrollThisMonth: totalPayroll,
        totalCommissionsThisMonth: totalCommissions,
        pendingAllocations: pendingAllocs?.length || 0,
        totalExpensesThisMonth: totalExpenses,
        pendingExpenses: pendingExpenses?.length || 0,
        totalAdvances: totalAdvancesAmount,
        totalTransactionsThisMonth: currentMonthTx?.length || 0,
        transactionVolumeThisMonth: transactionVolume,
      });
      
      setMonthlyComparison({
        currentMonth: currentTotal,
        previousMonth: previousTotal,
        percentChange,
      });
      
      // Calculate top agents
      const agentProfiles = profiles?.filter(p => agentIds.includes(p.id)) || [];
      const agentStats = agentProfiles.map(agent => {
        const agentTx = (currentMonthTx || []).filter(tx => tx.agent_id === agent.id && tx.approval_status === 'approved');
        return {
          id: agent.id,
          name: agent.full_name || agent.email,
          email: agent.email,
          totalSales: agentTx.reduce((sum, tx) => sum + Number(tx.amount), 0),
          totalCommission: agentTx.reduce((sum, tx) => sum + Number(tx.commission_amount || 0), 0),
          transactionCount: agentTx.length,
        };
      }).sort((a, b) => b.totalSales - a.totalSales).slice(0, 5);
      
      setTopAgents(agentStats);
      
      // Recent transactions
      const recentTx = (currentMonthTx || []).slice(0, 10).map(tx => {
        const agent = profiles?.find(p => p.id === tx.agent_id);
        return {
          id: tx.id,
          agent_name: agent?.full_name || agent?.email || 'Unknown',
          transaction_type: tx.transaction_type,
          amount: Number(tx.amount),
          currency: tx.currency,
          commission_amount: Number(tx.commission_amount || 0),
          status: tx.approval_status,
          created_at: tx.created_at,
        };
      });
      setRecentTransactions(recentTx);
      
      // Pending allocations with employee names
      const pendingAllocsWithNames = (pendingAllocs || []).slice(0, 5).map(alloc => {
        const employee = profiles?.find(p => p.id === alloc.employee_id);
        return {
          id: alloc.id,
          employee_name: employee?.full_name || employee?.email || 'Unknown',
          allocation_type: alloc.allocation_type,
          amount: Number(alloc.amount),
          currency: alloc.currency,
          allocation_date: alloc.allocation_date,
        };
      });
      setPendingAllocations(pendingAllocsWithNames);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statCards = [
    { title: 'Total Employees', value: stats.totalEmployees, icon: <Users className="w-5 h-5" />, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Active Agents', value: stats.activeAgents, icon: <Award className="w-5 h-5" />, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Transactions (Month)', value: stats.totalTransactionsThisMonth, icon: <TrendingUp className="w-5 h-5" />, color: 'text-info', bg: 'bg-info/10' },
    { title: 'Commissions Earned', value: `$${stats.totalCommissionsThisMonth.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: 'text-success', bg: 'bg-success/10' },
  ];

  const financeCards = [
    { title: 'Payroll This Month', value: `$${stats.totalPayrollThisMonth.toLocaleString()}`, icon: <Wallet className="w-5 h-5" />, color: 'text-primary', bg: 'bg-primary/10', pending: stats.pendingPayroll },
    { title: 'Company Expenses', value: `$${stats.totalExpensesThisMonth.toLocaleString()}`, icon: <Building2 className="w-5 h-5" />, color: 'text-warning', bg: 'bg-warning/10', pending: stats.pendingExpenses },
    { title: 'Outstanding Advances', value: `$${stats.totalAdvances.toLocaleString()}`, icon: <PiggyBank className="w-5 h-5" />, color: 'text-destructive', bg: 'bg-destructive/10' },
    { title: 'Pending Allocations', value: stats.pendingAllocations, icon: <CreditCard className="w-5 h-5" />, color: 'text-info', bg: 'bg-info/10' },
  ];

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">HR & Finance Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Comprehensive overview of company operations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate('/hr/payroll')} variant="outline" size="sm" className="gap-2">
            <Wallet className="w-4 h-4" />
            Payroll
          </Button>
          <Button onClick={() => navigate('/hr/allocations')} variant="outline" size="sm" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Allocations
          </Button>
          <Button onClick={() => navigate('/hr/expenses')} variant="outline" size="sm" className="gap-2">
            <Receipt className="w-4 h-4" />
            Expenses
          </Button>
        </div>
      </div>

      {/* Monthly Performance Comparison */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Transaction Volume This Month</p>
              <p className="text-3xl md:text-4xl font-bold">${monthlyComparison.currentMonth.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              {monthlyComparison.percentChange >= 0 ? (
                <ArrowUpRight className="w-5 h-5 text-success" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-destructive" />
              )}
              <span className={monthlyComparison.percentChange >= 0 ? 'text-success' : 'text-destructive'}>
                {Math.abs(monthlyComparison.percentChange).toFixed(1)}% vs last month
              </span>
            </div>
          </div>
          <Progress 
            value={Math.min((monthlyComparison.currentMonth / Math.max(monthlyComparison.previousMonth, 1)) * 100, 100)} 
            className="mt-4"
          />
        </CardContent>
      </Card>

      {/* Employee & Agent Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col gap-2">
                <div className={`p-2 rounded-full ${stat.bg} ${stat.color} self-start`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-lg md:text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Finance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {financeCards.map((stat, i) => (
          <Card 
            key={i} 
            className="border-border/50 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              if (stat.title.includes('Payroll')) navigate('/hr/payroll');
              if (stat.title.includes('Expenses')) navigate('/hr/expenses');
              if (stat.title.includes('Allocations')) navigate('/hr/allocations');
              if (stat.title.includes('Advances')) navigate('/hr/advances');
            }}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-full ${stat.bg} ${stat.color}`}>
                    {stat.icon}
                  </div>
                  {stat.pending !== undefined && stat.pending > 0 && (
                    <Badge variant="secondary" className="text-xs">{stat.pending} pending</Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-lg md:text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents">Top Agents</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="allocations">Pending Allocations</TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center justify-between">
                Top Performing Agents (This Month)
                <Button variant="outline" size="sm" onClick={() => navigate('/hr/employees')}>
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topAgents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No agent performance data this month</p>
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <div className="min-w-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Agent</TableHead>
                          <TableHead className="text-right">Transactions</TableHead>
                          <TableHead className="text-right">Total Sales</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topAgents.map((agent, index) => (
                          <TableRow key={agent.id}>
                            <TableCell>
                              <Badge variant={index < 3 ? 'default' : 'secondary'}>
                                #{index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{agent.name}</p>
                                <p className="text-sm text-muted-foreground">{agent.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{agent.transactionCount}</TableCell>
                            <TableCell className="text-right font-medium">
                              ${agent.totalSales.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-success">
                              ${agent.totalCommission.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center justify-between">
                Recent Transactions
                <Button variant="outline" size="sm" onClick={() => navigate('/hr/transactions')}>
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No transactions this month</p>
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <div className="min-w-[700px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="font-medium">{tx.agent_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {TRANSACTION_TYPE_LABELS[tx.transaction_type as keyof typeof TRANSACTION_TYPE_LABELS] || tx.transaction_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {CURRENCY_SYMBOLS[tx.currency as keyof typeof CURRENCY_SYMBOLS]}{tx.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-success">
                              ${tx.commission_amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={tx.status === 'approved' ? 'default' : tx.status === 'rejected' ? 'destructive' : 'secondary'}>
                                {tx.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(tx.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocations">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center justify-between">
                Pending Allocations
                <Button variant="outline" size="sm" onClick={() => navigate('/hr/allocations')}>
                  Manage All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingAllocations.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending allocations</p>
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <div className="min-w-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingAllocations.map((alloc) => (
                          <TableRow key={alloc.id}>
                            <TableCell className="font-medium">{alloc.employee_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {alloc.allocation_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {CURRENCY_SYMBOLS[alloc.currency as keyof typeof CURRENCY_SYMBOLS]}{alloc.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(alloc.allocation_date), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
