import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { CurrencyCode, CURRENCY_SYMBOLS, Profile } from '@/types/database';
import { usePagination } from '@/hooks/usePagination';
import TablePagination from '@/components/TablePagination';
import { format } from 'date-fns';

type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
type RequestStatus = 'pending' | 'approved' | 'rejected';

interface FloatRequestWithAgent {
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
  agent?: Profile;
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

export default function FloatRequestsApproval() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FloatRequestWithAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<RequestStatus | 'all'>('pending');
  
  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FloatRequestWithAgent | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const filteredRequests = activeTab === 'all' 
    ? requests 
    : requests.filter(r => r.status === activeTab);
  
  const pagination = usePagination<FloatRequestWithAgent>(filteredRequests);

  useEffect(() => {
    fetchRequests();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('float-requests-approval-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'float_requests'
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchRequests = async () => {
    setLoading(true);

    // Fetch all requests with agent profiles
    const { data: requestsData, error } = await supabase
      .from('float_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching float requests:', error);
      toast.error('Failed to load float requests');
      setLoading(false);
      return;
    }

    // Fetch agent profiles for each unique agent_id
    const agentIds = [...new Set((requestsData || []).map(r => r.agent_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', agentIds);

    const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

    const requestsWithAgents = (requestsData || []).map(request => ({
      ...request,
      agent: profilesMap.get(request.agent_id) as Profile | undefined,
    })) as FloatRequestWithAgent[];

    setRequests(requestsWithAgents);
    setLoading(false);
  };

  const handleApprove = async (request: FloatRequestWithAgent) => {
    if (!user) return;
    setProcessing(true);

    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('float_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Update or create agent's wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', request.agent_id)
        .eq('currency', request.currency)
        .maybeSingle();

      if (wallet) {
        const newBalance = Number(wallet.balance) + Number(request.amount);
        await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('id', wallet.id);
      } else {
        await supabase
          .from('wallets')
          .insert({
            user_id: request.agent_id,
            currency: request.currency,
            balance: request.amount,
          });
      }

      // Record float allocation
      await supabase
        .from('float_allocations')
        .insert({
          agent_id: request.agent_id,
          amount: request.amount,
          currency: request.currency,
          allocated_by: user.id,
          notes: `Approved float request: ${request.reason}`,
        });

      toast.success('Float request approved and wallet updated');
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    }

    setProcessing(false);
  };

  const openRejectDialog = (request: FloatRequestWithAgent) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!user || !selectedRequest) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);

    const { error } = await supabase
      .from('float_requests')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason.trim(),
      })
      .eq('id', selectedRequest.id);

    if (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } else {
      toast.success('Float request rejected');
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    }

    setProcessing(false);
  };

  const getInitials = (name: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return (email || 'U').substring(0, 2).toUpperCase();
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const criticalCount = requests.filter(r => r.status === 'pending' && r.urgency === 'critical').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Float Requests</h1>
        <p className="text-sm md:text-base text-muted-foreground">Review and approve agent float requests</p>
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
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Critical Urgency</p>
              <p className="text-2xl font-bold">{criticalCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>Review and manage agent float requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RequestStatus | 'all')}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">
                Pending {pendingCount > 0 && <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No {activeTab === 'all' ? '' : activeTab} requests found
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Urgency</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          {activeTab === 'pending' && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagination.paginatedData.map((request) => (
                          <TableRow key={request.id} className={request.urgency === 'critical' ? 'bg-destructive/5' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={request.agent?.photo_url || undefined} />
                                  <AvatarFallback>
                                    {getInitials(request.agent?.full_name || null, request.agent?.email)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{request.agent?.full_name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">{request.agent?.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {CURRENCY_SYMBOLS[request.currency]}{Number(request.amount).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${URGENCY_COLORS[request.urgency]}`}>
                                {URGENCY_LABELS[request.urgency]}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <p className="truncate" title={request.reason}>{request.reason}</p>
                              {request.notes && (
                                <p className="text-xs text-muted-foreground truncate" title={request.notes}>
                                  Note: {request.notes}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={STATUS_CONFIG[request.status].variant} className="gap-1">
                                {STATUS_CONFIG[request.status].icon}
                                {STATUS_CONFIG[request.status].label}
                              </Badge>
                              {request.status === 'rejected' && request.rejection_reason && (
                                <p className="text-xs text-destructive mt-1 max-w-[150px] truncate" title={request.rejection_reason}>
                                  {request.rejection_reason}
                                </p>
                              )}
                            </TableCell>
                            {activeTab === 'pending' && (
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleApprove(request)}
                                    disabled={processing}
                                  >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve'}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => openRejectDialog(request)}
                                    disabled={processing}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </TableCell>
                            )}
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Float Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. This will be visible to the agent.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedRequest.agent?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  Requested: {CURRENCY_SYMBOLS[selectedRequest.currency]}{Number(selectedRequest.amount).toLocaleString()}
                </p>
                <p className="text-sm mt-2">{selectedRequest.reason}</p>
              </div>
              <Textarea
                placeholder="Reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
