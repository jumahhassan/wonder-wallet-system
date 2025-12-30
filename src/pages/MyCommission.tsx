import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePagination } from '@/hooks/usePagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { DollarSign, TrendingUp, Calendar, Clock, Wallet } from 'lucide-react';
import { 
  TRANSACTION_TYPE_LABELS, 
  CURRENCY_SYMBOLS,
  TransactionType,
  CurrencyCode
} from '@/types/database';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import TablePagination from '@/components/TablePagination';

interface CommissionTransaction {
  id: string;
  transaction_type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  commission_amount: number | null;
  created_at: string;
}

interface DailyCommission {
  date: string;
  commission: number;
}

export default function MyCommission() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<CommissionTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<DailyCommission[]>([]);

  useEffect(() => {
    if (user) {
      fetchCommissions();
    }
  }, [user]);

  const fetchCommissions = async () => {
    try {
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      const { data, error } = await supabase
        .from('transactions')
        .select('id, transaction_type, amount, currency, commission_amount, created_at')
        .eq('agent_id', user?.id)
        .eq('approval_status', 'approved')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);

      // Generate chart data
      const dailyMap: Record<string, number> = {};
      (data || []).forEach(t => {
        const dateKey = format(new Date(t.created_at), 'MMM d');
        dailyMap[dateKey] = (dailyMap[dateKey] || 0) + (t.commission_amount || 0);
      });

      const chartDataArray = Object.entries(dailyMap)
        .map(([date, commission]) => ({ date, commission }))
        .slice(-14); // Last 14 days

      setChartData(chartDataArray);
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const pagination = usePagination(transactions, { initialPageSize: 10 });

  const totalCommission = transactions.reduce((sum, t) => sum + (t.commission_amount || 0), 0);
  const totalTransactions = transactions.length;
  const avgCommission = totalTransactions > 0 ? totalCommission / totalTransactions : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Commission</h1>
        <p className="text-muted-foreground">Track your earnings and commission history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-3xl font-bold text-green-600">${totalCommission.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{totalTransactions}</p>
              </div>
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg per Transaction</p>
                <p className="text-2xl font-bold">${avgCommission.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Period</p>
                <p className="text-lg font-bold">{format(new Date(), 'MMMM yyyy')}</p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Commission Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Commission']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="commission" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary) / 0.2)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission Details */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Details</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No commissions yet</h3>
              <p className="text-muted-foreground">Complete approved transactions to earn commission</p>
            </div>
          ) : (
            <>
              <ScrollArea className="w-full">
                <div className="min-w-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Transaction Amount</TableHead>
                        <TableHead>Commission Earned</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedData.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-sm">
                            {transaction.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {TRANSACTION_TYPE_LABELS[transaction.transaction_type]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {CURRENCY_SYMBOLS[transaction.currency]}{transaction.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            +${(transaction.commission_amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TablePagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                pageSizeOptions={pagination.pageSizeOptions}
                canGoNext={pagination.canGoNext}
                canGoPrev={pagination.canGoPrev}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                onNextPage={pagination.nextPage}
                onPrevPage={pagination.prevPage}
                onFirstPage={pagination.firstPage}
                onLastPage={pagination.lastPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
