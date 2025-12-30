import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Search, Users, Clock, Wallet, TrendingUp, Plus } from 'lucide-react';
import { CURRENCY_SYMBOLS, CurrencyCode } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { usePagination } from '@/hooks/usePagination';
import TablePagination from '@/components/TablePagination';

interface Agent {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  is_active: boolean;
  float_balance: number;
  transaction_count: number;
}

export default function AgentsManagement() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Float allocation state
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [allocateAmount, setAllocateAmount] = useState('');
  const [allocateCurrency, setAllocateCurrency] = useState<CurrencyCode>('USD');
  const [allocateNotes, setAllocateNotes] = useState('');
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      // Get all sales agents
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'sales_agent');

      if (rolesError) throw rolesError;

      const agentIds = userRoles?.map(r => r.user_id) || [];

      if (agentIds.length === 0) {
        setAgents([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, created_at')
        .in('id', agentIds);

      if (profilesError) throw profilesError;

      // Fetch wallets for float balance (USD)
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('user_id, balance')
        .in('user_id', agentIds)
        .eq('currency', 'USD');

      if (walletsError) throw walletsError;

      const walletMap: Record<string, number> = {};
      wallets?.forEach(w => {
        walletMap[w.user_id] = w.balance;
      });

      // Fetch transaction counts
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('agent_id')
        .in('agent_id', agentIds);

      if (txError) throw txError;

      const txCountMap: Record<string, number> = {};
      transactions?.forEach(t => {
        if (t.agent_id) {
          txCountMap[t.agent_id] = (txCountMap[t.agent_id] || 0) + 1;
        }
      });

      const agentList: Agent[] = (profiles || []).map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        phone: p.phone,
        created_at: p.created_at,
        is_active: true, // Default to active
        float_balance: walletMap[p.id] || 0,
        transaction_count: txCountMap[p.id] || 0,
      }));

      setAgents(agentList);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const toggleAgentStatus = async (agentId: string, currentStatus: boolean) => {
    // In a real app, this would update a status field
    setAgents(prev => 
      prev.map(a => a.id === agentId ? { ...a, is_active: !currentStatus } : a)
    );
    toast.success(`Agent ${currentStatus ? 'disabled' : 'enabled'}`);
  };

  const openAllocateDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setAllocateAmount('');
    setAllocateCurrency('USD');
    setAllocateNotes('');
    setAllocateDialogOpen(true);
  };

  const handleAllocateFloat = async () => {
    if (!selectedAgent || !user) return;
    
    const amount = parseFloat(allocateAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setAllocating(true);
    try {
      // Insert float allocation record
      const { error: allocationError } = await supabase
        .from('float_allocations')
        .insert({
          agent_id: selectedAgent.id,
          amount,
          currency: allocateCurrency,
          allocated_by: user.id,
          notes: allocateNotes || null,
        });

      if (allocationError) throw allocationError;

      // Update agent's wallet balance
      const { data: wallet, error: walletFetchError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', selectedAgent.id)
        .eq('currency', allocateCurrency)
        .maybeSingle();

      if (walletFetchError) throw walletFetchError;

      if (wallet) {
        const { error: walletUpdateError } = await supabase
          .from('wallets')
          .update({ balance: wallet.balance + amount })
          .eq('id', wallet.id);

        if (walletUpdateError) throw walletUpdateError;
      }

      toast.success(`Successfully allocated ${CURRENCY_SYMBOLS[allocateCurrency]}${amount.toLocaleString()} to ${selectedAgent.full_name || selectedAgent.email}`);
      setAllocateDialogOpen(false);
      fetchAgents(); // Refresh the list
    } catch (error) {
      console.error('Error allocating float:', error);
      toast.error('Failed to allocate float');
    } finally {
      setAllocating(false);
    }
  };

  const filteredAgents = agents.filter(a =>
    a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.phone?.includes(searchTerm)
  );

  const pagination = usePagination(filteredAgents, { initialPageSize: 10 });

  const totalFloat = agents.reduce((sum, a) => sum + a.float_balance, 0);
  const activeAgents = agents.filter(a => a.is_active).length;

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
        <h1 className="text-3xl font-bold">Agent Management</h1>
        <p className="text-muted-foreground">Manage sales agents and their float balances</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Agents</p>
                <p className="text-3xl font-bold">{agents.length}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Agents</p>
                <p className="text-3xl font-bold text-green-600">{activeAgents}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Float</p>
                <p className="text-3xl font-bold">${totalFloat.toLocaleString()}</p>
              </div>
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Float</p>
                <p className="text-3xl font-bold">
                  ${agents.length > 0 ? (totalFloat / agents.length).toFixed(0) : 0}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Sales Agents</CardTitle>
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
          {filteredAgents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No agents found</h3>
              <p className="text-muted-foreground">Sales agents will appear here once registered</p>
            </div>
          ) : (
            <>
              <ScrollArea className="w-full">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Float Balance</TableHead>
                        <TableHead>Transactions</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedData.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{agent.full_name || 'Unnamed'}</p>
                              <p className="text-sm text-muted-foreground">{agent.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{agent.phone || 'N/A'}</TableCell>
                          <TableCell className="font-medium">
                            ${agent.float_balance.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{agent.transaction_count}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(agent.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={agent.is_active}
                                onCheckedChange={() => toggleAgentStatus(agent.id, agent.is_active)}
                              />
                              <span className={agent.is_active ? 'text-green-600' : 'text-muted-foreground'}>
                                {agent.is_active ? 'Active' : 'Disabled'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openAllocateDialog(agent)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Allocate Float
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

      {/* Allocate Float Dialog */}
      <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Float</DialogTitle>
            <DialogDescription>
              Allocate float to {selectedAgent?.full_name || selectedAgent?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={allocateAmount}
                  onChange={(e) => setAllocateAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={allocateCurrency} 
                  onValueChange={(v) => setAllocateCurrency(v as CurrencyCode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="SSP">SSP (£)</SelectItem>
                    <SelectItem value="KES">KES (KSh)</SelectItem>
                    <SelectItem value="UGX">UGX (USh)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this allocation..."
                value={allocateNotes}
                onChange={(e) => setAllocateNotes(e.target.value)}
                rows={3}
              />
            </div>
            {selectedAgent && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">Current USD Balance</p>
                <p className="font-semibold text-lg">
                  ${selectedAgent.float_balance.toLocaleString()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAllocateDialogOpen(false)}
              disabled={allocating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAllocateFloat}
              disabled={allocating || !allocateAmount}
            >
              {allocating ? 'Allocating...' : 'Allocate Float'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
