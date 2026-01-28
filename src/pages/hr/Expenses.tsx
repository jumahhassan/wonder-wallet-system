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
import { format, startOfMonth } from 'date-fns';
import {
  Plus,
  Search,
  Loader2,
  Home,
  Droplets,
  Zap,
  Wifi,
  Package,
  Wrench,
  Receipt,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { CURRENCY_SYMBOLS, CurrencyCode, EXPENSE_TYPE_LABELS, ExpenseType } from '@/types/database';
import { usePagination } from '@/hooks/usePagination';
import TablePagination from '@/components/TablePagination';

interface Expense {
  id: string;
  expense_type: ExpenseType;
  amount: number;
  currency: CurrencyCode;
  description: string | null;
  expense_date: string;
  due_date: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [expenseType, setExpenseType] = useState<ExpenseType>('rent');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('company_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      const typedExpenses = (data || []).map(e => ({
        ...e,
        expense_type: e.expense_type as ExpenseType,
      }));
      setExpenses(typedExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('company_expenses').insert({
        expense_type: expenseType,
        amount: Number(amount),
        currency,
        description: description || null,
        expense_date: expenseDate,
        due_date: dueDate || null,
        status: 'pending',
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Expense recorded successfully');
      setCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating expense:', error);
      toast.error(error.message || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from('company_expenses')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Marked as paid');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };

  const resetForm = () => {
    setExpenseType('rent');
    setAmount('');
    setDescription('');
    setDueDate('');
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = 
      e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.expense_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || e.expense_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const pagination = usePagination(filteredExpenses, { initialPageSize: 10 });

  // Stats
  const pendingCount = expenses.filter(e => e.status === 'pending').length;
  const overdueCount = expenses.filter(e => e.status === 'overdue').length;
  const monthlyTotal = expenses
    .filter(e => e.expense_date >= format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const paidThisMonth = expenses
    .filter(e => e.status === 'paid' && e.expense_date >= format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const typeIcons: Record<ExpenseType, React.ReactNode> = {
    rent: <Home className="w-4 h-4" />,
    water: <Droplets className="w-4 h-4" />,
    electricity: <Zap className="w-4 h-4" />,
    internet: <Wifi className="w-4 h-4" />,
    supplies: <Package className="w-4 h-4" />,
    maintenance: <Wrench className="w-4 h-4" />,
    other: <Receipt className="w-4 h-4" />,
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
          <h1 className="text-2xl md:text-3xl font-display font-bold">Company Expenses</h1>
          <p className="text-sm md:text-base text-muted-foreground">Track rent, utilities, and other company expenses</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Record Expense
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
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-xl font-bold">{overdueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Total</p>
                <p className="text-xl font-bold">${monthlyTotal.toLocaleString()}</p>
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
                <p className="text-xs text-muted-foreground">Paid This Month</p>
                <p className="text-xl font-bold">${paidThisMonth.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-base md:text-lg">All Expenses</CardTitle>
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
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="electricity">Electricity</SelectItem>
                  <SelectItem value="internet">Internet</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No expenses found</p>
            </div>
          ) : (
            <>
              <ScrollArea className="w-full">
                <div className="min-w-[700px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedData.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {typeIcons[expense.expense_type]}
                              <span>{EXPENSE_TYPE_LABELS[expense.expense_type]}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {expense.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {CURRENCY_SYMBOLS[expense.currency]}{Number(expense.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(expense.expense_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {expense.due_date ? format(new Date(expense.due_date), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              expense.status === 'paid' ? 'default' :
                              expense.status === 'overdue' ? 'destructive' : 'outline'
                            }>
                              {expense.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {expense.status !== 'paid' && (
                              <Button size="sm" onClick={() => handleMarkPaid(expense.id)}>
                                Mark Paid
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

      {/* Create Expense Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Expense</DialogTitle>
            <DialogDescription>Add a new company expense</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Expense Type</Label>
              <Select value={expenseType} onValueChange={(v) => setExpenseType(v as ExpenseType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="electricity">Electricity</SelectItem>
                  <SelectItem value="internet">Internet</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expense Date</Label>
                <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Due Date (optional)</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
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
            <Button onClick={handleCreateExpense} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
