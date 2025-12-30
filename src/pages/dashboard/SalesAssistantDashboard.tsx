import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, DollarSign, Users, Wallet, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Transaction, TRANSACTION_TYPE_LABELS, CURRENCY_SYMBOLS } from '@/types/database';

interface Stats {
  pendingRequests: number;
  approvedToday: number;
  totalValueProcessedUSD: number;
  totalValueProcessedSSP: number;
  agentFloatStatusUSD: number;
  agentFloatStatusSSP: number;
}

export default function SalesAssistantDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    pendingRequests: 0,
    approvedToday: 0,
    totalValueProcessedUSD: 0,
    totalValueProcessedSSP: 0,
    agentFloatStatusUSD: 0,
    agentFloatStatusSSP: 0,
  });
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    const channel = supabase
      .channel('assistant-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    // Fetch pending requests
    const { data: pendingTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });
    
    // Fetch today's approved
    const today = new Date().toISOString().split('T')[0];
    const { data: approvedTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('approval_status', 'approved')
      .gte('approved_at', today);
    
    // Fetch total processed value
    const { data: allApproved } = await supabase
      .from('transactions')
      .select('amount, currency')
      .eq('approval_status', 'approved');
    
    const totalValueUSD = allApproved?.filter(t => t.currency === 'USD').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const totalValueSSP = allApproved?.filter(t => t.currency === 'SSP').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    
    // Fetch float allocations
    const { data: floats } = await supabase
      .from('float_allocations')
      .select('amount, currency');
    
    const totalFloatUSD = floats?.filter(f => f.currency === 'USD').reduce((sum, f) => sum + Number(f.amount), 0) || 0;
    const totalFloatSSP = floats?.filter(f => f.currency === 'SSP').reduce((sum, f) => sum + Number(f.amount), 0) || 0;
    
    setStats({
      pendingRequests: pendingTx?.length || 0,
      approvedToday: approvedTx?.length || 0,
      totalValueProcessedUSD: totalValueUSD,
      totalValueProcessedSSP: totalValueSSP,
      agentFloatStatusUSD: totalFloatUSD,
      agentFloatStatusSSP: totalFloatSSP,
    });
    
    setPendingTransactions((pendingTx as Transaction[])?.slice(0, 5) || []);
    setLoading(false);
  };

  const statCards = [
    { title: 'Pending Requests', value: stats.pendingRequests, icon: <Clock className="w-5 h-5" />, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Approved Today', value: stats.approvedToday, icon: <CheckCircle className="w-5 h-5" />, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Value Processed (USD)', value: `$${stats.totalValueProcessedUSD.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Value Processed (SSP)', value: `SSP ${stats.totalValueProcessedSSP.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Agent Float (USD)', value: `$${stats.agentFloatStatusUSD.toLocaleString()}`, icon: <Wallet className="w-5 h-5" />, color: 'text-info', bg: 'bg-info/10' },
    { title: 'Agent Float (SSP)', value: `SSP ${stats.agentFloatStatusSSP.toLocaleString()}`, icon: <Wallet className="w-5 h-5" />, color: 'text-info', bg: 'bg-info/10' },
  ];

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Operations Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage sales requests and agent operations</p>
        </div>
        <Button onClick={() => navigate('/sales-requests')} className="gap-2 w-full sm:w-auto">
          <Eye className="w-4 h-4" />
          View All Requests
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border/50 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => i === 0 && navigate('/sales-requests')}>
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

      {/* Pending Requests Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Pending Sales Requests</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/sales-requests')}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : pendingTransactions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="text-muted-foreground">No pending requests! All caught up.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium">{TRANSACTION_TYPE_LABELS[tx.transaction_type]}</p>
                      <p className="text-sm text-muted-foreground">{tx.recipient_name || tx.recipient_phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{CURRENCY_SYMBOLS[tx.currency]}{Number(tx.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => navigate('/sales-requests')}>
                      Review
                    </Button>
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
