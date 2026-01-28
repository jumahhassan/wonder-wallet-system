import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Megaphone,
  Plus,
  Target,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  Pause,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: 'promotion' | 'awareness' | 'retention' | 'acquisition';
  status: 'active' | 'paused' | 'completed' | 'draft';
  targetAudience: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  reach: number;
  conversions: number;
}

// Mock campaign data
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'New Year Airtime Bonus',
    description: 'Double airtime bonus for all new customers during January',
    type: 'acquisition',
    status: 'active',
    targetAudience: 'New Customers',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    budget: 5000,
    spent: 2340,
    reach: 15420,
    conversions: 234,
  },
  {
    id: '2',
    name: 'Agent Referral Program',
    description: 'Bonus commission for agents who refer new customers',
    type: 'retention',
    status: 'active',
    targetAudience: 'Sales Agents',
    startDate: '2026-01-15',
    endDate: '2026-03-15',
    budget: 10000,
    spent: 1200,
    reach: 45,
    conversions: 12,
  },
  {
    id: '3',
    name: 'Mobile Money Awareness',
    description: 'Educational campaign about MTN MoMo benefits',
    type: 'awareness',
    status: 'paused',
    targetAudience: 'General Public',
    startDate: '2025-12-01',
    endDate: '2026-02-28',
    budget: 3000,
    spent: 1800,
    reach: 8900,
    conversions: 156,
  },
  {
    id: '4',
    name: 'DigiCash Launch Promo',
    description: 'Special rates for DigiCash transactions',
    type: 'promotion',
    status: 'completed',
    targetAudience: 'Existing Customers',
    startDate: '2025-11-01',
    endDate: '2025-12-31',
    budget: 2500,
    spent: 2500,
    reach: 12300,
    conversions: 890,
  },
];

const campaignTypeColors: Record<string, string> = {
  promotion: 'bg-amber-500/10 text-amber-600 border-amber-200',
  awareness: 'bg-blue-500/10 text-blue-600 border-blue-200',
  retention: 'bg-purple-500/10 text-purple-600 border-purple-200',
  acquisition: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600',
  paused: 'bg-yellow-500/10 text-yellow-600',
  completed: 'bg-gray-500/10 text-gray-600',
  draft: 'bg-blue-500/10 text-blue-600',
};

const statusIcons: Record<string, React.ReactNode> = {
  active: <TrendingUp className="h-3 w-3" />,
  paused: <Pause className="h-3 w-3" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
  draft: <Clock className="h-3 w-3" />,
};

export default function Campaigns() {
  const [campaigns] = useState<Campaign[]>(mockCampaigns);
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalReach = campaigns.reduce((sum, c) => sum + c.reach, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Marketing Campaigns</h1>
          <p className="text-muted-foreground">Manage and track your marketing initiatives</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Set up a new marketing campaign to reach your target audience
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input id="name" placeholder="Enter campaign name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe your campaign" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Campaign Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="awareness">Awareness</SelectItem>
                      <SelectItem value="retention">Retention</SelectItem>
                      <SelectItem value="acquisition">Acquisition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="budget">Budget (USD)</Label>
                  <Input id="budget" type="number" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" type="date" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Input id="audience" placeholder="e.g., New Customers, Sales Agents" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Create Campaign</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">of {campaigns.length} total</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReach.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">people reached</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((totalConversions / totalReach) * 100).toFixed(1)}% rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Budget Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
            <Progress 
              value={(totalSpent / totalBudget) * 100} 
              className="mt-2 h-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              of ${totalBudget.toLocaleString()} budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <Badge className={statusColors[campaign.status]} variant="outline">
                      <span className="mr-1">{statusIcons[campaign.status]}</span>
                      {campaign.status}
                    </Badge>
                  </div>
                  <CardDescription>{campaign.description}</CardDescription>
                </div>
                <Badge className={campaignTypeColors[campaign.type]} variant="outline">
                  {campaign.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Target Audience
                  </p>
                  <p className="text-sm font-medium">{campaign.targetAudience}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Duration
                  </p>
                  <p className="text-sm font-medium">
                    {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" /> Performance
                  </p>
                  <p className="text-sm font-medium">
                    {campaign.reach.toLocaleString()} reach • {campaign.conversions} conversions
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <Progress 
                    value={(campaign.spent / campaign.budget) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    ${campaign.spent.toLocaleString()} / ${campaign.budget.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
