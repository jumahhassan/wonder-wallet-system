import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, Users, Clock, CheckCircle, XCircle, TrendingUp, 
  ArrowUpRight, DollarSign, UserCheck, AlertTriangle 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Transaction, Profile, TRANSACTION_TYPE_LABELS, CURRENCY_SYMBOLS } from '@/types/database';

interface Stats {
  companyBalance: number;
  transactionsToday: number;
  pendingApprovals: number;
  escalatedRequests: number;
  failedTransactions: number;
  activeSalesAssistants: number;
  activeSalesAgents: number;
}

export default function SuperAgentDashboard() {
  const [stats, setStats] = useState<Stats>({
    companyBalance: 0,
    transactionsToday: 0,
    pendingApprovals: 0,
    escalatedRequests: 0,
    failedTransactions: 0,
    activeSalesAssistants: 0,
    activeSalesAgents: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [escalatedTransactions, setEscalatedTransactions] = useState<Transaction[]>([]);
  const [dailyData, setDailyData] = useState<{ date: string; volume: number }[]>([]);
  const [revenueByService, setRevenueByService] = useState<{ service: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    const channel = supabase
      .channel('super-agent-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    // Fetch wallets for company balance
    const { data: wallets } = await supabase
      .from('wallets')
      .select('balance, currency');
    
    const companyBalance = wallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0;
    
    // Fetch today's transactions
    const today = new Date().toISOString().split('T')[0];
    const { data: todayTx } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', today);
    
    // Fetch pending approvals
    const { data: pendingTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('approval_status', 'pending');
    
    // Fetch escalated requests
    const { data: escalatedTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('approval_status', 'escalated')
      .order('created_at', { ascending: false });
    
    // Fetch failed transactions
    const { data: failedTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'failed');
    
    // Fetch user roles count
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role');
    
    const salesAssistants = roles?.filter(r => r.role === 'sales_assistant').length || 0;
    const salesAgents = roles?.filter(r => r.role === 'sales_agent').length || 0;
    
    // Fetch recent transactions
    const { data: recentTx } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    setStats({
      companyBalance,
      transactionsToday: todayTx?.length || 0,
      pendingApprovals: pendingTx?.length || 0,
      escalatedRequests: escalatedTx?.length || 0,
      failedTransactions: failedTx?.length || 0,
      activeSalesAssistants: salesAssistants,
      activeSalesAgents: salesAgents,
    });
    
    setRecentTransactions((recentTx as Transaction[]) || []);
    setEscalatedTransactions((escalatedTx as Transaction[]) || []);
    
    // Generate mock daily data for chart
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    setDailyData(days.map((date, i) => ({ 
      date, 
      volume: Math.floor(Math.random() * 50000) + 10000 
    })));
    
    // Revenue by service
    const serviceRevenue: Record<string, number> = {};
    (todayTx as Transaction[] || []).forEach(tx => {
      const service = tx.transaction_type;
      serviceRevenue[service] = (serviceRevenue[service] || 0) + Number(tx.amount);
    });
    
    setRevenueByService(
      Object.entries(serviceRevenue).map(([service, revenue]) => ({
        service: TRANSACTION_TYPE_LABELS[service as keyof typeof TRANSACTION_TYPE_LABELS] || service,
        revenue
      }))
    );
    
    setLoading(false);
  };

  const statCards = [
    { title: 'Total Company Balance', value: `$${stats.companyBalance.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Transactions Today', value: stats.transactionsToday, icon: <TrendingUp className="w-5 h-5" />, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Pending Approvals', value: stats.pendingApprovals, icon: <Clock className="w-5 h-5" />, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Escalated Requests', value: stats.escalatedRequests, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: 'Failed Transactions', value: stats.failedTransactions, icon: <XCircle className="w-5 h-5" />, color: 'text-destructive', bg: 'bg-destructive/10' },
    { title: 'Sales Staff', value: stats.activeSalesAssistants + stats.activeSalesAgents, icon: <Users className="w-5 h-5" />, color: 'text-info', bg: 'bg-info/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Company-wide overview and analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-full ${stat.bg} ${stat.color}`}>{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Transaction Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Transaction Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Service */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {revenueByService.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByService}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="service" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No transaction data for today
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Escalated Requests */}
      {escalatedTransactions.length > 0 && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Escalated Requests
              <Badge variant="outline" className="ml-2 border-orange-500 text-orange-500">
                {escalatedTransactions.length} pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {escalatedTransactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium">{TRANSACTION_TYPE_LABELS[tx.transaction_type]}</p>
                      <p className="text-sm text-muted-foreground">{tx.recipient_name || tx.recipient_phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{CURRENCY_SYMBOLS[tx.currency]}{Number(tx.amount).toLocaleString()}</p>
                    <Badge variant="outline" className="border-orange-500 text-orange-500">
                      Escalated
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : recentTransactions.length === 0 ? (
            <p className="text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{TRANSACTION_TYPE_LABELS[tx.transaction_type]}</p>
                      <p className="text-sm text-muted-foreground">{tx.recipient_name || tx.recipient_phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{CURRENCY_SYMBOLS[tx.currency]}{Number(tx.amount).toLocaleString()}</p>
                    <Badge variant={
                      tx.approval_status === 'approved' ? 'default' : 
                      tx.approval_status === 'pending' ? 'secondary' : 
                      tx.approval_status === 'escalated' ? 'outline' : 'destructive'
                    } className={tx.approval_status === 'escalated' ? 'border-orange-500 text-orange-500' : ''}>
                      {tx.approval_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
