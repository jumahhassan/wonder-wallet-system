import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Smartphone, 
  Plus, 
  Users, 
  TrendingUp, 
  Package,
  Calendar,
  Search,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePagination } from '@/hooks/usePagination';
import TablePagination from '@/components/TablePagination';

interface Agent {
  id: string;
  email: string;
  full_name: string | null;
}

interface SimAllocation {
  id: string;
  allocated_by: string | null;
  allocated_to: string;
  quantity: number;
  notes: string | null;
  allocation_date: string;
  created_at: string;
  agent?: Agent;
  allocator?: Agent;
}

interface SimSale {
  id: string;
  agent_id: string;
  quantity_sold: number;
  sale_date: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  agent?: Agent;
}

interface DailySummary {
  date: string;
  totalAllocated: number;
  totalSold: number;
}

export default function SimCardManagement() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [allocations, setAllocations] = useState<SimAllocation[]>([]);
  const [sales, setSales] = useState<SimSale[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Dialog states
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [recordSaleDialogOpen, setRecordSaleDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch sales agents
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'sales_agent');

      const agentIds = userRoles?.map(r => r.user_id) || [];

      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', agentIds);
        
        setAgents(profiles || []);
      }

      // Fetch allocations
      const { data: allocationData } = await supabase
        .from('sim_card_inventory')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch sales
      const { data: salesData } = await supabase
        .from('sim_card_sales')
        .select('*')
        .order('created_at', { ascending: false });

      // Map agents to allocations and sales
      const agentMap: Record<string, Agent> = {};
      agents.forEach(a => { agentMap[a.id] = a; });

      const mappedAllocations = (allocationData || []).map(a => ({
        ...a,
        agent: agentMap[a.allocated_to],
        allocator: agentMap[a.allocated_by],
      }));

      const mappedSales = (salesData || []).map(s => ({
        ...s,
        agent: agentMap[s.agent_id],
      }));

      setAllocations(mappedAllocations);
      setSales(mappedSales);

      // Calculate daily summaries for the last 7 days
      const summaries: DailySummary[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        const allocated = (allocationData || [])
          .filter(a => a.allocation_date === dateStr)
          .reduce((sum, a) => sum + a.quantity, 0);
        
        const sold = (salesData || [])
          .filter(s => s.sale_date === dateStr)
          .reduce((sum, s) => sum + s.quantity_sold, 0);

        summaries.push({ date: dateStr, totalAllocated: allocated, totalSold: sold });
      }
      setDailySummaries(summaries);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedAgentId || !quantity || parseInt(quantity) <= 0) {
      toast.error('Please select an agent and enter a valid quantity');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('sim_card_inventory').insert({
        allocated_to: selectedAgentId,
        allocated_by: user?.id,
        quantity: parseInt(quantity),
        notes: notes || null,
        allocation_date: selectedDate,
      });

      if (error) throw error;

      toast.success('SIM cards allocated successfully');
      setAllocateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error allocating:', error);
      toast.error(error.message || 'Failed to allocate SIM cards');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordSale = async () => {
    if (!selectedAgentId || !quantity || parseInt(quantity) <= 0) {
      toast.error('Please select an agent and enter a valid quantity');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('sim_card_sales').insert({
        agent_id: selectedAgentId,
        quantity_sold: parseInt(quantity),
        notes: notes || null,
        sale_date: selectedDate,
        recorded_by: user?.id,
      });

      if (error) throw error;

      toast.success('SIM card sale recorded successfully');
      setRecordSaleDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error recording sale:', error);
      toast.error(error.message || 'Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedAgentId('');
    setQuantity('');
    setNotes('');
  };

  const filteredAllocations = allocations.filter(a =>
    a.agent?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.agent?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSales = sales.filter(s =>
    s.agent?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.agent?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allocationsPagination = usePagination(filteredAllocations, { initialPageSize: 10 });
  const salesPagination = usePagination(filteredSales, { initialPageSize: 10 });

  // Calculate today's stats
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayAllocated = allocations
    .filter(a => a.allocation_date === todayStr)
    .reduce((sum, a) => sum + a.quantity, 0);
  const todaySold = sales
    .filter(s => s.sale_date === todayStr)
    .reduce((sum, s) => sum + s.quantity_sold, 0);
  const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity, 0);
  const totalSold = sales.reduce((sum, s) => sum + s.quantity_sold, 0);

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
          <h1 className="text-2xl md:text-3xl font-display font-bold">SIM Card Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">Track SIM card allocations and daily sales</p>
        </div>
        <div className="flex flex-col xs:flex-row gap-2">
          <Button onClick={() => setAllocateDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Allocate SIMs</span>
            <span className="xs:hidden">Allocate</span>
          </Button>
          <Button variant="outline" onClick={() => setRecordSaleDialogOpen(true)} className="gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden xs:inline">Record Sale</span>
            <span className="xs:hidden">Sale</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Today Allocated</p>
                <p className="text-xl md:text-3xl font-bold">{todayAllocated}</p>
              </div>
              <Package className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Today Sold</p>
                <p className="text-xl md:text-3xl font-bold text-success">{todaySold}</p>
              </div>
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Allocated</p>
                <p className="text-xl md:text-3xl font-bold">{totalAllocated}</p>
              </div>
              <Smartphone className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Sold</p>
                <p className="text-xl md:text-3xl font-bold text-success">{totalSold}</p>
              </div>
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Last 7 Days Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2">
              {dailySummaries.map((summary) => (
                <div
                  key={summary.date}
                  className={`flex-shrink-0 p-3 rounded-lg border ${
                    summary.date === todayStr ? 'bg-primary/10 border-primary' : 'bg-muted/50'
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {summary.date === todayStr ? 'Today' : format(new Date(summary.date), 'MMM d')}
                  </p>
                  <div className="flex gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Given</p>
                      <p className="font-semibold">{summary.totalAllocated}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sold</p>
                      <p className="font-semibold text-success">{summary.totalSold}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Tabs for Allocations and Sales */}
      <Tabs defaultValue="allocations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="sales">Sales Records</TabsTrigger>
        </TabsList>

        <TabsContent value="allocations">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-base md:text-lg">SIM Card Allocations</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search agents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
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
                    <div className="min-w-[600px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Agent</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allocationsPagination.paginatedData.map((allocation) => (
                            <TableRow key={allocation.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{allocation.agent?.full_name || 'Unknown'}</p>
                                  <p className="text-sm text-muted-foreground">{allocation.agent?.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{allocation.quantity} SIMs</Badge>
                              </TableCell>
                              <TableCell>
                                {format(new Date(allocation.allocation_date), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {allocation.notes || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                  <TablePagination
                    currentPage={allocationsPagination.currentPage}
                    totalPages={allocationsPagination.totalPages}
                    pageSize={allocationsPagination.pageSize}
                    totalItems={allocationsPagination.totalItems}
                    startIndex={allocationsPagination.startIndex}
                    endIndex={allocationsPagination.endIndex}
                    pageSizeOptions={allocationsPagination.pageSizeOptions}
                    canGoNext={allocationsPagination.canGoNext}
                    canGoPrev={allocationsPagination.canGoPrev}
                    onPageChange={allocationsPagination.setPage}
                    onPageSizeChange={allocationsPagination.setPageSize}
                    onNextPage={allocationsPagination.nextPage}
                    onPrevPage={allocationsPagination.prevPage}
                    onFirstPage={allocationsPagination.firstPage}
                    onLastPage={allocationsPagination.lastPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-base md:text-lg">Sales Records</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search agents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredSales.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No sales records found</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="w-full">
                    <div className="min-w-[600px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Agent</TableHead>
                            <TableHead>Quantity Sold</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesPagination.paginatedData.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{sale.agent?.full_name || 'Unknown'}</p>
                                  <p className="text-sm text-muted-foreground">{sale.agent?.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-success text-success-foreground">
                                  {sale.quantity_sold} sold
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {format(new Date(sale.sale_date), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {sale.notes || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                  <TablePagination
                    currentPage={salesPagination.currentPage}
                    totalPages={salesPagination.totalPages}
                    pageSize={salesPagination.pageSize}
                    totalItems={salesPagination.totalItems}
                    startIndex={salesPagination.startIndex}
                    endIndex={salesPagination.endIndex}
                    pageSizeOptions={salesPagination.pageSizeOptions}
                    canGoNext={salesPagination.canGoNext}
                    canGoPrev={salesPagination.canGoPrev}
                    onPageChange={salesPagination.setPage}
                    onPageSizeChange={salesPagination.setPageSize}
                    onNextPage={salesPagination.nextPage}
                    onPrevPage={salesPagination.prevPage}
                    onFirstPage={salesPagination.firstPage}
                    onLastPage={salesPagination.lastPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Allocate Dialog */}
      <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Allocate SIM Cards</DialogTitle>
            <DialogDescription>
              Allocate SIM cards to a sales agent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.full_name || agent.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                placeholder="Number of SIM cards"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setAllocateDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleAllocate} disabled={submitting || !selectedAgentId || !quantity}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Allocate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Sale Dialog */}
      <Dialog open={recordSaleDialogOpen} onOpenChange={setRecordSaleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record SIM Card Sale</DialogTitle>
            <DialogDescription>
              Record the number of SIM cards sold by an agent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.full_name || agent.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity Sold</Label>
              <Input
                type="number"
                placeholder="Number of SIM cards sold"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setRecordSaleDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleRecordSale} disabled={submitting || !selectedAgentId || !quantity}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
