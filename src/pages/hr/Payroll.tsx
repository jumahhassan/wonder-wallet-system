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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  Plus,
  Search,
  Loader2,
  DollarSign,
  Wallet,
  Users,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { CURRENCY_SYMBOLS, CurrencyCode } from '@/types/database';
import { usePagination } from '@/hooks/usePagination';
import TablePagination from '@/components/TablePagination';

interface Employee {
  id: string;
  email: string;
  full_name: string | null;
}

interface PayrollRecord {
  id: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  base_amount: number;
  commission_amount: number;
  deductions: number;
  net_amount: number;
  currency: CurrencyCode;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  employee?: Employee;
}

interface EmployeeSalary {
  id: string;
  employee_id: string;
  base_salary: number;
  currency: CurrencyCode;
  payment_frequency: string;
  effective_date: string;
  employee?: Employee;
}

export default function PayrollPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [salaries, setSalaries] = useState<EmployeeSalary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [createPayrollDialogOpen, setCreatePayrollDialogOpen] = useState(false);
  const [setSalaryDialogOpen, setSetSalaryDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [baseAmount, setBaseAmount] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [deductions, setDeductions] = useState('0');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('monthly');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, email, full_name');
      const { data: payroll } = await supabase
        .from('payroll_records')
        .select('*')
        .order('created_at', { ascending: false });
      const { data: salaryData } = await supabase
        .from('employee_salaries')
        .select('*')
        .order('effective_date', { ascending: false });

      setEmployees(profiles || []);
      
      const payrollWithEmployees = (payroll || []).map(p => ({
        ...p,
        employee: profiles?.find(e => e.id === p.employee_id),
      }));
      setPayrollRecords(payrollWithEmployees);
      
      const salariesWithEmployees = (salaryData || []).map(s => ({
        ...s,
        employee: profiles?.find(e => e.id === s.employee_id),
      }));
      setSalaries(salariesWithEmployees);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayroll = async () => {
    if (!selectedEmployeeId || !baseAmount) {
      toast.error('Please select an employee and enter base amount');
      return;
    }

    setSubmitting(true);
    try {
      const netAmount = Number(baseAmount) + Number(commissionAmount || 0) - Number(deductions || 0);
      
      const { error } = await supabase.from('payroll_records').insert({
        employee_id: selectedEmployeeId,
        pay_period_start: periodStart,
        pay_period_end: periodEnd,
        base_amount: Number(baseAmount),
        commission_amount: Number(commissionAmount || 0),
        deductions: Number(deductions || 0),
        net_amount: netAmount,
        currency,
        notes: notes || null,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Payroll record created successfully');
      setCreatePayrollDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating payroll:', error);
      toast.error(error.message || 'Failed to create payroll record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetSalary = async () => {
    if (!selectedEmployeeId || !baseSalary) {
      toast.error('Please select an employee and enter salary');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('employee_salaries').insert({
        employee_id: selectedEmployeeId,
        base_salary: Number(baseSalary),
        currency,
        payment_frequency: paymentFrequency,
        effective_date: format(new Date(), 'yyyy-MM-dd'),
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Salary set successfully');
      setSetSalaryDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error setting salary:', error);
      toast.error(error.message || 'Failed to set salary');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePayroll = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payroll_records')
        .update({ status: 'approved', approved_by: user?.id })
        .eq('id', id);

      if (error) throw error;
      toast.success('Payroll approved');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payroll_records')
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
    setSelectedEmployeeId('');
    setBaseAmount('');
    setCommissionAmount('');
    setDeductions('0');
    setNotes('');
    setBaseSalary('');
  };

  const filteredPayroll = payrollRecords.filter(p =>
    p.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.employee?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pagination = usePagination(filteredPayroll, { initialPageSize: 10 });

  // Stats
  const pendingCount = payrollRecords.filter(p => p.status === 'pending').length;
  const totalPaidThisMonth = payrollRecords
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.net_amount), 0);

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
          <h1 className="text-2xl md:text-3xl font-display font-bold">Payroll Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage employee salaries and payroll</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setSetSalaryDialogOpen(true)} variant="outline" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Set Salary
          </Button>
          <Button onClick={() => setCreatePayrollDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Payroll
          </Button>
        </div>
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
                <Wallet className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid This Month</p>
                <p className="text-xl font-bold">${totalPaidThisMonth.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Employees</p>
                <p className="text-xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-info/10">
                <CheckCircle className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">With Salary Set</p>
                <p className="text-xl font-bold">{salaries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payroll" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payroll">Payroll Records</TabsTrigger>
          <TabsTrigger value="salaries">Salary Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-base md:text-lg">Payroll Records</CardTitle>
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
            </CardHeader>
            <CardContent>
              {filteredPayroll.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No payroll records found</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="w-full">
                    <div className="min-w-[800px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead className="text-right">Base</TableHead>
                            <TableHead className="text-right">Commission</TableHead>
                            <TableHead className="text-right">Net</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagination.paginatedData.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{record.employee?.full_name || 'Unknown'}</p>
                                  <p className="text-sm text-muted-foreground">{record.employee?.email}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(record.pay_period_start), 'MMM d')} - {format(new Date(record.pay_period_end), 'MMM d')}
                              </TableCell>
                              <TableCell className="text-right">
                                {CURRENCY_SYMBOLS[record.currency]}{Number(record.base_amount).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-success">
                                {CURRENCY_SYMBOLS[record.currency]}{Number(record.commission_amount).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {CURRENCY_SYMBOLS[record.currency]}{Number(record.net_amount).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  record.status === 'paid' ? 'default' :
                                  record.status === 'approved' ? 'secondary' : 'outline'
                                }>
                                  {record.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {record.status === 'pending' && (
                                  <Button size="sm" variant="outline" onClick={() => handleApprovePayroll(record.id)}>
                                    Approve
                                  </Button>
                                )}
                                {record.status === 'approved' && (
                                  <Button size="sm" onClick={() => handleMarkPaid(record.id)}>
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
        </TabsContent>

        <TabsContent value="salaries">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Salary Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {salaries.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No salaries configured</p>
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <div className="min-w-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead className="text-right">Base Salary</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Effective From</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salaries.map((salary) => (
                          <TableRow key={salary.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{salary.employee?.full_name || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{salary.employee?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {CURRENCY_SYMBOLS[salary.currency]}{Number(salary.base_salary).toLocaleString()}
                            </TableCell>
                            <TableCell className="capitalize">{salary.payment_frequency}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(salary.effective_date), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Payroll Dialog */}
      <Dialog open={createPayrollDialogOpen} onOpenChange={setCreatePayrollDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Payroll Record</DialogTitle>
            <DialogDescription>Generate a payroll record for an employee</DialogDescription>
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
                <Label>Period Start</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Amount</Label>
                <Input type="number" value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Commission</Label>
                <Input type="number" value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deductions</Label>
                <Input type="number" value={deductions} onChange={(e) => setDeductions(e.target.value)} placeholder="0" />
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
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCreatePayrollDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreatePayroll} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Salary Dialog */}
      <Dialog open={setSalaryDialogOpen} onOpenChange={setSetSalaryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Employee Salary</DialogTitle>
            <DialogDescription>Configure base salary for an employee</DialogDescription>
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
                <Label>Base Salary</Label>
                <Input type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} placeholder="0" />
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
              <Label>Payment Frequency</Label>
              <Select value={paymentFrequency} onValueChange={setPaymentFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSetSalaryDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSetSalary} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set Salary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
