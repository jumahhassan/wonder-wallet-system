import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePagination } from '@/hooks/usePagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, DollarSign } from 'lucide-react';
import { Wallet as WalletType, Profile, CurrencyCode, CURRENCY_SYMBOLS } from '@/types/database';
import TablePagination from '@/components/TablePagination';

interface WalletWithUser extends WalletType {
  user_email?: string;
  user_name?: string;
}

export default function WalletsFunds() {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<WalletWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalByCurrency, setTotalByCurrency] = useState<Record<CurrencyCode, number>>({
    USD: 0, SSP: 0, KES: 0, UGX: 0
  });
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletWithUser | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    setLoading(true);
    
    const { data: walletsData } = await supabase.from('wallets').select('*');
    const { data: profiles } = await supabase.from('profiles').select('*');
    
    if (walletsData && profiles) {
      const walletsWithUsers: WalletWithUser[] = walletsData.map(wallet => {
        const profile = profiles.find(p => p.id === wallet.user_id);
        return {
          ...wallet,
          user_email: profile?.email,
          user_name: profile?.full_name || undefined
        };
      });
      
      setWallets(walletsWithUsers);
      
      // Calculate totals by currency
      const totals: Record<CurrencyCode, number> = { USD: 0, SSP: 0, KES: 0, UGX: 0 };
      walletsData.forEach(w => {
        totals[w.currency as CurrencyCode] += Number(w.balance);
      });
      setTotalByCurrency(totals);
    }
    
    setLoading(false);
  };

  const pagination = usePagination(wallets, { initialPageSize: 10 });

  const handleTopUp = async () => {
    if (!selectedWallet || !topUpAmount) return;
    
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    if (amount > 1000000) {
      toast({ title: 'Error', description: 'Amount cannot exceed 1,000,000', variant: 'destructive' });
      return;
    }
    
    try {
      // Use validated edge function for server-side validation
      const { data, error } = await supabase.functions.invoke('validate-wallet-topup', {
        body: {
          wallet_id: selectedWallet.id,
          amount: amount,
        },
      });

      if (error) throw error;

      if (!data.success) {
        const errorMessage = data.errors?.join(', ') || 'Validation failed';
        toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
        return;
      }

      toast({ title: 'Success', description: `Added ${CURRENCY_SYMBOLS[selectedWallet.currency]}${amount} to wallet` });
      setTopUpDialogOpen(false);
      setTopUpAmount('');
      fetchWallets();
    } catch (error) {
      console.error('Top up error:', error);
      toast({ title: 'Error', description: 'Failed to top up wallet', variant: 'destructive' });
    }
  };

  const currencyCards = Object.entries(totalByCurrency).map(([currency, balance]) => ({
    currency: currency as CurrencyCode,
    balance,
    icon: <DollarSign className="w-5 h-5" />,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold">Wallets & Funds</h1>
        <p className="text-muted-foreground">Manage company and agent wallets</p>
      </div>

      {/* Currency Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {currencyCards.map((card) => (
          <Card key={card.currency} className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.currency} Total</p>
                  <p className="text-2xl font-bold mt-1">
                    {CURRENCY_SYMBOLS[card.currency]}{card.balance.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  {card.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Wallets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            All Wallets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading wallets...</p>
          ) : (
            <>
              <ScrollArea className="w-full">
                <div className="min-w-[700px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedData.map((wallet) => (
                        <TableRow key={wallet.id}>
                          <TableCell className="font-medium">{wallet.user_name || 'N/A'}</TableCell>
                          <TableCell>{wallet.user_email || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{wallet.currency}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {CURRENCY_SYMBOLS[wallet.currency]}{Number(wallet.balance).toLocaleString()}
                          </TableCell>
                          <TableCell>{new Date(wallet.updated_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Dialog open={topUpDialogOpen && selectedWallet?.id === wallet.id} onOpenChange={(open) => {
                              setTopUpDialogOpen(open);
                              if (open) setSelectedWallet(wallet);
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1">
                                  <Plus className="w-4 h-4" />
                                  Top Up
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Top Up Wallet</DialogTitle>
                                  <DialogDescription>
                                    Add funds to {wallet.user_name || wallet.user_email}'s {wallet.currency} wallet
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Current Balance</Label>
                                    <p className="text-2xl font-bold">
                                      {CURRENCY_SYMBOLS[wallet.currency]}{Number(wallet.balance).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Amount to Add</Label>
                                    <Input
                                      type="number"
                                      placeholder="Enter amount"
                                      value={topUpAmount}
                                      onChange={(e) => setTopUpAmount(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setTopUpDialogOpen(false)}>Cancel</Button>
                                  <Button onClick={handleTopUp}>Top Up</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
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
    </div>
  );
}
