import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  Loader2,
  PiggyBank,
  Clock,
  CheckCircle,
  DollarSign,
} from 'lucide-react';
import { CURRENCY_SYMBOLS, CurrencyCode } from '@/types/database';
import { usePagination } from '@/hooks/usePagination';
import TablePagination from '@/components/TablePagination';

interface Employee {
  id: string;
  email: string;
  full_name: string | null;
}

interface Advance {
  id: string;
  employee_id: string;
  amount: number;
  currency: CurrencyCode;
  reason: string | null;
  repayment_plan: string | null;
  monthly_deduction: number;
  remaining_balance: number;
  status: string;
  approved_at: string | null;
  created_at: string;
  employee?: Employee;
}

export default function AdvancesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [reason, setReason] = useState('');
  const [repaymentPlan, setRepaymentPlan] = useState('');
  const [monthlyDeduction, setMonthlyDeduction] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, email, full_name');
      const { data: advancesData } = await supabase
        .from('salary_advances')
        .select('*')
        .order('created_at', { ascending: false });

      setEmployees(profiles || []);
      
      const advancesWithEmployees = (advancesData || []).map(a => ({
        ...a,
        employee: profiles?.find(e => e.id === a.employee_id),
      }));
      setAdvances(advancesWithEmployees);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load advances');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdvance = async () => {
    if (!selectedEmployeeId || !amount || Number(amount) <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('salary_advances').insert({
        employee_id: selectedEmployeeId,
        amount: Number(amount),
        currency,
        reason: reason || null,
        repayment_plan: repaymentPlan || null,
        monthly_deduction: Number(monthlyDeduction || 0),
        remaining_balance: Number(amount),
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Advance request created');
      setCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating advance:', error);
      toast.error(error.message || 'Failed to create advance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('salary_advances')
        .update({ 
          status: 'approved', 
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Advance approved');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('salary_advances')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Advance rejected');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject');
    }
  };

  const resetForm = () => {
    setSelectedEmployeeId('');
    setAmount('');
    setReason('');
    setRepaymentPlan('');
    setMonthlyDeduction('');
  };

  const filteredAdvances = advances.filter(a => {
    const matchesSearch = 
      a.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.employee?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pagination = usePagination(filteredAdvances, { initialPageSize: 10 });

  // Stats
  const pendingCount = advances.filter(a => a.status === 'pending').length;
  const activeCount = advances.filter(a => a.status === 'active' || a.status === 'approved').length;
  const totalOutstanding = advances
    .filter(a => a.status === 'active' || a.status === 'approved')
    .reduce((sum, a) => sum + Number(a.remaining_balance), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Salary Advances</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage employee advances and loans</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Advance
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-bold">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <DollarSign className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Outstanding</p>
                <p className="text-xl font-bold">${totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-base md:text-lg">All Advances</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="repaid">Repaid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAdvances.length === 0 ? (
            <div className="text-center py-8">
              <PiggyBank className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No advances found</p>
            </div>
          ) : (
            <>
              <ScrollArea className="w-full">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Monthly Deduction</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedData.map((advance) => (
                        <TableRow key={advance.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{advance.employee?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{advance.employee?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {CURRENCY_SYMBOLS[advance.currency]}{Number(advance.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {CURRENCY_SYMBOLS[advance.currency]}{Number(advance.remaining_balance).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {advance.monthly_deduction > 0 ? (
                              `${CURRENCY_SYMBOLS[advance.currency]}${Number(advance.monthly_deduction).toLocaleString()}`
                            ) : '-'}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {advance.reason || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              advance.status === 'repaid' ? 'default' :
                              advance.status === 'approved' || advance.status === 'active' ? 'secondary' :
                              advance.status === 'rejected' ? 'destructive' : 'outline'
                            }>
                              {advance.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {advance.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleReject(advance.id)}>
                                  Reject
                                </Button>
                                <Button size="sm" onClick={() => handleApprove(advance.id)}>
                                  Approve
                                </Button>
                              </div>
                            )}
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

      {/* Create Advance Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Salary Advance</DialogTitle>
            <DialogDescription>Create a salary advance request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name || emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="SSP">SSP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Monthly Deduction (optional)</Label>
              <Input type="number" value={monthlyDeduction} onChange={(e) => setMonthlyDeduction(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Repayment Plan (optional)</Label>
              <Textarea value={repaymentPlan} onChange={(e) => setRepaymentPlan(e.target.value)} rows={2} placeholder="e.g., 6 monthly installments" />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdvance} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
