import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Search, Users, Clock, TrendingUp, Phone } from 'lucide-react';
import { CURRENCY_SYMBOLS, CurrencyCode } from '@/types/database';

interface ClientData {
  phone: string;
  name: string | null;
  transactionCount: number;
  totalValue: number;
  lastTransaction: string;
  currency: CurrencyCode;
}

export default function MyClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('recipient_phone, recipient_name, amount, currency, created_at')
        .eq('agent_id', user?.id)
        .not('recipient_phone', 'is', null);

      if (error) throw error;

      // Aggregate by phone number
      const clientMap: Record<string, ClientData> = {};
      
      (data || []).forEach(t => {
        const phone = t.recipient_phone as string;
        if (!clientMap[phone]) {
          clientMap[phone] = {
            phone,
            name: t.recipient_name,
            transactionCount: 0,
            totalValue: 0,
            lastTransaction: t.created_at,
            currency: t.currency as CurrencyCode,
          };
        }
        clientMap[phone].transactionCount++;
        clientMap[phone].totalValue += t.amount;
        if (new Date(t.created_at) > new Date(clientMap[phone].lastTransaction)) {
          clientMap[phone].lastTransaction = t.created_at;
          if (t.recipient_name) {
            clientMap[phone].name = t.recipient_name;
          }
        }
      });

      const clientList = Object.values(clientMap).sort((a, b) => 
        new Date(b.lastTransaction).getTime() - new Date(a.lastTransaction).getTime()
      );

      setClients(clientList);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(c =>
    c.phone.includes(searchTerm) ||
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalClients = clients.length;
  const totalValue = clients.reduce((sum, c) => sum + c.totalValue, 0);
  const avgValue = totalClients > 0 ? totalValue / totalClients : 0;

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
        <h1 className="text-3xl font-bold">My Clients</h1>
        <p className="text-muted-foreground">Manage and view your client history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-3xl font-bold">{totalClients}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value Transacted</p>
                <p className="text-3xl font-bold">${totalValue.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Value per Client</p>
                <p className="text-3xl font-bold">${avgValue.toFixed(0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Client List</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No clients yet</h3>
              <p className="text-muted-foreground">Complete transactions to build your client list</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.phone}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{client.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {client.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{client.transactionCount}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {CURRENCY_SYMBOLS[client.currency]}{client.totalValue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(client.lastTransaction), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        New Transaction
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
