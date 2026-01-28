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
  UtensilsCrossed,
  Phone,
  Car,
  Package,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { CURRENCY_SYMBOLS, CurrencyCode, ALLOCATION_TYPE_LABELS, AllocationTypes } from '@/types/database';
import { usePagination } from '@/hooks/usePagination';
import TablePagination from '@/components/TablePagination';

interface Employee {
  id: string;
  email: string;
  full_name: string | null;
}

interface Allocation {
  id: string;
  employee_id: string;
  allocation_type: AllocationTypes;
  amount: number;
  currency: CurrencyCode;
  description: string | null;
  allocation_date: string;
  status: string;
  created_at: string;
  employee?: Employee;
}

export default function AllocationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [allocationType, setAllocationType] = useState<AllocationTypes>('lunch');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [description, setDescription] = useState('');
  const [allocationDate, setAllocationDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, email, full_name');
      const { data: allocs } = await supabase
        .from('employee_allocations')
        .select('*')
        .order('created_at', { ascending: false });

      setEmployees(profiles || []);
      
      const allocsWithEmployees = (allocs || []).map(a => ({
        ...a,
        allocation_type: a.allocation_type as AllocationTypes,
        employee: profiles?.find(e => e.id === a.employee_id),
      }));
      setAllocations(allocsWithEmployees);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load allocations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAllocation = async () => {
    if (!selectedEmployeeId || !amount || Number(amount) <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('employee_allocations').insert({
        employee_id: selectedEmployeeId,
        allocation_type: allocationType,
        amount: Number(amount),
        currency,
        description: description || null,
        allocation_date: allocationDate,
        status: 'pending',
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Allocation created successfully');
      setCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating allocation:', error);
      toast.error(error.message || 'Failed to create allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employee_allocations')
        .update({ status: 'approved', approved_by: user?.id })
        .eq('id', id);

      if (error) throw error;
      toast.success('Allocation approved');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    }
  };

  const handleDisburse = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employee_allocations')
        .update({ status: 'disbursed', disbursed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Marked as disbursed');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };

  const resetForm = () => {
    setSelectedEmployeeId('');
    setAllocationType('lunch');
    setAmount('');
    setDescription('');
  };

  const filteredAllocations = allocations.filter(a => {
    const matchesSearch = 
      a.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.employee?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || a.allocation_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const pagination = usePagination(filteredAllocations, { initialPageSize: 10 });

  // Stats
  const pendingCount = allocations.filter(a => a.status === 'pending').length;
  const todayTotal = allocations
    .filter(a => a.allocation_date === format(new Date(), 'yyyy-MM-dd'))
    .reduce((sum, a) => sum + Number(a.amount), 0);

  const typeIcons: Record<AllocationTypes, React.ReactNode> = {
    lunch: <UtensilsCrossed className="w-4 h-4" />,
    airtime: <Phone className="w-4 h-4" />,
    transport: <Car className="w-4 h-4" />,
    equipment: <Package className="w-4 h-4" />,
    advance: <Package className="w-4 h-4" />,
    other: <Package className="w-4 h-4" />,
  };

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
          <h1 className="text-2xl md:text-3xl font-display font-bold">Employee Allocations</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage lunch money, airtime, transport and other allocations</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Allocation
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
                <p className="text-xs text-muted-foreground">Today's Total</p>
                <p className="text-xl font-bold">${todayTotal.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lunch Today</p>
                <p className="text-xl font-bold">
                  {allocations.filter(a => a.allocation_type === 'lunch' && a.allocation_date === format(new Date(), 'yyyy-MM-dd')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-info/10">
                <Phone className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Airtime Today</p>
                <p className="text-xl font-bold">
                  {allocations.filter(a => a.allocation_type === 'airtime' && a.allocation_date === format(new Date(), 'yyyy-MM-dd')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-base md:text-lg">All Allocations</CardTitle>
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
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="airtime">Airtime</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAllocations.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No allocations found</p>
            </div>
          ) : (
            <>
              <ScrollArea className="w-full">
                <div className="min-w-[700px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedData.map((alloc) => (
                        <TableRow key={alloc.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{alloc.employee?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{alloc.employee?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {typeIcons[alloc.allocation_type]}
                              <span className="capitalize">{ALLOCATION_TYPE_LABELS[alloc.allocation_type]}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {CURRENCY_SYMBOLS[alloc.currency]}{Number(alloc.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(alloc.allocation_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              alloc.status === 'disbursed' ? 'default' :
                              alloc.status === 'approved' ? 'secondary' :
                              alloc.status === 'rejected' ? 'destructive' : 'outline'
                            }>
                              {alloc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {alloc.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => handleApprove(alloc.id)}>
                                Approve
                              </Button>
                            )}
                            {alloc.status === 'approved' && (
                              <Button size="sm" onClick={() => handleDisburse(alloc.id)}>
                                Disburse
                              </Button>
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

      {/* Create Allocation Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Allocation</DialogTitle>
            <DialogDescription>Create a new employee allocation</DialogDescription>
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
            <div className="space-y-2">
              <Label>Allocation Type</Label>
              <Select value={allocationType} onValueChange={(v) => setAllocationType(v as AllocationTypes)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lunch">Lunch Money</SelectItem>
                  <SelectItem value="airtime">Airtime</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
              <Label>Date</Label>
              <Input type="date" value={allocationDate} onChange={(e) => setAllocationDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateAllocation} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
