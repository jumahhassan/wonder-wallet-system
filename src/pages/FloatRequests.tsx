import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Plus, Wallet, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { CurrencyCode, CURRENCY_SYMBOLS } from '@/types/database';
import { usePagination } from '@/hooks/usePagination';
import TablePagination from '@/components/TablePagination';
import { format } from 'date-fns';

type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
type RequestStatus = 'pending' | 'approved' | 'rejected';

interface FloatRequest {
  id: string;
  agent_id: string;
  amount: number;
  currency: CurrencyCode;
  reason: string;
  urgency: UrgencyLevel;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface WalletBalance {
  currency: CurrencyCode;
  balance: number;
}

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/10 text-info',
  high: 'bg-warning/10 text-warning',
  critical: 'bg-destructive/10 text-destructive',
};

const STATUS_CONFIG: Record<RequestStatus, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { label: 'Pending', icon: <Clock className="w-4 h-4" />, variant: 'secondary' },
  approved: { label: 'Approved', icon: <CheckCircle className="w-4 h-4" />, variant: 'default' },
  rejected: { label: 'Rejected', icon: <XCircle className="w-4 h-4" />, variant: 'destructive' },
};

export default function FloatRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FloatRequest[]>([]);
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('SSP');
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');
  const [notes, setNotes] = useState('');

  const pagination = usePagination<FloatRequest>(requests);

  useEffect(() => {
    if (user) {
      fetchData();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('float-requests-realtime')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'float_requests'
        }, () => {
          fetchData();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch requests and wallets in parallel
    const [requestsResult, walletsResult] = await Promise.all([
      supabase
        .from('float_requests')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('wallets')
        .select('currency, balance')
        .eq('user_id', user.id)
    ]);

    if (requestsResult.data) {
      setRequests(requestsResult.data as FloatRequest[]);
    }
    
    if (walletsResult.data) {
      setWallets(walletsResult.data as WalletBalance[]);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for your request');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('float_requests')
      .insert({
        agent_id: user.id,
        amount: numAmount,
        currency,
        reason: reason.trim(),
        urgency,
        notes: notes.trim() || null,
      });

    if (error) {
      console.error('Error creating float request:', error);
      toast.error('Failed to submit request');
    } else {
      toast.success('Float request submitted successfully');
      setDialogOpen(false);
      resetForm();
      fetchData();
    }

    setSubmitting(false);
  };

  const resetForm = () => {
    setAmount('');
    setCurrency('SSP');
    setReason('');
    setUrgency('medium');
    setNotes('');
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Float Requests</h1>
          <p className="text-sm md:text-base text-muted-foreground">Request money from your sales assistant</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Float</DialogTitle>
              <DialogDescription>
                Submit a request to receive trading float from your sales assistant.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="SSP">SSP</SelectItem>
                      <SelectItem value="KES">KES (KSh)</SelectItem>
                      <SelectItem value="UGX">UGX (USh)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency Level</Label>
                <Select value={urgency} onValueChange={(v) => setUrgency(v as UrgencyLevel)}>
                  <SelectTrigger id="urgency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Can wait a few days</SelectItem>
                    <SelectItem value="medium">Medium - Need within 24 hours</SelectItem>
                    <SelectItem value="high">High - Need within a few hours</SelectItem>
                    <SelectItem value="critical">Critical - Need immediately</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why you need this float..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Wallet Balances */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {wallets.map((wallet) => (
          <Card key={wallet.currency} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{wallet.currency} Balance</p>
                  <p className="text-lg font-bold">
                    {CURRENCY_SYMBOLS[wallet.currency]}{Number(wallet.balance).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {wallets.length === 0 && !loading && (
          <Card className="border-border/50 col-span-full">
            <CardContent className="p-4 text-center text-muted-foreground">
              No wallets found. Request float to get started.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-warning/10">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Requests</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-success/10">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved (Total)</p>
              <p className="text-2xl font-bold">{approvedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>All your float requests and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No requests yet</p>
              <p className="text-muted-foreground mb-4">Submit your first float request to get trading capital</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.paginatedData.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(request.created_at), 'MMM d, yyyy')}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(request.created_at), 'h:mm a')}
                          </p>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {CURRENCY_SYMBOLS[request.currency]}{Number(request.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${URGENCY_COLORS[request.urgency]}`}>
                            {URGENCY_LABELS[request.urgency]}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={request.reason}>
                          {request.reason}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={STATUS_CONFIG[request.status].variant} className="w-fit gap-1">
                              {STATUS_CONFIG[request.status].icon}
                              {STATUS_CONFIG[request.status].label}
                            </Badge>
                            {request.status === 'rejected' && request.rejection_reason && (
                              <p className="text-xs text-destructive" title={request.rejection_reason}>
                                {request.rejection_reason.slice(0, 30)}...
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
