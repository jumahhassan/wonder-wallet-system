import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Award } from 'lucide-react';
import { 
  getCommissionTierInfo, 
  getNextTierProgress, 
  AIRTIME_COMMISSION_TIERS_SSP,
  CommissionTier 
} from '@/lib/commissionCalculation';

interface CommissionTierCardProps {
  cumulativeVolumeSSP: number;
}

const formatSSP = (amount: number): string => {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M SSP`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K SSP`;
  }
  return `${amount.toLocaleString()} SSP`;
};

export default function CommissionTierCard({ cumulativeVolumeSSP }: CommissionTierCardProps) {
  const currentTier = getCommissionTierInfo(cumulativeVolumeSSP);
  const tierProgress = getNextTierProgress(cumulativeVolumeSSP);

  const getTierColor = (percentage: number): string => {
    if (percentage >= 5) return 'bg-gradient-to-r from-amber-500 to-yellow-400';
    if (percentage >= 3) return 'bg-gradient-to-r from-purple-500 to-pink-500';
    if (percentage >= 2) return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    return 'bg-gradient-to-r from-green-500 to-emerald-500';
  };

  const getTierBadgeVariant = (percentage: number): 'default' | 'secondary' | 'outline' => {
    if (percentage >= 3) return 'default';
    if (percentage >= 2) return 'secondary';
    return 'outline';
  };

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className={`h-1 ${getTierColor(currentTier.percentage)}`} />
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Commission Tier
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Tier Display */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Rate</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-bold text-primary">{currentTier.percentage}%</span>
              <Badge variant={getTierBadgeVariant(currentTier.percentage)}>
                {currentTier.label}
              </Badge>
            </div>
          </div>
          <div className={`p-3 rounded-full ${getTierColor(currentTier.percentage)}`}>
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Volume Tracking */}
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Cumulative Volume (SSP Airtime)</p>
          <p className="text-xl font-bold mt-1">{formatSSP(cumulativeVolumeSSP)}</p>
        </div>

        {/* Progress to Next Tier */}
        {tierProgress && tierProgress.nextTier && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target className="w-4 h-4" />
                Next Tier: {tierProgress.nextTier.percentage}%
              </span>
              <span className="font-medium">{Math.round(tierProgress.progress)}%</span>
            </div>
            <Progress value={tierProgress.progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {formatSSP(tierProgress.remaining)} more to unlock {tierProgress.nextTier.percentage}% commission
            </p>
          </div>
        )}

        {/* Max Tier Reached */}
        {tierProgress && !tierProgress.nextTier && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-400/10 border border-amber-500/20">
            <Award className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Maximum tier unlocked! 🎉
            </span>
          </div>
        )}

        {/* All Tiers Overview */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Commission Tiers</p>
          <div className="grid grid-cols-2 gap-2">
            {AIRTIME_COMMISSION_TIERS_SSP.map((tier, index) => (
              <div 
                key={index}
                className={`text-xs p-2 rounded ${
                  currentTier.percentage === tier.percentage 
                    ? 'bg-primary/10 border border-primary/30 font-medium' 
                    : 'bg-muted/30'
                }`}
              >
                <span className="font-semibold">{tier.percentage}%</span>
                <span className="text-muted-foreground ml-1">{tier.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
