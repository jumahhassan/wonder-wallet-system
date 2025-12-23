import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, Download, ArrowLeftRight, Flag, RotateCcw } from 'lucide-react';
import { TRANSACTION_TYPE_LABELS, CURRENCY_SYMBOLS, APPROVAL_STATUS_LABELS, ApprovalStatus, TransactionType, CurrencyCode } from '@/types/database';

interface TransactionData {
  id: string;
  agent_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  recipient_phone: string | null;
  recipient_name: string | null;
  approval_status: ApprovalStatus;
  approved_by: string | null;
  created_at: string;
}

interface TransactionWithAgent extends TransactionData {
  agent_name?: string;
  agent_email?: string;
}

export default function Transactions() {
  const { role } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchTransactions();
    
    const channel = supabase
      .channel('transactions-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    
    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    
    const { data: profiles } = await supabase.from('profiles').select('*');
    
    if (txData && profiles) {
      const txWithAgents: TransactionWithAgent[] = txData.map(tx => {
        const agent = profiles.find(p => p.id === tx.agent_id);
        return {
          ...tx,
          agent_name: agent?.full_name || undefined,
          agent_email: agent?.email
        };
      });
      setTransactions(txWithAgents);
    }
    
    setLoading(false);
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.recipient_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tx.approval_status === statusFilter;
    const matchesType = typeFilter === 'all' || tx.transaction_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Type', 'Agent', 'Client', 'Amount', 'Currency', 'Status', 'Created'].join(','),
      ...filteredTransactions.map(tx => [
        tx.id,
        tx.transaction_type,
        tx.agent_name || tx.agent_email || 'N/A',
        tx.recipient_name || tx.recipient_phone || 'N/A',
        tx.amount,
        tx.currency,
        tx.approval_status,
        new Date(tx.created_at).toISOString()
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Transactions</h1>
          <p className="text-muted-foreground">View and manage all transactions</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, client, or agent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="airtime">Airtime</SelectItem>
                <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                <SelectItem value="digicash">DigiCash</SelectItem>
                <SelectItem value="m_gurush">M-Gurush</SelectItem>
                <SelectItem value="mpesa_kenya">M-Pesa Kenya</SelectItem>
                <SelectItem value="uganda_mobile_money">Uganda Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Transactions ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading transactions...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approved By</TableHead>
                    <TableHead>Date</TableHead>
                    {role === 'super_agent' && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.id.slice(0, 8)}...</TableCell>
                      <TableCell>{tx.agent_name || tx.agent_email || 'N/A'}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tx.recipient_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{tx.recipient_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TRANSACTION_TYPE_LABELS[tx.transaction_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {CURRENCY_SYMBOLS[tx.currency]}{Number(tx.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(tx.approval_status)}>
                          {APPROVAL_STATUS_LABELS[tx.approval_status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tx.approved_by ? tx.approved_by.slice(0, 8) + '...' : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </TableCell>
                      {role === 'super_agent' && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" title="Reverse">
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Flag">
                              <Flag className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
