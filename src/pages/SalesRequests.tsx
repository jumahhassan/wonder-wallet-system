import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePagination } from '@/hooks/usePagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { TRANSACTION_TYPE_LABELS, CURRENCY_SYMBOLS, TransactionType, CurrencyCode, ApprovalStatus } from '@/types/database';
import TablePagination from '@/components/TablePagination';

interface TransactionRequest {
  id: string;
  agent_id: string;
  transaction_type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  recipient_phone: string | null;
  recipient_name: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
  agent_name?: string;
  agent_email?: string;
}

export default function SalesRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TransactionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<TransactionRequest | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
    
    const channel = supabase
      .channel('sales-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: 'approval_status=eq.pending'
        },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, agent_id, transaction_type, amount, currency, recipient_phone, recipient_name, approval_status, created_at')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch agent profiles
      const agentIds = [...new Set(transactions?.map(t => t.agent_id).filter(Boolean))] as string[];
      let agentMap: Record<string, { full_name: string | null; email: string }> = {};

      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', agentIds);

        if (profiles) {
          agentMap = profiles.reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name, email: p.email };
            return acc;
          }, {} as Record<string, { full_name: string | null; email: string }>);
        }
      }

      const requestsWithAgent: TransactionRequest[] = (transactions || []).map(t => ({
        ...t,
        agent_name: t.agent_id ? agentMap[t.agent_id]?.full_name || undefined : undefined,
        agent_email: t.agent_id ? agentMap[t.agent_id]?.email : undefined,
      }));

      setRequests(requestsWithAgent);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load sales requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: TransactionRequest) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          approval_status: 'approved',
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Request approved successfully');
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          approval_status: 'rejected',
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Request rejected');
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  const openRejectDialog = (request: TransactionRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const filteredRequests = requests.filter(r => 
    r.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.recipient_phone?.includes(searchTerm) ||
    r.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.agent_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pagination = usePagination(filteredRequests, { initialPageSize: 10 });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Requests</h1>
          <p className="text-muted-foreground">Review and approve pending sales requests</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {requests.length} Pending
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Pending Requests</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium">All caught up!</h3>
              <p className="text-muted-foreground">No pending requests to review</p>
            </div>
          ) : (
            <>
              <ScrollArea className="w-full">
                <div className="min-w-[900px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Sales Agent</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedData.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono text-sm">
                            {request.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.agent_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{request.agent_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {TRANSACTION_TYPE_LABELS[request.transaction_type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {CURRENCY_SYMBOLS[request.currency]}{request.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.recipient_name || 'N/A'}</p>
                              <p className="text-sm text-muted-foreground">{request.recipient_phone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(request.created_at), 'MMM d, HH:mm')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(request)}
                                disabled={processing}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openRejectDialog(request)}
                                disabled={processing}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={processing}
                              >
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                Escalate
                              </Button>
                            </div>
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

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processing}
            >
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
