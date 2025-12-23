import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Send, Smartphone, Wallet, Globe } from 'lucide-react';
import { TRANSACTION_TYPE_LABELS, TransactionType, CurrencyCode } from '@/types/database';

const serviceIcons: Record<TransactionType, React.ReactNode> = {
  airtime: <Smartphone className="w-5 h-5" />,
  mtn_momo: <Wallet className="w-5 h-5" />,
  digicash: <Wallet className="w-5 h-5" />,
  m_gurush: <Wallet className="w-5 h-5" />,
  mpesa_kenya: <Globe className="w-5 h-5" />,
  uganda_mobile_money: <Globe className="w-5 h-5" />,
};

const currencyOptions: { value: CurrencyCode; label: string }[] = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'SSP', label: 'SSP - South Sudanese Pound' },
  { value: 'KES', label: 'KES - Kenyan Shilling' },
  { value: 'UGX', label: 'UGX - Ugandan Shilling' },
];

export default function NewSaleRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    serviceType: '' as TransactionType | '',
    amount: '',
    currency: 'USD' as CurrencyCode,
    destination: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.serviceType) {
      toast.error('Please select a service type');
      return;
    }

    if (!formData.clientPhone.trim()) {
      toast.error('Please enter client phone number');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        agent_id: user?.id,
        transaction_type: formData.serviceType,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        recipient_name: formData.clientName.trim() || null,
        recipient_phone: formData.clientPhone.trim(),
        metadata: {
          destination: formData.destination.trim() || null,
          notes: formData.notes.trim() || null,
        },
        approval_status: 'pending',
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Sale request submitted successfully');
      navigate('/my-transactions');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit sale request');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Sale Request</h1>
        <p className="text-muted-foreground">Submit a new transaction request for approval</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>
            Fill in the client and transaction information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Type */}
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type *</Label>
              <Select
                value={formData.serviceType}
                onValueChange={(value) => handleChange('serviceType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {serviceIcons[type]}
                        {TRANSACTION_TYPE_LABELS[type]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  placeholder="John Doe"
                  value={formData.clientName}
                  onChange={(e) => handleChange('clientName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Client Phone *</Label>
                <Input
                  id="clientPhone"
                  placeholder="+211 XXX XXX XXX"
                  value={formData.clientPhone}
                  onChange={(e) => handleChange('clientPhone', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleChange('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Destination (for remittance) */}
            {(formData.serviceType === 'mpesa_kenya' || formData.serviceType === 'uganda_mobile_money') && (
              <div className="space-y-2">
                <Label htmlFor="destination">Destination Phone/Account</Label>
                <Input
                  id="destination"
                  placeholder="Recipient phone number or account"
                  value={formData.destination}
                  onChange={(e) => handleChange('destination', e.target.value)}
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
