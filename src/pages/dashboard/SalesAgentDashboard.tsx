import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, Clock, DollarSign, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Transaction, Wallet as WalletType, TRANSACTION_TYPE_LABELS, CURRENCY_SYMBOLS } from '@/types/database';
import CommissionTierCard from '@/components/dashboard/CommissionTierCard';

interface Stats {
  availableFloatUSD: number;
  availableFloatSSP: number;
  salesToday: number;
  commissionEarned: number;
  pendingRequests: number;
  cumulativeAirtimeVolumeSSP: number;
}

export default function SalesAgentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    availableFloatUSD: 0,
    availableFloatSSP: 0,
    salesToday: 0,
    commissionEarned: 0,
    pendingRequests: 0,
    cumulativeAirtimeVolumeSSP: 0,
  });
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      
      const channel = supabase
        .channel('agent-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          fetchDashboardData();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    
    // Fetch wallets
    const { data: userWallets } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id);
    
    const floatUSD = userWallets?.filter(w => w.currency === 'USD').reduce((sum, w) => sum + Number(w.balance), 0) || 0;
    const floatSSP = userWallets?.filter(w => w.currency === 'SSP').reduce((sum, w) => sum + Number(w.balance), 0) || 0;
    setWallets((userWallets as WalletType[]) || []);
    
    // Fetch today's sales
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySales } = await supabase
      .from('transactions')
      .select('*')
      .eq('agent_id', user.id)
      .gte('created_at', today);
    
    // Fetch pending requests
    const { data: pendingTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('agent_id', user.id)
      .eq('approval_status', 'pending');
    
    // Fetch commission
    const { data: approvedTx } = await supabase
      .from('transactions')
      .select('commission_amount, transaction_type, amount, currency')
      .eq('agent_id', user.id)
      .eq('approval_status', 'approved');
    
    const totalCommission = approvedTx?.reduce((sum, t) => sum + Number(t.commission_amount || 0), 0) || 0;
    
    // Calculate cumulative SSP airtime volume for commission tier
    const cumulativeAirtimeSSP = approvedTx
      ?.filter(t => t.transaction_type === 'airtime' && t.currency === 'SSP')
      ?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;
    
    // Fetch recent transactions
    const { data: recentTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('agent_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    setStats({
      availableFloatUSD: floatUSD,
      availableFloatSSP: floatSSP,
      salesToday: todaySales?.length || 0,
      commissionEarned: totalCommission,
      pendingRequests: pendingTx?.length || 0,
      cumulativeAirtimeVolumeSSP: cumulativeAirtimeSSP,
    });
    
    setRecentTransactions((recentTx as Transaction[]) || []);
    setLoading(false);
  };

  const statCards = [
    { title: 'Float (USD)', value: `$${stats.availableFloatUSD.toLocaleString()}`, icon: <Wallet className="w-5 h-5" />, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Float (SSP)', value: `SSP ${stats.availableFloatSSP.toLocaleString()}`, icon: <Wallet className="w-5 h-5" />, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Sales Made Today', value: stats.salesToday, icon: <TrendingUp className="w-5 h-5" />, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Commission Earned', value: `$${stats.commissionEarned.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: 'text-info', bg: 'bg-info/10' },
    { title: 'Pending Requests', value: stats.pendingRequests, icon: <Clock className="w-5 h-5" />, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Agent Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Your sales performance and activity</p>
        </div>
        <Button onClick={() => navigate('/new-sale')} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          New Sale Request
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">{stat.title}</p>
                  <p className="text-lg md:text-2xl font-bold mt-1 truncate">{stat.value}</p>
                </div>
                <div className={`p-2 md:p-3 rounded-full ${stat.bg} ${stat.color} self-start sm:self-auto shrink-0`}>{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Commission Tier & Wallet Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Commission Tier Card */}
        <CommissionTierCard cumulativeVolumeSSP={stats.cumulativeAirtimeVolumeSSP} />
        
        {/* Wallet Balances */}
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Your Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="p-3 md:p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs md:text-sm text-muted-foreground">{wallet.currency}</p>
                  <p className="text-base md:text-xl font-bold mt-1 truncate">
                    {CURRENCY_SYMBOLS[wallet.currency]}{Number(wallet.balance).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/my-transactions')}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No transactions yet. Create your first sale!</p>
              <Button onClick={() => navigate('/new-sale')} className="mt-4">
                Create Sale Request
              </Button>
            </div>
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
                      tx.approval_status === 'pending' ? 'secondary' : 'destructive'
                    }>
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
