import { useState, useEffect } from 'react';
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
import { Loader2, Send, Smartphone, Wallet, Globe, AlertTriangle } from 'lucide-react';
import { TRANSACTION_TYPE_LABELS, TransactionType, CurrencyCode } from '@/types/database';
import { 
  MobileOperator, 
  MOBILE_OPERATORS, 
  validatePhonePrefixRealtime, 
  isPhoneComplete,
  OPERATOR_PREFIXES 
} from '@/lib/phoneValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    serviceType: '' as TransactionType | '',
    amount: '',
    currency: 'SSP' as CurrencyCode, // Default to SSP for airtime
    recipientName: '',
    recipientPhone: '',
    notes: '',
    mobileOperator: '' as MobileOperator | '',
  });

  // Real-time phone validation when operator is selected
  useEffect(() => {
    if (formData.serviceType === 'airtime' && formData.mobileOperator && formData.recipientPhone) {
      const validation = validatePhonePrefixRealtime(formData.recipientPhone, formData.mobileOperator as MobileOperator);
      setPhoneWarning(validation.warning || null);
    } else {
      setPhoneWarning(null);
    }
  }, [formData.recipientPhone, formData.mobileOperator, formData.serviceType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.serviceType) {
      toast.error('Please select a service type');
      return;
    }

    // Validate mobile operator for airtime
    if (formData.serviceType === 'airtime' && !formData.mobileOperator) {
      toast.error('Please select a mobile operator');
      return;
    }

    if (!formData.recipientPhone.trim()) {
      toast.error('Please enter recipient phone number');
      return;
    }

    if (!formData.recipientName.trim()) {
      toast.error('Please enter recipient name');
      return;
    }

    // Validate phone number format for airtime
    if (formData.serviceType === 'airtime' && formData.mobileOperator) {
      if (!isPhoneComplete(formData.recipientPhone, formData.mobileOperator as MobileOperator)) {
        const { local, international } = OPERATOR_PREFIXES[formData.mobileOperator as MobileOperator];
        toast.error(`Please enter a valid ${MOBILE_OPERATORS.find(o => o.value === formData.mobileOperator)?.label} number (${local}XXXXXXX or ${international}XXXXXXX)`);
        return;
      }
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > 1000000) {
      toast.error('Amount cannot exceed 1,000,000');
      return;
    }

    setLoading(true);
    try {
      // Use validated edge function for server-side validation
      const { data, error } = await supabase.functions.invoke('validate-transaction', {
        body: {
          transaction_type: formData.serviceType,
          amount: amount,
          currency: formData.currency,
          recipient_name: formData.recipientName.trim() || formData.clientName.trim() || undefined,
          recipient_phone: formData.recipientPhone.trim() || formData.clientPhone.trim(),
          metadata: {
            client_name: formData.clientName.trim() || undefined,
            client_phone: formData.clientPhone.trim() || undefined,
            notes: formData.notes.trim() || undefined,
            mobile_operator: formData.serviceType === 'airtime' ? formData.mobileOperator : undefined,
          },
        },
      });

      if (error) throw error;

      if (!data.success) {
        const errorMessage = data.errors?.join(', ') || 'Validation failed';
        toast.error(errorMessage);
        return;
      }

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
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset recipient phone and operator when service type changes
      if (field === 'serviceType') {
        newData.recipientPhone = '';
        newData.mobileOperator = '';
        setPhoneWarning(null);
      }
      
      // Reset recipient phone when operator changes
      if (field === 'mobileOperator') {
        newData.recipientPhone = '';
        setPhoneWarning(null);
      }
      
      return newData;
    });
  };

  const handleRecipientPhoneChange = (value: string) => {
    // Only allow digits, +, and spaces
    const cleanValue = value.replace(/[^\d+\s-]/g, '');
    
    // If operator is selected and airtime, validate in real-time
    if (formData.serviceType === 'airtime' && formData.mobileOperator) {
      const validation = validatePhonePrefixRealtime(cleanValue, formData.mobileOperator as MobileOperator);
      
      if (!validation.valid && cleanValue.length > 0) {
        // Don't update the phone if validation fails - block input
        setPhoneWarning(validation.warning || null);
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, recipientPhone: cleanValue }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">New Sale Request</h1>
        <p className="text-sm md:text-base text-muted-foreground">Submit a new transaction request for approval</p>
      </div>

      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="text-lg md:text-xl">Transaction Details</CardTitle>
          <CardDescription className="text-sm">
            Fill in the client and transaction information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
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

            {/* Mobile Operator Selection (only for airtime) */}
            {formData.serviceType === 'airtime' && (
              <div className="space-y-2">
                <Label htmlFor="mobileOperator">Mobile Operator *</Label>
                <Select
                  value={formData.mobileOperator}
                  onValueChange={(value) => handleChange('mobileOperator', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select operator..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MOBILE_OPERATORS.map((operator) => (
                      <SelectItem key={operator.value} value={operator.value}>
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4" />
                          {operator.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.mobileOperator && (
                  <p className="text-xs text-muted-foreground">
                    {MOBILE_OPERATORS.find(o => o.value === formData.mobileOperator)?.label} numbers: {OPERATOR_PREFIXES[formData.mobileOperator as MobileOperator].local}XXXXXXX or {OPERATOR_PREFIXES[formData.mobileOperator as MobileOperator].international}XXXXXXX
                  </p>
                )}
              </div>
            )}

            {/* Client Info (optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name (optional)</Label>
                <Input
                  id="clientName"
                  placeholder="John Doe"
                  value={formData.clientName}
                  onChange={(e) => handleChange('clientName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Client Phone (optional)</Label>
                <Input
                  id="clientPhone"
                  placeholder="+211 XXX XXX XXX"
                  value={formData.clientPhone}
                  onChange={(e) => handleChange('clientPhone', e.target.value)}
                />
              </div>
            </div>

            {/* Recipient Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipientName">Recipient Name *</Label>
                <Input
                  id="recipientName"
                  placeholder="Recipient full name"
                  value={formData.recipientName}
                  onChange={(e) => handleChange('recipientName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientPhone">Recipient Phone *</Label>
                <Input
                  id="recipientPhone"
                  placeholder={
                    formData.serviceType === 'mpesa_kenya'
                      ? '+254 XXX XXX XXX'
                      : formData.serviceType === 'uganda_mobile_money'
                        ? '+256 XXX XXX XXX'
                        : formData.serviceType === 'airtime' && formData.mobileOperator
                          ? `${OPERATOR_PREFIXES[formData.mobileOperator as MobileOperator].local}XXXXXXX`
                          : '+211 XXX XXX XXX'
                  }
                  value={formData.recipientPhone}
                  onChange={(e) => handleRecipientPhoneChange(e.target.value)}
                  disabled={formData.serviceType === 'airtime' && !formData.mobileOperator}
                  required
                  className={phoneWarning ? 'border-destructive' : ''}
                />
                {formData.serviceType === 'airtime' && !formData.mobileOperator && (
                  <p className="text-xs text-muted-foreground">Please select a mobile operator first</p>
                )}
              </div>
            </div>

            {/* Phone Validation Warning */}
            {phoneWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{phoneWarning}</AlertDescription>
              </Alert>
            )}

            {/* Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 order-2 sm:order-1"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 order-1 sm:order-2"
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
