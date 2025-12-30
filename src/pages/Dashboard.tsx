import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, Wallet, Users, Clock, CheckCircle } from 'lucide-react';
import { Transaction, TRANSACTION_TYPE_LABELS, CURRENCY_SYMBOLS } from '@/types/database';

export default function Dashboard() {
  const { role } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, volumeUSD: 0, volumeSSP: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setTransactions(data as Transaction[]);
      const total = data.length;
      const pending = data.filter(t => t.approval_status === 'pending').length;
      const approved = data.filter(t => t.approval_status === 'approved').length;
      const volumeUSD = data.filter(t => t.currency === 'USD').reduce((sum, t) => sum + Number(t.amount), 0);
      const volumeSSP = data.filter(t => t.currency === 'SSP').reduce((sum, t) => sum + Number(t.amount), 0);
      setStats({ total, pending, approved, volumeUSD, volumeSSP });
    }
    setLoading(false);
  };

  const statCards = [
    { title: 'Total Transactions', value: stats.total, icon: <ArrowUpRight className="w-5 h-5" />, color: 'text-primary' },
    { title: 'Pending Approval', value: stats.pending, icon: <Clock className="w-5 h-5" />, color: 'text-warning' },
    { title: 'Approved Today', value: stats.approved, icon: <CheckCircle className="w-5 h-5" />, color: 'text-success' },
    { title: 'Volume (USD)', value: `$${stats.volumeUSD.toLocaleString()}`, icon: <Wallet className="w-5 h-5" />, color: 'text-info' },
    { title: 'Volume (SSP)', value: `SSP ${stats.volumeSSP.toLocaleString()}`, icon: <Wallet className="w-5 h-5" />, color: 'text-info' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Real-time transaction monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-muted ${stat.color}`}>{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-muted-foreground">No transactions yet. Create your first transaction!</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{TRANSACTION_TYPE_LABELS[tx.transaction_type]}</p>
                      <p className="text-sm text-muted-foreground">{tx.recipient_phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{CURRENCY_SYMBOLS[tx.currency]}{Number(tx.amount).toLocaleString()}</p>
                    <Badge variant={tx.approval_status === 'approved' ? 'default' : tx.approval_status === 'pending' ? 'secondary' : 'destructive'}>
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
