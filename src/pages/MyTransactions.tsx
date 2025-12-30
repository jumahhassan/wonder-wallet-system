import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePagination } from '@/hooks/usePagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import ReceiptDialog from '@/components/ReceiptDialog';
import TablePagination from '@/components/TablePagination';
import { format } from 'date-fns';
import { Search, Clock, CheckCircle, XCircle, AlertCircle, Printer } from 'lucide-react';
import { 
  TRANSACTION_TYPE_LABELS, 
  CURRENCY_SYMBOLS, 
  APPROVAL_STATUS_LABELS,
  TransactionType,
  CurrencyCode,
  ApprovalStatus
} from '@/types/database';

interface MyTransaction {
  id: string;
  transaction_type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  recipient_phone: string | null;
  recipient_name: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
  rejection_reason: string | null;
  commission_amount: number | null;
}

const statusIcons: Record<ApprovalStatus, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-yellow-500" />,
  approved: <CheckCircle className="w-4 h-4 text-green-500" />,
  rejected: <XCircle className="w-4 h-4 text-red-500" />,
};

const statusVariants: Record<ApprovalStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

export default function MyTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<MyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('all');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<MyTransaction | null>(null);

  useEffect(() => {
    if (user) {
      fetchTransactions();

      const channel = supabase
        .channel('my-transactions-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `agent_id=eq.${user.id}`
          },
          () => fetchTransactions()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, transaction_type, amount, currency, recipient_phone, recipient_name, approval_status, created_at, rejection_reason, commission_amount')
        .eq('agent_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReceipt = (transaction: MyTransaction) => {
    setSelectedTransaction(transaction);
    setReceiptOpen(true);
  };

  const getReceiptData = () => {
    if (!selectedTransaction || !user) return null;
    
    return {
      transactionId: `WML-${selectedTransaction.id.slice(0, 6).toUpperCase()}`,
      serviceType: selectedTransaction.transaction_type,
      clientName: selectedTransaction.recipient_name || 'Unknown',
      clientPhone: selectedTransaction.recipient_phone || '',
      amount: selectedTransaction.amount,
      fee: selectedTransaction.commission_amount || 0,
      currency: selectedTransaction.currency,
      agentName: user.email?.split('@')[0] || 'Agent',
      date: new Date(selectedTransaction.created_at),
      status: selectedTransaction.approval_status === 'approved' ? 'SUCCESS' as const : 
              selectedTransaction.approval_status === 'pending' ? 'PENDING' as const : 'FAILED' as const,
      location: 'Juba, South Sudan',
    };
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.recipient_phone?.includes(searchTerm) ||
      t.id.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || t.approval_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pagination = usePagination(filteredTransactions, { initialPageSize: 10 });

  const stats = {
    total: transactions.length,
    pending: transactions.filter(t => t.approval_status === 'pending').length,
    approved: transactions.filter(t => t.approval_status === 'approved').length,
    rejected: transactions.filter(t => t.approval_status === 'rejected').length,
  };

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
        <h1 className="text-3xl font-bold">My Transactions</h1>
        <p className="text-muted-foreground">View all your submitted transaction requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ApprovalStatus | 'all')}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No transactions found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Submit a new sale request to get started'}
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="w-full">
                <div className="min-w-[700px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
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
                            <div>
                              <p className="font-medium">{transaction.recipient_name || 'N/A'}</p>
                              <p className="text-sm text-muted-foreground">{transaction.recipient_phone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {CURRENCY_SYMBOLS[transaction.currency]}{transaction.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariants[transaction.approval_status]}>
                              <span className="flex items-center gap-1">
                                {statusIcons[transaction.approval_status]}
                                {APPROVAL_STATUS_LABELS[transaction.approval_status]}
                              </span>
                            </Badge>
                            {transaction.rejection_reason && (
                              <p className="text-xs text-red-500 mt-1">{transaction.rejection_reason}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openReceipt(transaction)}
                              disabled={transaction.approval_status !== 'approved'}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
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

      <ReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        data={getReceiptData()}
      />
    </div>
  );
}
