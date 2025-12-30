import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, DollarSign, Percent, RefreshCw } from 'lucide-react';
import { CurrencyCode, TransactionType, CURRENCY_SYMBOLS, TRANSACTION_TYPE_LABELS } from '@/types/database';

interface ExchangeRate {
  id: string;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
}

interface CommissionSetting {
  id: string;
  transaction_type: TransactionType;
  percentage_rate: number;
  fixed_amount: number;
  volume_tier_1_threshold: number | null;
  volume_tier_1_bonus: number | null;
  volume_tier_2_threshold: number | null;
  volume_tier_2_bonus: number | null;
}

export default function Settings() {
  const { toast } = useToast();
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    
    const { data: rates } = await supabase.from('exchange_rates').select('*');
    const { data: commissions } = await supabase.from('commission_settings').select('*');
    
    if (rates) setExchangeRates(rates as ExchangeRate[]);
    if (commissions) setCommissionSettings(commissions as CommissionSetting[]);
    
    setLoading(false);
  };

  const handleUpdateRate = async (id: string, rate: number) => {
    // Client-side validation
    if (isNaN(rate) || rate <= 0) {
      toast({ title: 'Error', description: 'Rate must be a positive number', variant: 'destructive' });
      return;
    }
    if (rate > 1000000) {
      toast({ title: 'Error', description: 'Rate cannot exceed 1,000,000', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('exchange_rates')
      .update({ rate, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to update rate', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Exchange rate updated' });
      fetchSettings();
    }
    setSaving(false);
  };

  const handleUpdateCommission = async (id: string, updates: Partial<CommissionSetting>) => {
    // Client-side validation
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'number') {
        if (isNaN(value) || value < 0) {
          toast({ title: 'Error', description: `${key.replace(/_/g, ' ')} must be a non-negative number`, variant: 'destructive' });
          return;
        }
        if (value > 1000000) {
          toast({ title: 'Error', description: `${key.replace(/_/g, ' ')} cannot exceed 1,000,000`, variant: 'destructive' });
          return;
        }
      }
    }

    setSaving(true);
    const { error } = await supabase
      .from('commission_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to update commission', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Commission settings updated' });
      fetchSettings();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage system configuration</p>
      </div>

      <Tabs defaultValue="exchange" className="space-y-6">
        <TabsList>
          <TabsTrigger value="exchange" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Exchange Rates
          </TabsTrigger>
          <TabsTrigger value="commission" className="gap-2">
            <Percent className="w-4 h-4" />
            Commission Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exchange">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Exchange Rates
              </CardTitle>
              <CardDescription>
                Manage currency exchange rates for cross-border transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exchangeRates.map((rate) => (
                    <Card key={rate.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {rate.from_currency} → {rate.to_currency}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="0.0001"
                              defaultValue={rate.rate}
                              onBlur={(e) => {
                                const newRate = parseFloat(e.target.value);
                                if (!isNaN(newRate) && newRate !== rate.rate) {
                                  handleUpdateRate(rate.id, newRate);
                                }
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            1 {rate.from_currency} = {rate.rate} {rate.to_currency}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commission">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Commission Settings
              </CardTitle>
              <CardDescription>
                Configure commission rates for different transaction types
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-6">
                  {commissionSettings.map((setting) => (
                    <Card key={setting.id} className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                          {TRANSACTION_TYPE_LABELS[setting.transaction_type]}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Percentage Rate (%)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              defaultValue={setting.percentage_rate}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) handleUpdateCommission(setting.id, { percentage_rate: val });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Fixed Amount ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              defaultValue={setting.fixed_amount}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) handleUpdateCommission(setting.id, { fixed_amount: val });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tier 1 Threshold ($)</Label>
                            <Input
                              type="number"
                              defaultValue={setting.volume_tier_1_threshold || 0}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) handleUpdateCommission(setting.id, { volume_tier_1_threshold: val });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tier 1 Bonus (%)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              defaultValue={setting.volume_tier_1_bonus || 0}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) handleUpdateCommission(setting.id, { volume_tier_1_bonus: val });
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
