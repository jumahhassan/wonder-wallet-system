import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { User, DollarSign, Percent, RefreshCw, Upload, Loader2 } from 'lucide-react';
import { CurrencyCode, TransactionType, CURRENCY_SYMBOLS, TRANSACTION_TYPE_LABELS } from '@/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  photo_url: string | null;
}

export default function Settings() {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSetting[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
  });

  useEffect(() => {
    fetchSettings();
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (data) {
      setProfile(data as UserProfile);
      setProfileForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
      });
    }
  };

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'File size must be less than 5MB', variant: 'destructive' });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    setUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      // Update profile with new photo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({ title: 'Success', description: 'Profile photo updated' });
      fetchProfile();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to upload photo', variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    // Validate inputs
    if (profileForm.full_name.trim().length === 0) {
      toast({ title: 'Error', description: 'Name cannot be empty', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileForm.full_name.trim(),
        phone: profileForm.phone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Profile updated' });
      fetchProfile();
    }
    setSaving(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isAdmin = role === 'super_agent';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and system configuration</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            My Profile
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="exchange" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Exchange Rates
              </TabsTrigger>
              <TabsTrigger value="commission" className="gap-2">
                <Percent className="w-4 h-4" />
                Commission Settings
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                My Profile
              </CardTitle>
              <CardDescription>
                Update your personal information and profile photo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Photo Section */}
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.photo_url || undefined} alt={profile?.full_name || 'Profile'} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Label htmlFor="photo-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
                      {uploadingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <span>{uploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                    </div>
                  </Label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                  <p className="text-xs text-muted-foreground">
                    Max file size: 5MB. Supported formats: JPG, PNG, GIF
                  </p>
                </div>
              </div>

              {/* Profile Form */}
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+211 XXX XXX XXX"
                  />
                </div>
                <Button onClick={handleUpdateProfile} disabled={saving} className="w-fit">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
