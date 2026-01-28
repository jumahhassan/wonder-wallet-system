import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, Eye, Loader2, DollarSign, Users, TrendingUp } from 'lucide-react';
import { AppRole, ROLE_LABELS, CURRENCY_SYMBOLS, CurrencyCode } from '@/types/database';
import { usePagination } from '@/hooks/usePagination';
import TablePagination from '@/components/TablePagination';

interface Employee {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  photo_url: string | null;
  role: AppRole;
  created_at: string;
  baseSalary?: number;
  currency?: CurrencyCode;
  totalCommissions?: number;
  transactionCount?: number;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: roles } = await supabase.from('user_roles').select('*');
      const { data: salaries } = await supabase.from('employee_salaries').select('*');
      const { data: transactions } = await supabase.from('transactions').select('*').eq('approval_status', 'approved');

      if (profiles && roles) {
        const employeesWithDetails: Employee[] = profiles.map(profile => {
          const userRole = roles.find(r => r.user_id === profile.id);
          const salary = salaries?.find(s => s.employee_id === profile.id);
          const employeeTx = transactions?.filter(t => t.agent_id === profile.id) || [];
          
          return {
            ...profile,
            role: (userRole?.role as AppRole) || 'sales_agent',
            baseSalary: salary ? Number(salary.base_salary) : undefined,
            currency: salary?.currency as CurrencyCode || 'USD',
            totalCommissions: employeeTx.reduce((sum, t) => sum + Number(t.commission_amount || 0), 0),
            transactionCount: employeeTx.length,
          };
        });
        setEmployees(employeesWithDetails);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const pagination = usePagination(filteredEmployees, { initialPageSize: 10 });

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.substring(0, 2).toUpperCase();
  };

  const viewEmployeeDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDetailsDialogOpen(true);
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
          <h1 className="text-2xl md:text-3xl font-display font-bold">Employees</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            View all employees and their performance
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/10">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agents</p>
                <p className="text-xl font-bold">{employees.filter(e => e.role === 'sales_agent').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-info/10">
                <Users className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assistants</p>
                <p className="text-xl font-bold">{employees.filter(e => e.role === 'sales_assistant').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning/10">
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Commissions</p>
                <p className="text-xl font-bold">
                  ${employees.reduce((sum, e) => sum + (e.totalCommissions || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-base md:text-lg">All Employees</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_agent">Super Agent</SelectItem>
                  <SelectItem value="sales_assistant">Sales Assistant</SelectItem>
                  <SelectItem value="sales_agent">Sales Agent</SelectItem>
                  <SelectItem value="hr_finance">HR/Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No employees found</p>
            </div>
          ) : (
            <>
              <ScrollArea className="w-full">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Base Salary</TableHead>
                        <TableHead className="text-right">Transactions</TableHead>
                        <TableHead className="text-right">Commissions</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedData.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={employee.photo_url || undefined} />
                                <AvatarFallback>
                                  {getInitials(employee.full_name, employee.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{employee.full_name || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{employee.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ROLE_LABELS[employee.role]}</Badge>
                          </TableCell>
                          <TableCell>
                            {employee.baseSalary !== undefined ? (
                              <span>
                                {CURRENCY_SYMBOLS[employee.currency || 'USD']}
                                {employee.baseSalary.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Not set</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{employee.transactionCount || 0}</TableCell>
                          <TableCell className="text-right text-success">
                            ${(employee.totalCommissions || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(employee.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewEmployeeDetails(employee)}
                            >
                              <Eye className="w-4 h-4" />
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

      {/* Employee Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>
              View detailed information about this employee
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedEmployee.photo_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(selectedEmployee.full_name, selectedEmployee.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedEmployee.full_name || 'Unknown'}</h3>
                  <p className="text-muted-foreground">{selectedEmployee.email}</p>
                  <Badge variant="outline" className="mt-1">{ROLE_LABELS[selectedEmployee.role]}</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedEmployee.phone || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Joined</Label>
                  <p className="font-medium">{format(new Date(selectedEmployee.created_at), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Base Salary</Label>
                  <p className="font-medium">
                    {selectedEmployee.baseSalary !== undefined ? (
                      `${CURRENCY_SYMBOLS[selectedEmployee.currency || 'USD']}${selectedEmployee.baseSalary.toLocaleString()}`
                    ) : (
                      'Not set'
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Commissions</Label>
                  <p className="font-medium text-success">
                    ${(selectedEmployee.totalCommissions || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Transactions</Label>
                  <p className="font-medium">{selectedEmployee.transactionCount || 0}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
