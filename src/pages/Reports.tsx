import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Download, TrendingUp, DollarSign, Users, ArrowLeftRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TRANSACTION_TYPE_LABELS, CURRENCY_SYMBOLS } from '@/types/database';

interface ReportStats {
  totalTransactions: number;
  totalVolume: number;
  totalCommission: number;
  averageTransaction: number;
}

export default function Reports() {
  const [stats, setStats] = useState<ReportStats>({
    totalTransactions: 0,
    totalVolume: 0,
    totalCommission: 0,
    averageTransaction: 0,
  });
  const [period, setPeriod] = useState('7d');
  const [volumeByType, setVolumeByType] = useState<{ name: string; value: number }[]>([]);
  const [dailyTrend, setDailyTrend] = useState<{ date: string; volume: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];

  useEffect(() => {
    fetchReportData();
  }, [period]);

  const fetchReportData = async () => {
    setLoading(true);
    
    const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .eq('approval_status', 'approved');
    
    if (transactions) {
      const totalTransactions = transactions.length;
      const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalCommission = transactions.reduce((sum, t) => sum + Number(t.commission_amount || 0), 0);
      const averageTransaction = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
      
      setStats({ totalTransactions, totalVolume, totalCommission, averageTransaction });
      
      // Volume by type
      const typeVolume: Record<string, number> = {};
      transactions.forEach(t => {
        const type = TRANSACTION_TYPE_LABELS[t.transaction_type] || t.transaction_type;
        typeVolume[type] = (typeVolume[type] || 0) + Number(t.amount);
      });
      setVolumeByType(Object.entries(typeVolume).map(([name, value]) => ({ name, value })));
      
      // Daily trend
      const dailyData: Record<string, { volume: number; count: number }> = {};
      transactions.forEach(t => {
        const date = new Date(t.created_at).toLocaleDateString();
        if (!dailyData[date]) dailyData[date] = { volume: 0, count: 0 };
        dailyData[date].volume += Number(t.amount);
        dailyData[date].count += 1;
      });
      setDailyTrend(Object.entries(dailyData).map(([date, data]) => ({ date, ...data })).slice(-7));
    }
    
    setLoading(false);
  };

  const handleExport = () => {
    const report = {
      period,
      generatedAt: new Date().toISOString(),
      stats,
      volumeByType,
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${period}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const statCards = [
    { title: 'Total Transactions', value: stats.totalTransactions, icon: <ArrowLeftRight className="w-5 h-5" />, color: 'text-primary' },
    { title: 'Total Volume', value: `$${stats.totalVolume.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: 'text-success' },
    { title: 'Total Commission', value: `$${stats.totalCommission.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-info' },
    { title: 'Avg Transaction', value: `$${stats.averageTransaction.toFixed(2)}`, icon: <FileText className="w-5 h-5" />, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Reports</h1>
          <p className="text-muted-foreground">Analytics and performance reports</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Transaction Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {dailyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrend}>
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
                    <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data for selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Volume by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Volume by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {volumeByType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={volumeByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {volumeByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data for selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
