import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, ArrowUpDown, DollarSign, Users } from 'lucide-react';
import { Wallet as WalletType, Profile, CurrencyCode, CURRENCY_SYMBOLS } from '@/types/database';

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

  const handleTopUp = async () => {
    if (!selectedWallet || !topUpAmount) return;
    
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }
    
    const newBalance = Number(selectedWallet.balance) + amount;
    
    const { error } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', selectedWallet.id);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to top up wallet', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Added ${CURRENCY_SYMBOLS[selectedWallet.currency]}${amount} to wallet` });
      setTopUpDialogOpen(false);
      setTopUpAmount('');
      fetchWallets();
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                {wallets.map((wallet) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
