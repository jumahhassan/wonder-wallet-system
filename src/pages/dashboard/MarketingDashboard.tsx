import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChartIcon,
  Loader2,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { TRANSACTION_TYPE_LABELS, CURRENCY_SYMBOLS, CurrencyCode, TransactionType } from '@/types/database';

interface Transaction {
  id: string;
  agent_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  approval_status: string;
  created_at: string;
  commission_amount: number | null;
}

interface AgentPerformance {
  name: string;
  transactions: number;
  volume: number;
  commission: number;
}

interface ServiceDistribution {
  name: string;
  value: number;
  color: string;
}

interface DailyTrend {
  date: string;
  transactions: number;
  volume: number;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function MarketingDashboard() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [serviceDistribution, setServiceDistribution] = useState<ServiceDistribution[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [currencyBreakdown, setCurrencyBreakdown] = useState<{ currency: string; total: number; count: number }[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch all approved transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      // Fetch profiles for agent names
      const { data: profileData } = await supabase.from('profiles').select('id, full_name, email');
      
      const profileMap: Record<string, string> = {};
      profileData?.forEach(p => {
        profileMap[p.id] = p.full_name || p.email;
      });
      setProfiles(profileMap);

      if (txData) {
        setTransactions(txData);
        processAgentPerformance(txData, profileMap);
        processServiceDistribution(txData);
        processDailyTrends(txData);
        processCurrencyBreakdown(txData);
      }
    } catch (error) {
      console.error('Error fetching marketing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAgentPerformance = (txData: Transaction[], profileMap: Record<string, string>) => {
    const agentMap: Record<string, { transactions: number; volume: number; commission: number }> = {};
    
    txData.forEach(tx => {
      if (tx.agent_id) {
        if (!agentMap[tx.agent_id]) {
          agentMap[tx.agent_id] = { transactions: 0, volume: 0, commission: 0 };
        }
        agentMap[tx.agent_id].transactions += 1;
        agentMap[tx.agent_id].volume += tx.amount;
        agentMap[tx.agent_id].commission += tx.commission_amount || 0;
      }
    });

    const performance = Object.entries(agentMap)
      .map(([id, data]) => ({
        name: profileMap[id] || 'Unknown Agent',
        ...data,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    setAgentPerformance(performance);
  };

  const processServiceDistribution = (txData: Transaction[]) => {
    const serviceMap: Record<string, number> = {};
    
    txData.forEach(tx => {
      const label = TRANSACTION_TYPE_LABELS[tx.transaction_type] || tx.transaction_type;
      serviceMap[label] = (serviceMap[label] || 0) + 1;
    });

    const distribution = Object.entries(serviceMap).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    }));

    setServiceDistribution(distribution);
  };

  const processDailyTrends = (txData: Transaction[]) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return format(date, 'yyyy-MM-dd');
    });

    const trendMap: Record<string, { transactions: number; volume: number }> = {};
    last30Days.forEach(date => {
      trendMap[date] = { transactions: 0, volume: 0 };
    });

    txData.forEach(tx => {
      const date = format(new Date(tx.created_at), 'yyyy-MM-dd');
      if (trendMap[date]) {
        trendMap[date].transactions += 1;
        trendMap[date].volume += tx.amount;
      }
    });

    const trends = last30Days.map(date => ({
      date: format(new Date(date), 'MMM dd'),
      transactions: trendMap[date].transactions,
      volume: trendMap[date].volume,
    }));

    setDailyTrends(trends);
  };

  const processCurrencyBreakdown = (txData: Transaction[]) => {
    const currencyMap: Record<string, { total: number; count: number }> = {};
    
    txData.forEach(tx => {
      if (!currencyMap[tx.currency]) {
        currencyMap[tx.currency] = { total: 0, count: 0 };
      }
      currencyMap[tx.currency].total += tx.amount;
      currencyMap[tx.currency].count += 1;
    });

    const breakdown = Object.entries(currencyMap).map(([currency, data]) => ({
      currency,
      ...data,
    }));

    setCurrencyBreakdown(breakdown);
  };

  // Calculate summary metrics
  const totalTransactions = transactions.length;
  const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalCommissions = transactions.reduce((sum, tx) => sum + (tx.commission_amount || 0), 0);
  const uniqueAgents = new Set(transactions.map(tx => tx.agent_id).filter(Boolean)).size;

  // Calculate month-over-month growth (simplified)
  const thisMonthStart = startOfMonth(new Date());
  const thisMonthTx = transactions.filter(tx => new Date(tx.created_at) >= thisMonthStart);
  const lastMonthStart = startOfMonth(subDays(thisMonthStart, 1));
  const lastMonthEnd = endOfMonth(subDays(thisMonthStart, 1));
  const lastMonthTx = transactions.filter(tx => {
    const date = new Date(tx.created_at);
    return date >= lastMonthStart && date <= lastMonthEnd;
  });
  
  const growthRate = lastMonthTx.length > 0 
    ? ((thisMonthTx.length - lastMonthTx.length) / lastMonthTx.length * 100).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Marketing Intelligence Dashboard
        </h1>
        <p className="text-muted-foreground">
          Comprehensive analytics for strategic marketing decisions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-200/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
            <Activity className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {Number(growthRate) >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={Number(growthRate) >= 0 ? 'text-green-500' : 'text-red-500'}>
                {growthRate}%
              </span>
              <span className="ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-200/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Agents
            </CardTitle>
            <Users className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueAgents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Contributing to sales volume
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-200/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Commissions
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCommissions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Earned by all agents
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Services Offered
            </CardTitle>
            <Zap className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviceDistribution.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active product lines
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="currency">Currency</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Transaction Volume Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Transaction Volume (30 Days)
                </CardTitle>
                <CardDescription>Daily transaction count over the past month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrends}>
                      <defs>
                        <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="transactions"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorTx)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sales Volume Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-500" />
                  Sales Volume Trend
                </CardTitle>
                <CardDescription>Daily sales amount fluctuation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${value.toLocaleString()}`, 'Volume']}
                      />
                      <Line
                        type="monotone"
                        dataKey="volume"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Agent Performance Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-500" />
                  Top Agent Performance
                </CardTitle>
                <CardDescription>Transaction volume by agent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agentPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        type="number" 
                        tick={{ fontSize: 12 }} 
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 11 }} 
                        width={100}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [value.toLocaleString(), 'Volume']}
                      />
                      <Bar 
                        dataKey="volume" 
                        fill="hsl(var(--primary))" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Agent Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-amber-500" />
                  Agent Leaderboard
                </CardTitle>
                <CardDescription>Top performers by commission earned</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agentPerformance.slice(0, 8).map((agent, index) => (
                    <div key={agent.name} className="flex items-center gap-4">
                      <div className={`
                        flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                        ${index === 0 ? 'bg-yellow-500/20 text-yellow-600' : ''}
                        ${index === 1 ? 'bg-gray-300/20 text-gray-600' : ''}
                        ${index === 2 ? 'bg-amber-600/20 text-amber-700' : ''}
                        ${index > 2 ? 'bg-muted text-muted-foreground' : ''}
                      `}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.transactions} transactions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600">
                          ${agent.commission.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">commission</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Service Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-violet-500" />
                  Service Distribution
                </CardTitle>
                <CardDescription>Transaction breakdown by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                      >
                        {serviceDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Service Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Service Performance
                </CardTitle>
                <CardDescription>Market share by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serviceDistribution.map((service) => {
                    const percentage = (service.value / totalTransactions * 100);
                    return (
                      <div key={service.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: service.color }}
                            />
                            <span className="text-sm font-medium">{service.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{service.value}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <Progress 
                          value={percentage} 
                          className="h-2"
                          style={{ 
                            // @ts-ignore
                            '--progress-background': service.color 
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Currency Tab */}
        <TabsContent value="currency" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Currency Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  Currency Distribution
                </CardTitle>
                <CardDescription>Transaction volume by currency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currencyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="currency" tick={{ fontSize: 12 }} />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [value.toLocaleString(), 'Total']}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Currency Cards */}
            <div className="grid gap-4 grid-cols-2">
              {currencyBreakdown.map((curr, index) => (
                <Card 
                  key={curr.currency}
                  className={`
                    ${index === 0 ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10' : ''}
                    ${index === 1 ? 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10' : ''}
                    ${index === 2 ? 'bg-gradient-to-br from-orange-500/10 to-amber-500/10' : ''}
                    ${index === 3 ? 'bg-gradient-to-br from-purple-500/10 to-violet-500/10' : ''}
                  `}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      {CURRENCY_SYMBOLS[curr.currency as CurrencyCode] || curr.currency}
                    </CardTitle>
                    <CardDescription>{curr.currency}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {curr.total.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {curr.count} transactions
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Marketing Insights */}
      <Card className="bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Marketing Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-background/50 border">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Top Performing Service
              </h4>
              <p className="text-2xl font-bold">
                {serviceDistribution[0]?.name || 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Consider increasing marketing budget for this service
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-500" />
                Star Agent
              </h4>
              <p className="text-2xl font-bold truncate">
                {agentPerformance[0]?.name || 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Feature in marketing campaigns as success story
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-500" />
                Primary Currency
              </h4>
              <p className="text-2xl font-bold">
                {currencyBreakdown.sort((a, b) => b.count - a.count)[0]?.currency || 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Focus pricing strategies on this currency
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
